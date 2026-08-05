ALTER TABLE "lessons" ADD COLUMN "day_index" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "thumbnail_file" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "lesson_pdf_file" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "guide_pdf_file" text;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "slide_count" integer;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "flow" jsonb;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "preps" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lessons" ADD COLUMN "media" jsonb DEFAULT '[]'::jsonb NOT NULL;