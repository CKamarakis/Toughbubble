CREATE TABLE "user_settings" (
	"owner_id" uuid PRIMARY KEY DEFAULT auth.uid() NOT NULL,
	"editor_styles" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"saved_colors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "user_settings_select_own" ON "user_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_settings_insert_own" ON "user_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_settings_update_own" ON "user_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "user_settings_delete_own" ON "user_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (owner_id = (select auth.uid()));