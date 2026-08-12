ALTER TABLE "users" ADD COLUMN "note" varchar(64);--> statement-breakpoint
-- admin_users는 users의 1:1 확장 뷰(.existing())라 새 컬럼을 노출하려면 재생성해야 한다.
-- 정의는 0013과 동일하고 note만 추가.
DROP VIEW IF EXISTS "public"."admin_users";--> statement-breakpoint
CREATE VIEW "public"."admin_users" AS
SELECT
  u."id",
  u."name",
  u."role",
  u."profile_image_url",
  u."social_user_id",
  u."note",
  u."created_at",
  au."email",
  au."phone"
FROM "public"."users" u
LEFT JOIN "auth"."users" au ON au."id" = u."id";--> statement-breakpoint
REVOKE ALL ON "public"."admin_users" FROM anon, authenticated, public;--> statement-breakpoint
GRANT SELECT ON "public"."admin_users" TO service_role;
