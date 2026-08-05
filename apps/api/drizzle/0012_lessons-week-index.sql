ALTER TABLE "lessons" ADD COLUMN "week_index" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
UPDATE "lessons" SET "week_index" = w."week_no" FROM "weeks" w WHERE w."id" = "lessons"."week_id";
