-- public.users를 auth.users에 외래키로 묶는다. 지금까지는 참조가 없어서 Supabase
-- 대시보드나 admin API로 계정을 지우면 public.users 행이 고아로 남았고, admin_users
-- 뷰가 LEFT JOIN이라 이메일 없는 유령 행으로 목록에 계속 나타났다.
--
-- ⚠️ 고아 행이 남아 있으면 이 ALTER는 실패한다. 먼저 확인·정리할 것:
--   SELECT * FROM public.users u
--    WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = u.id);
ALTER TABLE "public"."users"
  ADD CONSTRAINT "users_id_auth_users_id_fk"
  FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
-- 위 cascade가 실제로 동작하려면 users를 참조하는 쪽도 열어줘야 한다. associations는
-- 매니저가 입력한 사전 등록이므로 강사가 탈퇴해도 레코드 자체는 남기고 연결만 끊는다
-- (NO ACTION이면 users 삭제가 막혀 cascade 전체가 실패한다).
ALTER TABLE "public"."associations"
  DROP CONSTRAINT "associations_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."associations"
  ADD CONSTRAINT "associations_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;
