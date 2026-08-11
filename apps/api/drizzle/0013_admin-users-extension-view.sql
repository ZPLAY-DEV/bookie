-- admin_users 뷰를 users의 1:1 확장 뷰로 재정의한다.
-- 기존 정의는 users INNER JOIN auth.users WHERE role='admin' — "누가 관리자인가"를
-- 답하는 부분집합 뷰였고, 권한 판정에 쓰였다. role은 이미 public.users 컬럼이라
-- 뷰가 더해주는 값은 auth.users.email(+phone)뿐이므로 필터를 걷어내고 콘솔
-- 사용자 목록의 데이터 소스로 쓴다. 권한 판정은 users.role 직독으로 옮긴다.
--
-- LEFT JOIN인 이유: 카카오 이메일 미제공 계정도 행이 살아 있어야 관리자가 보고
-- 판단한다. INNER JOIN이면 목록에서 통째로 사라진다.
DROP VIEW IF EXISTS "public"."admin_users";
--> statement-breakpoint
CREATE VIEW "public"."admin_users" AS
SELECT
  u."id",
  u."name",
  u."role",
  u."profile_image_url",
  u."social_user_id",
  u."created_at",
  au."email",
  au."phone"
FROM "public"."users" u
LEFT JOIN "auth"."users" au ON au."id" = u."id";
--> statement-breakpoint
-- 뷰는 owner(postgres) 권한으로 auth.users를 읽는다. Data API 롤에 노출되면
-- 이메일이 샌다. 콘솔은 Hono API만 경유해 이 뷰를 직접 조회하지 않으므로
-- 실사용 영향은 없고, 남아 있을 수 있는 default privilege만 차단한다.
REVOKE ALL ON "public"."admin_users" FROM anon, authenticated, public;
--> statement-breakpoint
GRANT SELECT ON "public"."admin_users" TO service_role;
