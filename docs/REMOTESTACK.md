# REMOTESTACK — 원격 구성 및 배포

bookie의 원격(프로덕션) 스택 구성과 배포 방법. 로컬 개발은 [LOCALSTACK.md](./LOCALSTACK.md) 참고.

> **현재 상태**: 원격 리소스는 아직 프로비저닝되지 않았다. 아래 "미구성" 표기 항목은 첫 배포 시점에 수행해야 하는 작업이다.

## 구성 개요

```
사용자 브라우저
   │
   ├── apps/web  → Cloudflare Pages (미구성)
   │       │  VITE_API_URL
   │       ▼
   └── apps/api  → Cloudflare Workers ("api")
           │  postgres.js (Hyperdrive 또는 pooler 직결)
           ├─ Cloudflare R2 "media" 버킷 (미구성)
           │   수업 이미지 + 지도안/수업자료 파일 — /api/files/* 로 서빙
           ▼
       Supabase 원격 프로젝트 (미구성)
        ├─ Postgres 17 (weeks/lessons/... 테이블)
        └─ Auth — 로그인/가입은 web이 직접, api는 JWT 검증만
```

> 파일 저장소는 비용상 Supabase Storage 대신 **Cloudflare R2**를 쓴다 (이그레스 무료).

| 리소스 | 역할 | 상태 |
|---|---|---|
| Cloudflare Workers | Hono API (`wrangler.jsonc`, name: `api`) | 설정 완료, 미배포 |
| Cloudflare Pages | web 정적 호스팅 (SAD 기준) | 미구성 |
| Cloudflare R2 | `media` 버킷 — 수업 이미지·자료 파일 (`MEDIA` 바인딩) | 미구성 — 배포 전 `wrangler r2 bucket create media` |
| Supabase 프로젝트 | Postgres + Auth | 미구성 |

## 첫 배포 절차

### 1. Supabase 원격 프로젝트 생성

1. [supabase.com](https://supabase.com)에서 프로젝트 생성 — **Postgres 버전을 로컬 `supabase/config.toml`의 `major_version = 17`과 맞출 것**
2. 리포 루트에서 연결: `supabase link --project-ref <project-ref>`
3. 스키마 적용 — Drizzle이 스키마 오너이므로 `supabase db push`가 아니라 drizzle-kit을 쓴다:

```bash
cd apps/api
DATABASE_URL='postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres' pnpm db:migrate
```

### 2. Worker 시크릿 등록

`.dev.vars`의 로컬 값에 대응하는 원격 값을 등록한다:

```bash
cd apps/api
wrangler secret put DATABASE_URL        # Transaction pooler(6543) 연결 문자열
wrangler secret put SUPABASE_URL        # https://<project-ref>.supabase.co (JWKS 검증용)
wrangler secret put SUPABASE_JWT_SECRET # Dashboard > Settings > API > JWT Secret (HS256 폴백용)
```

- **반드시 Transaction pooler(포트 6543) URL을 쓸 것.** Workers는 요청마다 연결을 만들기 때문에 direct connection(5432)은 connection 한도를 금방 소진한다. `db/index.ts`의 `prepare: false`는 transaction pooler 필수 설정이라 이미 되어 있다.
- JWT 검증은 ES256(JWKS) + HS256 폴백을 모두 지원하므로 프로젝트의 signing key 방식과 무관하게 동작한다.

### 3. API 배포

```bash
cd apps/api
pnpm deploy          # = wrangler deploy --minify
```

첫 실행 시 wrangler가 Cloudflare 계정 로그인(OAuth)을 요구한다. 배포 후 `https://api.<account>.workers.dev`가 발급되며, 커스텀 도메인은 Cloudflare Dashboard > Workers > Domains에서 연결한다.

### 4. Web / Console 배포 (Cloudflare Pages, 미구성)

방향만 정해둔 상태(SAD 기준). 구성 시 체크리스트:

- **web**: `pnpm --filter web build` → `apps/web/dist`. 환경변수 `VITE_API_URL` = Worker URL
- **console**: `pnpm --filter console build` → `apps/console/dist`. 환경변수 `VITE_API_URL` + `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`(원격 프로젝트, anon key는 공개 가능 값). 관리자 전용이므로 Cloudflare Access 등으로 접근 제한 권장
- api의 CORS: 현재 `app.use('/api/*', cors())`가 전체 오리진 허용이므로, 프로덕션에서는 web/console 도메인으로 제한할 것

## 배포 후 스키마 변경 시

로컬에서 `db:generate`로 마이그레이션 파일 생성 → 로컬 검증 → **원격 `db:migrate` → `pnpm deploy`** 순서. (역순이면 새 코드가 없는 컬럼을 조회하는 구간이 생긴다.)

## 환경별 값 대응표

| 항목 | 로컬 | 원격 |
|---|---|---|
| DATABASE_URL | `127.0.0.1:54322` 직결 | pooler `:6543` (secret) |
| SUPABASE_URL | `http://127.0.0.1:54321` | `https://<ref>.supabase.co` |
| SUPABASE_JWT_SECRET | 공개 데모 값 | 프로젝트별 secret |
| VITE_API_URL | `http://localhost:8787` | Worker URL |
| 시크릿 주입 방식 | `.dev.vars` 파일 | `wrangler secret put` |
