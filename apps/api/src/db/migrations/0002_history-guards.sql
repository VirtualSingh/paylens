-- Rules for effective-dated history that Drizzle cannot express (ADR-005, data-model.md).
-- They hold whatever the application does; src/db/schema.spec.ts proves each one.

-- An employee's salary periods never overlap. Periods are [effective_from, effective_to);
-- NULL means open-ended. A record superseded by a correction (closed at its own start) is an
-- empty range, which overlaps nothing.
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_no_overlap"
  EXCLUDE USING gist ("employee_id" WITH =, daterange("effective_from", "effective_to", '[)') WITH &&);--> statement-breakpoint

-- One band per level and country at any date.
ALTER TABLE "pay_bands" ADD CONSTRAINT "pay_bands_no_overlap"
  EXCLUDE USING gist ("job_level_id" WITH =, "country_code" WITH =, daterange("effective_from", "effective_to", '[)') WITH &&);--> statement-breakpoint

-- Salary history is append-only: closing a record (setting effective_to) is the only update,
-- and nothing is deleted. Corrections are new records (ADR-005).
CREATE FUNCTION "salary_records_guard"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'salary history is never deleted (ADR-005)';
  END IF;
  IF (NEW.id, NEW.employee_id, NEW.amount_minor, NEW.currency_code, NEW.pay_frequency,
      NEW.effective_from, NEW.reason, NEW.note, NEW.created_by, NEW.created_at)
     IS DISTINCT FROM
     (OLD.id, OLD.employee_id, OLD.amount_minor, OLD.currency_code, OLD.pay_frequency,
      OLD.effective_from, OLD.reason, OLD.note, OLD.created_by, OLD.created_at) THEN
    RAISE EXCEPTION 'only effective_to may change on a salary record (ADR-005)';
  END IF;
  RETURN NEW;
END
$$;--> statement-breakpoint
CREATE TRIGGER "salary_records_guard" BEFORE UPDATE OR DELETE ON "salary_records"
  FOR EACH ROW EXECUTE FUNCTION "salary_records_guard"();--> statement-breakpoint

-- Audit events are append-only for every role, including the owner (security.md, A09).
CREATE FUNCTION "audit_events_append_only"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only: % refused', TG_OP;
END
$$;--> statement-breakpoint
CREATE TRIGGER "audit_events_no_update_delete" BEFORE UPDATE OR DELETE ON "audit_events"
  FOR EACH ROW EXECUTE FUNCTION "audit_events_append_only"();--> statement-breakpoint
CREATE TRIGGER "audit_events_no_truncate" BEFORE TRUNCATE ON "audit_events"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_events_append_only"();--> statement-breakpoint

-- One row per employee: the salary record valid today (data-model.md → Views).
CREATE VIEW "current_salaries" AS
  SELECT *
  FROM "salary_records"
  WHERE "effective_from" <= current_date
    AND ("effective_to" IS NULL OR "effective_to" > current_date);
