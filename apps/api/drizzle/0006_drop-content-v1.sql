DROP TABLE "lesson_preps" CASCADE;--> statement-breakpoint
DROP TABLE "lesson_steps" CASCADE;--> statement-breakpoint
DROP TABLE "materials" CASCADE;--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "weekday";--> statement-breakpoint
ALTER TABLE "lessons" DROP COLUMN "image_url";