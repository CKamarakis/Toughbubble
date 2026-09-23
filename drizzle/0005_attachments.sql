CREATE TYPE "public"."attachment_status" AS ENUM('pending', 'ready');--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"item_id" uuid NOT NULL,
	"name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	"status" "attachment_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attachments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_item_same_owner_fk" FOREIGN KEY ("item_id","owner_id") REFERENCES "public"."items"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachments_item_idx" ON "attachments" USING btree ("item_id");--> statement-breakpoint
CREATE POLICY "attachments_select_own" ON "attachments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "attachments_insert_own" ON "attachments" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "attachments_update_own" ON "attachments" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "attachments_delete_own" ON "attachments" AS PERMISSIVE FOR DELETE TO "authenticated" USING (owner_id = (select auth.uid()));