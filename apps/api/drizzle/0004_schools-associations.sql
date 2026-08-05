CREATE TABLE "associations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "associations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"school_id" integer NOT NULL,
	"email" text,
	"phone" text,
	"user_id" uuid,
	"status" text DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "schools_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "associations" ADD CONSTRAINT "associations_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "associations" ADD CONSTRAINT "associations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;