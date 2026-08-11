# admin_users 확장 뷰 + 콘솔 사용자 목록 — 설계

작성일: 2026-08-11

## 배경

`public.admin_users`는 이름과 달리 `users`의 확장 뷰가 아니다. 현재 정의는
`users INNER JOIN auth.users WHERE role = 'admin'` — "누가 관리자인가"를 답하는
부분집합 뷰이고, API는 이 뷰에 행이 존재하는지로 관리자 권한을 판정한다
(`getAdminUser` → `requireAdmin`).

문제는 두 가지다.

1. **이름이 의미를 배신한다.** 같은 이름의 뷰가 다른 프로젝트(facely)에서는
   필터 없는 1:1 확장 뷰(users + `auth.users.email`)로 쓰인다. 확장 뷰를
   기대하고 조회하면 `users` 8행 대 `admin_users` 1행이 고장으로 보인다.
2. **뷰가 권한 판정에 필요하지 않다.** `role`은 이미 `public.users` 컬럼이다.
   뷰가 실제로 더해주는 값은 `auth.users.email` 하나뿐이다.

동시에, 콘솔에는 사용자 목록 페이지가 없다. 강사 승인은 사전 등록
(`associations`)의 이메일·전화 매칭으로만 자동 처리되고(`claimAssociations`),
매칭이 안 되면 관리자가 손쓸 방법이 없다.

## 목표

- `admin_users`를 facely와 동일한 1:1 확장 뷰로 재정의한다.
- 콘솔에 사용자 목록 페이지를 만들고, 관리자가 `role`을 직접 바꿀 수 있게 한다.
- 카카오 로그인 사용자가 이메일을 반드시 제공하도록 강제한다.

## 비목표

- RLS 도입. bookie API는 `postgres` 롤로 직접 접속하고 콘솔은 Hono API만
  경유한다. Supabase Data API·RLS는 쓰지 않는다 (`docs/CONSOLE.md`).
- 학교 소속 관리. 기존 associations 페이지 담당이다.
- 사용자 삭제. 이번 범위 밖이다.

## 승인 흐름 (설계의 전제)

관리자는 사전에 통보받은 이메일과 가입 계정의 이메일을 **대조해서** 그 사람을
정식 강사로 인정할지 판단한다. 따라서 이메일은 표시용 정보가 아니라 **식별 키**다.
이메일이 없으면 승인 판단 자체가 성립하지 않는다.

전화번호는 사용자가 공개를 원하지 않을 수 있으므로 필수로 두지 않는다.

## 1. DB — `0013_admin-users-extension-view.sql`

```sql
DROP VIEW IF EXISTS public.admin_users;

CREATE VIEW public.admin_users AS
SELECT u.id, u.name, u.role, u.profile_image_url, u.social_user_id, u.created_at,
       au.email, au.phone
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.id;

REVOKE ALL ON public.admin_users FROM anon, authenticated, public;
GRANT SELECT ON public.admin_users TO service_role;
```

- **`LEFT JOIN`** — 이메일 없는 계정도 행이 살아 있어야 관리자가 보고 판단한다.
  `INNER JOIN`이면 목록에서 통째로 사라진다.
- **`phone` 포함** — 사전 등록 명단이 이메일 또는 전화로 매칭되므로 대조에 쓰인다.
- **`REVOKE`/`GRANT`** — 뷰는 owner(postgres) 권한으로 `auth.users`를 읽는다.
  `anon`/`authenticated`에 노출되면 이메일이 샌다. bookie 콘솔은 이 뷰를 직접
  조회하지 않으므로 실사용에 영향이 없고, 프로덕션에 남아 있을 수 있는 default
  privilege만 차단한다.

`schema.ts`의 `adminUsers` pgView 정의도 새 컬럼 목록에 맞춘다.

## 2. API

### 권한 검사 분리

뷰가 더 이상 관리자 집합이 아니므로 판정을 컬럼 직독으로 바꾼다.

- `getAdminUser` 삭제
- `requireAdmin` — `getUser(...).role === 'admin'` 검사 (`requireMember`와 같은 모양)
- `/users/me`의 `isAdmin` — `user.role === 'admin'`

