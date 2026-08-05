-- auth.users에 새 계정이 생기면 public.users에 자동으로 앱 사용자 행을 만든다.
-- 이름/프로필이미지/소셜 ID는 소셜 로그인(카카오 등) 메타데이터에서 가져오고 role='pending'으로 시작.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, profile_image_url, social_user_id, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.raw_user_meta_data ->> 'avatar_url',
    COALESCE(NEW.raw_user_meta_data ->> 'provider_id', NEW.raw_user_meta_data ->> 'sub'),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
--> statement-breakpoint
-- 백필: 트리거 생성 이전에 만들어진 auth 계정(카카오 로그인 사용자 등)
INSERT INTO public.users (id, name, profile_image_url, social_user_id, role)
SELECT
  au.id,
  au.raw_user_meta_data ->> 'name',
  au.raw_user_meta_data ->> 'avatar_url',
  COALESCE(au.raw_user_meta_data ->> 'provider_id', au.raw_user_meta_data ->> 'sub'),
  'pending'
FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = au.id);
