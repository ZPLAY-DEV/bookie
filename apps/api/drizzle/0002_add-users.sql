CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"social_user_id" text,
	"name" text,
	"role" text DEFAULT 'user' NOT NULL,
	"profile_image_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
