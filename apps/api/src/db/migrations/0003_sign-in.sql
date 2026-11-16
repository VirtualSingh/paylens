CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_expires_at" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
-- The demo users requests act as while sign-in is off (ADR-014): one per role, fixed ids so the
-- API can name them without a lookup (apps/api/src/auth/demo-users.ts). Real rows, so audit
-- events and salary records always point at an actor.
INSERT INTO "users" ("id", "email", "display_name", "role", "is_demo") VALUES
	('00000000-0000-4000-8000-0000000d0001', 'demo.viewer@paylens.app', 'Demo viewer', 'viewer', true),
	('00000000-0000-4000-8000-0000000d0002', 'demo.hr@paylens.app', 'Demo HR manager', 'hr_manager', true),
	('00000000-0000-4000-8000-0000000d0003', 'demo.admin@paylens.app', 'Demo admin', 'admin', true)
ON CONFLICT ("id") DO NOTHING;
