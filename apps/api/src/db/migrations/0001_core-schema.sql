CREATE TYPE "public"."employee_status" AS ENUM('active', 'on_leave', 'terminated');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('full_time', 'part_time', 'contractor');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('female', 'male');--> statement-breakpoint
CREATE TYPE "public"."pay_frequency" AS ENUM('annual', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."salary_reason" AS ENUM('hire', 'merit', 'promotion', 'market_adjustment', 'correction', 'transfer', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'hr_manager', 'viewer');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pay_bands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_level_id" integer NOT NULL,
	"country_code" char(2) NOT NULL,
	"currency_code" char(3) NOT NULL,
	"min_minor" bigint NOT NULL,
	"mid_minor" bigint NOT NULL,
	"max_minor" bigint NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pay_bands_ordered" CHECK ("pay_bands"."min_minor" > 0 and "pay_bands"."min_minor" <= "pay_bands"."mid_minor" and "pay_bands"."mid_minor" <= "pay_bands"."max_minor" and "pay_bands"."min_minor" < "pay_bands"."max_minor"),
	CONSTRAINT "pay_bands_period" CHECK ("pay_bands"."effective_to" is null or "pay_bands"."effective_to" > "pay_bands"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "salary_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency_code" char(3) NOT NULL,
	"pay_frequency" "pay_frequency" NOT NULL,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"reason" "salary_reason" NOT NULL,
	"note" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salary_records_positive" CHECK ("salary_records"."amount_minor" > 0),
	CONSTRAINT "salary_records_period" CHECK ("salary_records"."effective_to" is null or "salary_records"."effective_to" >= "salary_records"."effective_from")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_code" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"work_email" "citext" NOT NULL,
	"country_code" char(2) NOT NULL,
	"department_id" integer NOT NULL,
	"job_family_id" integer NOT NULL,
	"job_level_id" integer NOT NULL,
	"job_title" text NOT NULL,
	"manager_id" uuid,
	"employment_type" "employment_type" NOT NULL,
	"fte" numeric(3, 2) NOT NULL,
	"hire_date" date NOT NULL,
	"termination_date" date,
	"status" "employee_status" NOT NULL,
	"gender" "gender" NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_employee_code_unique" UNIQUE("employee_code"),
	CONSTRAINT "employees_work_email_unique" UNIQUE("work_email"),
	CONSTRAINT "employees_fte" CHECK ("employees"."fte" > 0 and "employees"."fte" <= 1),
	CONSTRAINT "employees_termination_after_hire" CHECK ("employees"."termination_date" is null or "employees"."termination_date" >= "employees"."hire_date")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"code" char(2) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"currency_code" char(3) NOT NULL,
	"region" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" char(3) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"minor_units" smallint NOT NULL,
	CONSTRAINT "currencies_minor_units" CHECK ("currencies"."minor_units" between 0 and 4)
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "departments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "departments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "fx_rates" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fx_rates_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"base_currency" char(3) DEFAULT 'USD' NOT NULL,
	"quote_currency" char(3) NOT NULL,
	"rate" numeric(18, 8) NOT NULL,
	"as_of" date NOT NULL,
	"source" text NOT NULL,
	CONSTRAINT "fx_rates_one_per_day" UNIQUE("base_currency","quote_currency","as_of"),
	CONSTRAINT "fx_rates_positive" CHECK ("fx_rates"."rate" > 0),
	CONSTRAINT "fx_rates_usd_based" CHECK ("fx_rates"."base_currency" = 'USD')
);
--> statement-breakpoint
CREATE TABLE "job_families" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_families_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "job_families_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "job_levels" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "job_levels_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"track" text NOT NULL,
	"rank" smallint NOT NULL,
	CONSTRAINT "job_levels_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" "citext" NOT NULL,
	"display_name" text NOT NULL,
	"google_sub" text,
	"role" "user_role" NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_login_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_bands" ADD CONSTRAINT "pay_bands_job_level_id_job_levels_id_fk" FOREIGN KEY ("job_level_id") REFERENCES "public"."job_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_bands" ADD CONSTRAINT "pay_bands_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pay_bands" ADD CONSTRAINT "pay_bands_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salary_records" ADD CONSTRAINT "salary_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_country_code_countries_code_fk" FOREIGN KEY ("country_code") REFERENCES "public"."countries"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_family_id_job_families_id_fk" FOREIGN KEY ("job_family_id") REFERENCES "public"."job_families"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_job_level_id_job_levels_id_fk" FOREIGN KEY ("job_level_id") REFERENCES "public"."job_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_manager_id_employees_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "countries" ADD CONSTRAINT "countries_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_base_currency_currencies_code_fk" FOREIGN KEY ("base_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fx_rates" ADD CONSTRAINT "fx_rates_quote_currency_currencies_code_fk" FOREIGN KEY ("quote_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_entity" ON "audit_events" USING btree ("entity_type","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_events_actor" ON "audit_events" USING btree ("actor_user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "pay_bands_lookup" ON "pay_bands" USING btree ("job_level_id","country_code","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "salary_records_history" ON "salary_records" USING btree ("employee_id","effective_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "salary_records_open" ON "salary_records" USING btree ("employee_id") WHERE "salary_records"."effective_to" is null;--> statement-breakpoint
CREATE INDEX "employees_status" ON "employees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "employees_country" ON "employees" USING btree ("country_code");--> statement-breakpoint
CREATE INDEX "employees_department" ON "employees" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "employees_level" ON "employees" USING btree ("job_level_id");--> statement-breakpoint
CREATE INDEX "employees_manager" ON "employees" USING btree ("manager_id");--> statement-breakpoint
CREATE INDEX "employees_name_sort" ON "employees" USING btree (lower("last_name"),lower("first_name"));--> statement-breakpoint
CREATE INDEX "employees_search_trgm" ON "employees" USING gin (("first_name" || ' ' || "last_name" || ' ' || "employee_code") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "fx_rates_quote_as_of" ON "fx_rates" USING btree ("quote_currency","as_of" DESC NULLS LAST);