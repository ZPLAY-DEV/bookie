-- admin_users 뷰: users(role=admin) + auth.users.email
-- auth 스키마를 참조하므로 drizzle 스키마 diff 대상이 아니며 (.existing()),
-- 이 커스텀 마이그레이션으로 직접 관리한다.
CREATE VIEW "public"."admin_users" AS
SELECT
  u."id",
  au."email",
  u."name",
  u."role",
  u."profile_image_url",
  u."created_at"
FROM "public"."users" u
JOIN "auth"."users" au ON au."id" = u."id"
WHERE u."role" = 'admin';
