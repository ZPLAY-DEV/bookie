ALTER TABLE "lessons" RENAME COLUMN "thumbnail_file" TO "image";--> statement-breakpoint
ALTER TABLE "lessons" RENAME COLUMN "lesson_pdf_file" TO "lesson_download";--> statement-breakpoint
ALTER TABLE "lessons" RENAME COLUMN "guide_pdf_file" TO "guide_download";
