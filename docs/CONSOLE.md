# CONSOLE — 관리자 콘솔 아키텍처

`apps/console` (Refine + Ant Design, :5174)의 설계 결정과 컨벤션. 로컬 실행은 [LOCALSTACK.md](./LOCALSTACK.md) 참고.

## 핵심 결정: 모든 데이터는 Hono API 경유, RLS 미사용

```
console (Refine :5174)
 ├─ dataProvider  ──►  Hono API (wrangler :8787)  ──►  Postgres   ← 모든 읽기/쓰기
 ├─ authProvider  ──►  supabase-js (로그인/세션만)
 └─ liveProvider  ──►  없음 (admin console에 realtime 불필요)
```

**이유:**

1. **집행 지점 단일화** — 검증·비즈니스 규칙·인가가 전부 API 한 곳. RLS로 가면 같은 인가 로직이 SQL 정책과 API 코드 두 곳에 쪼개진다.
2. **RLS·GRANT 관리 비용 제거** — 정책 작성/디버깅/마이그레이션이 통째로 사라진다.
3. **보안 성립** — bookie의 Supabase는 새 테이블을 Data API에 자동 노출하지 않는 최신 기본값이라, GRANT를 주지 않는 한 anon key로는 아무것도 접근할 수 없다 (Data API가 닫힌 상태가 기본).

**supabase-js의 역할은 Auth SDK로 한정** — 토큰 자동 리프레시·세션 영속화를 공짜로 얻는다. 로그인 후 `session.access_token`을 모든 API 호출의 `Authorization: Bearer`로 전달하고, API의 `middleware/auth.ts`가 검증한다(ES256 JWKS + HS256 폴백, motionfit과 동일).

> 참고: motionfit은 web 읽기를 Supabase SDK + RLS로 한다. 학부모/강사 멀티테넌시 격리가 필요해서 RLS가 값을 하기 때문이고, bookie는 그런 요구가 없어 API 단일 경로를 택했다. 프로젝트별 요구 차이지 통일성 위반이 아니다.

## API 컨벤션 (Refine dataProvider ↔ Hono)

`apps/console/src/providers/data.ts`가 이 규약으로 API를 부른다:

| Refine 호출 | HTTP | 응답 |
|---|---|---|
| `getList(resource)` | `GET /api/{resource}?page=&pageSize=&sortField=&sortOrder=` (+eq 필터는 `&{field}=`) | `{ data: T[], total: number }` |
| `getOne(resource, id)` | `GET /api/{resource}/{id}` | 레코드 (관계 포함 가능) |
| `create` | `POST /api/{resource}` | 생성된 레코드 (201) |
| `update` | `PATCH /api/{resource}/{id}` | 수정된 레코드 |
| `deleteOne` | `DELETE /api/{resource}/{id}` | 삭제된 레코드. FK 자식 존재 시 `409 { error }` |

- 쓰기(POST/PATCH/DELETE)는 `requireAuth` 필수, 읽기는 공개 (web 앱도 같은 읽기 엔드포인트 사용)
- 목록 파라미터는 `lib/query.ts`의 `listQuerySchema`(zod)로 검증 — 리소스별 정렬 필드 화이트리스트
- 본문 검증은 라우트 파일에 콜로케이션된 zod 스키마 (`weekBodySchema` 등)

## 새 리소스 추가 절차

1. **API**: 서비스 함수(list/get/create/update/delete) + 라우트 파일 추가, `index.ts`에 `.route()` 마운트 (위 컨벤션 준수)
2. **console**: `App.tsx`의 `resources` 배열에 등록 + `src/pages/<resource>/`에 List/Create/Edit 페이지 (기존 weeks/lessons 참고)
3. dataProvider는 리소스 이름 기반 제네릭이라 **수정 불필요**

## 인증 흐름

1. `/login` (Refine AuthPage) → `providers/auth.ts` → supabase-js `signInWithPassword`
2. 로그인 성공 후 `GET /api/users/me`로 **관리자 검증** — API가 `admin_users` 뷰(`users` 테이블의 `role=admin` + `auth.users.email` 조인)를 조회해 `isAdmin`을 내려주고, 관리자가 아니면 즉시 signOut + "관리자 계정이 아닙니다". `check()`(라우트 진입 시)에서도 같은 검증을 반복한다
3. 세션은 localStorage에 영속화, 만료 시 supabase-js가 자동 리프레시
4. 모든 API 호출 직전 `auth.getSession()`으로 현재 토큰을 꺼내 Bearer 헤더에 첨부

**사용자 모델**: `users` 테이블(id = auth user id, social_user_id, name, role, profile_image_url) — auth 계정이 있어도 `users.role = 'admin'`이 아니면 콘솔 접근 불가. 관리자 발급 = `users`에 role=admin 행 추가.

**강사 온보딩 (사전 등록 → 자동 승인)**: auth 계정이 생기면 트리거가 `users`에 `role='pending'` 행을 자동 생성한다. 콘솔의 **강사 소속(associations)** 메뉴에서 매니저가 학교 + 강사 이메일/전화를 미리 등록해 두면(invited), 강사가 웹에 로그인할 때 `/api/users/me`가 매칭해 소속을 연결(active)하고 `role='teacher'`로 자동 승인한다. 매칭이 없으면 웹에는 "승인 대기" 화면이 뜬다. 복수 학교 소속이면 웹에서 학교 선택 화면이 나온다. API 권한: weeks/lessons **읽기 = teacher 이상**(`requireMember`), **쓰기 = admin**(`requireAdmin`), schools/associations = admin 전용.

**로컬 개발 계정**: `a@gmail.com / 111111`. Studio(http://127.0.0.1:54323) > Authentication에서 계정을 만들고 `pnpm db:seed`를 실행하면 해당 계정이 role=admin으로 연결된다. 비밀번호는 config.toml의 `minimum_password_length = 6` 이상이어야 한다. (회원가입 UI는 콘솔에 노출하지 않음 — 관리자 계정은 수동 발급)

## 미구현 / 다음 단계

- lessons의 하위 컬렉션(수업 흐름 steps, 준비물 preps, 자료 materials) 편집 UI — API 상세 조회에는 포함되어 있으나 콘솔 편집 폼은 아직 기본 필드만
- 원격 배포 시 console 환경변수: `VITE_API_URL`(Worker URL), `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`(원격 프로젝트) — [REMOTESTACK.md](./REMOTESTACK.md)
