CREATE TYPE "public"."item_kind" AS ENUM('project', 'folder', 'note', 'storm');--> statement-breakpoint
CREATE TYPE "public"."item_status" AS ENUM('active', 'archived', 'trashed');--> statement-breakpoint
CREATE TABLE "item_content" (
	"item_id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"body" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "item_content" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid DEFAULT auth.uid() NOT NULL,
	"parent_id" uuid,
	"kind" "item_kind" NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"position" text COLLATE "C" NOT NULL,
	"status" "item_status" DEFAULT 'active' NOT NULL,
	"status_root_id" uuid,
	"status_changed_at" timestamp with time zone,
	"icon" text,
	"color" text,
	"project_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "items_id_owner_unique" UNIQUE("id","owner_id")
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "item_content" ADD CONSTRAINT "item_content_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_content" ADD CONSTRAINT "item_content_item_same_owner_fk" FOREIGN KEY ("item_id","owner_id") REFERENCES "public"."items"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_parent_same_owner_fk" FOREIGN KEY ("parent_id","owner_id") REFERENCES "public"."items"("id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "items_owner_parent_position_idx" ON "items" USING btree ("owner_id","parent_id","position");--> statement-breakpoint
CREATE INDEX "items_owner_status_idx" ON "items" USING btree ("owner_id","status");--> statement-breakpoint
CREATE INDEX "items_status_root_idx" ON "items" USING btree ("status_root_id");--> statement-breakpoint
CREATE POLICY "item_content_select_own" ON "item_content" AS PERMISSIVE FOR SELECT TO "authenticated" USING (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "item_content_insert_own" ON "item_content" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "item_content_update_own" ON "item_content" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "item_content_delete_own" ON "item_content" AS PERMISSIVE FOR DELETE TO "authenticated" USING (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "items_select_own" ON "items" AS PERMISSIVE FOR SELECT TO "authenticated" USING (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "items_insert_own" ON "items" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "items_update_own" ON "items" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));--> statement-breakpoint
CREATE POLICY "items_delete_own" ON "items" AS PERMISSIVE FOR DELETE TO "authenticated" USING (owner_id = (select auth.uid()));