ALTER TABLE "items" ALTER COLUMN "position" SET DEFAULT 'a0';--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "edited_at" timestamp with time zone DEFAULT now() NOT NULL;