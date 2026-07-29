CREATE TABLE "lesson_preps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_preps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"name" text NOT NULL,
	"quantity" text
);
--> statement-breakpoint
CREATE TABLE "lesson_steps" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lesson_steps_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"sort_order" integer NOT NULL,
	"title" text NOT NULL,
	"duration_min" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lessons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "lessons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_id" integer NOT NULL,
	"weekday" smallint NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"duration_min" integer
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "materials_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"lesson_id" integer NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"storage_path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weeks" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "weeks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"week_no" integer NOT NULL,
	"theme" text NOT NULL,
	"subtitle" text,
	CONSTRAINT "weeks_week_no_unique" UNIQUE("week_no")
);
--> statement-breakpoint
ALTER TABLE "lesson_preps" ADD CONSTRAINT "lesson_preps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_steps" ADD CONSTRAINT "lesson_steps_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_week_id_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_lesson_id_lessons_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lessons"("id") ON DELETE no action ON UPDATE no action;