`/users/me` 응답의 `admin` 필드는 소비처가 없다 — 콘솔 `verifyAdmin`은 `isAdmin`만
읽고(`providers/auth.ts:13`), 웹 앱은 참조하지 않는다. 뷰 조회를 없애면서 함께
제거한다. 콘솔 주석("admin_users 뷰 기반")도 갱신한다.

### 신규 엔드포인트

둘 다 `requireAuth, requireAdmin`.

- **`GET /api/users`** — `admin_users` 뷰 조회. 기존 `{ data, total }` 컨벤션과
  `listQuerySchema`(page/pageSize/sortField/sortOrder)를 따른다. `role` eq 필터 지원.
- **`PATCH /api/users/:id`** — 본문 `{ role: 'pending' | 'teacher' | 'admin' }`.
  자기 자신의 role 변경은 400으로 거부한다 — 관리자가 스스로를 강등해 콘솔에서
  잠기는 사고를 막는다.

role 변경은 `users.role`만 건드린다. 소속은 건드리지 않는다.

## 3. 콘솔 — 사용자 목록 페이지

`App.tsx`의 `resources`에 `users` 추가. `apps/console/src/pages/users/index.tsx`.

목록 컬럼: 프로필 이미지 · 이름 · 이메일 · 전화 · role · 가입일.

- `role`은 행에서 바로 바꾸는 인라인 Select. `lessons/index.tsx`의 인라인 편집
  Tag 패턴을 따른다.
- 이메일이 없는 행은 "미제공"으로 표시해 관리자가 즉시 구분한다.
- `role` 필터로 `pending`만 추려 볼 수 있게 한다 — 승인 대기 처리가 주 용도다.

## 4. 웹 앱 — 이메일 게이트

로그인 직후 세션의 email이 비어 있으면 진입 차단 화면을 띄운다.

- 문구: 이메일 제공에 동의해야 이용할 수 있다는 안내
- 동작: 카카오 재동의(재로그인) 버튼
- API에도 같은 검사를 걸어 프론트 우회를 막는다

카카오 개발자 콘솔의 '카카오계정(이메일)' 필수 동의 설정은 이 코드 밖의 별도
작업이다(비즈 앱 전환 필요 여부 확인 포함). 앱 게이트는 그 설정과 무관하게 동작한다.

### 남은 위험 — 구현 중 실측 대상

이미 `auth.users` 행이 만들어진 뒤 카카오계정에 이메일을 추가하고 재로그인했을 때,
Supabase가 기존 행의 `email`을 갱신하는지 확인되지 않았다. 갱신되지 않으면 그
계정은 재로그인으로 빠져나올 수 없고 복구 불가 상태가 된다.

직접 입력 예비 경로를 두지 않기로 했으므로, 구현 중 이 동작을 실측하고 결과를
보고한다. 갱신되지 않는 것으로 확인되면 그 시점에 대응을 다시 판단한다.

## 5. `pending` 계정 취급

삭제하지 않는다. `pending`은 쓰레기가 아니라 신규 가입의 정상 초기 상태이며
(`handle_new_user` 트리거가 모든 계정을 `pending`으로 만든다), 관리자 목록이
존재하는 이유가 그 유입을 처리하기 위해서다. 이메일 없는 행도 "이메일 없이
가입을 시도한 사람이 있다"는 정보이므로 남긴다.

## 검증

1. 마이그레이션 후 `SELECT count(*) FROM admin_users` = `SELECT count(*) FROM users`
2. `role`을 `admin`에서 내린 계정이 콘솔 로그인에서 차단되는지 — 권한 검사가
   뷰가 아닌 컬럼을 보는지 확인
3. 자기 자신 role 변경 시도가 400으로 거부되는지
4. 이메일 없는 계정으로 웹 앱 로그인 시 차단 화면에 도달하는지
5. 이메일 없는 계정이 콘솔 목록에 "미제공"으로 보이는지 (`LEFT JOIN` 확인)
6. `tsc --noEmit` — api · web · console 전부
