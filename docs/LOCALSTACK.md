# LOCALSTACK — 로컬 개발 환경

bookie의 로컬 개발 스택 구성요소와 실행 방법. 원격 배포는 [REMOTESTACK.md](./REMOTESTACK.md) 참고.

## 전체 그림

```
apps/web (Vite :5173)          apps/console (Refine :5174)
   │  hc<AppType> RPC             │  REST dataProvider (읽기·쓰기 전부)
   ▼                              ▼          └─ 로그인만 supabase-js (Auth)
apps/api (wrangler dev → workerd :8787)
   │  postgres.js (DATABASE_URL, .dev.vars)
   ▼
Supabase 로컬 스택 (Docker, 543xx 대역) — Auth + Postgres (Data API는 닫힘)
```

## 구성요소

| 구성요소 | 역할 | 실행 주체 |
|---|---|---|
| Vite dev server | web 앱 HMR 개발 서버 (:5173) | `pnpm dev:web` |
| Refine console | 관리자 대시보드 (:5174) — 데이터는 전부 Hono API 경유 ([CONSOLE.md](./CONSOLE.md)) | `pnpm dev:console` |
| wrangler dev (workerd) | api Worker 로컬 실행 (:8787) | `pnpm dev:api` |
| Supabase 로컬 스택 | Postgres 17 + Auth(GoTrue) + PostgREST + Storage + Studio + Mailpit | `supabase start` |

Supabase 스택은 `supabase/config.toml`의 `project_id = "bookie"` 기준으로 Docker 컨테이너/볼륨이 네임스페이스되어, 다른 프로젝트(예: motionfit)와 동시에 떠도 충돌하지 않는다.

## 포트 배치 (543xx 대역)

프로젝트 간 포트 할당 규칙: **낮은 블록 = bookie, 다음 블록 = motionfit.** Vite 앱은 프로젝트별 10단위 블록 — bookie 517x(5173 web, 5174 dashboard), motionfit 518x(5183 web). wrangler는 bookie 8787, motionfit 8788. Supabase는 bookie 543xx, motionfit 553xx. `.env`가 프로젝트 간에 섞이는 사고를 원천 차단하고, 두 프로젝트의 모든 dev 서버가 동시에 떠도 충돌하지 않게 하기 위한 규칙이다.

| 서비스 | 포트 |
|---|---|
| API (Kong 게이트웨이) | 54321 |
| Postgres | 54322 |
| Studio | http://127.0.0.1:54323 |
| Mailpit (메일 캐처) | 54324 |
| shadow DB (`db diff`용) | 54320 |
| edge runtime inspector | 8083 |
| api Worker (wrangler dev) | 8787 |
| web (Vite) | 5173 |
| console (Refine) | 5174 |

## 사전 요구사항

- **Docker Desktop** — Supabase 스택 실행에 필요
- **Supabase CLI** — `brew install supabase/tap/supabase` (전역 1개로 모든 프로젝트 대응)
- **pnpm** — 패키지 매니저 (`packageManager` 필드로 버전 고정)
- wrangler는 `apps/api`의 devDependency로 설치되므로 별도 전역 설치 불필요

## 처음 실행 (최초 1회)

```bash
pnpm install

# 1. Supabase 로컬 스택 기동 (리포 루트에서)
supabase start

# 2. api 시크릿 파일 생성 (로컬 데모 값이 기본으로 들어 있음)
cp apps/api/.dev.vars.example apps/api/.dev.vars

# 3. DB 스키마 적용 (Drizzle이 스키마 오너 — supabase 마이그레이션은 쓰지 않는다)
cd apps/api
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm db:migrate
```

로컬 스택의 anon key / JWT secret은 모든 로컬 Supabase가 공유하는 **공개 데모 값**이라 `.dev.vars.example`에 그대로 커밋되어 있다. 원격 프로젝트의 실제 키만 비밀이다.

## 일상 개발 루틴

```bash
supabase start        # 이미 떠 있으면 생략 (리포 루트)
pnpm dev:api          # http://localhost:8787
pnpm dev:web          # http://localhost:5173
```

- 스키마 변경 시: `apps/api/src/db/schema.ts` 수정 → `DATABASE_URL=... pnpm db:generate && DATABASE_URL=... pnpm db:migrate`
- DB를 초기 상태로 리셋: `supabase db reset` 후 drizzle 마이그레이션 재적용
- 스택 정지: `supabase stop` (데이터는 Docker 볼륨에 보존됨. 완전 초기화는 `supabase stop --no-backup`)
- DB GUI: Studio(http://127.0.0.1:54323) 또는 아무 Postgres 클라이언트로 54322 접속

## Cloudflare 로컬 테크 스택 (wrangler dev)

`pnpm dev:api`가 실행하는 `wrangler dev`의 내부 구조:

- **workerd** — Cloudflare가 프로덕션에서 쓰는 것과 동일한 오픈소스 Workers 런타임. 로컬에서 Worker 코드를 프로덕션과 같은 V8 isolate 환경으로 실행하므로 "로컬에선 됐는데 배포하면 안 되는" 류의 런타임 차이가 거의 없다.
- **Miniflare** — KV/R2/D1/Queues 등 Cloudflare 바인딩의 로컬 시뮬레이터. bookie는 아직 바인딩을 쓰지 않지만, 추가하면 별도 설정 없이 로컬에서 동작하고 데이터는 `apps/api/.wrangler/state/`에 저장된다 (gitignore 대상).
- **`nodejs_compat`** — `wrangler.jsonc`의 `compatibility_flags`. postgres.js 드라이버가 `node:net`/`node:tls`를 쓰기 때문에 필수. 제거하면 DB 연결이 안 된다.
- **`.dev.vars`** — 로컬 전용 시크릿 파일. `wrangler dev`가 자동으로 읽어 `c.env`에 주입한다. 배포 환경에서는 `wrangler secret put`으로 등록한 값이 같은 자리에 들어온다 (코드 변경 없음).
- **타입 생성** — `pnpm cf-typegen`(`wrangler types`)이 바인딩 타입을 생성한다. 현재는 `src/env.ts`에 수동 정의한 `AppBindings`를 쓰고 있으므로 바인딩 추가 시 둘 중 하나로 통일할 것.
- **설정 변경 반영** — `wrangler dev`는 소스 변경을 자동 리로드한다. `wrangler.jsonc` 변경도 감지하지만, 이상하면 재시작이 확실하다.

### 트러블슈팅

- **8787 포트 점유** — 이전 `wrangler dev`의 workerd 프로세스가 고아로 남는 경우가 있다. 증상: 새 서버가 8788로 뜨거나, 낡은 코드/환경으로 응답. 해결: `lsof -ti :8787 | xargs kill`
- **`/api/*`가 500** — 대부분 `.dev.vars` 누락 또는 Supabase 스택 미기동. `supabase status`로 확인.
- **Docker 리소스** — Supabase 스택 하나가 컨테이너 ~10개다. 안 쓰는 프로젝트 스택은 `supabase stop --project-id <id>`로 내려두는 것을 권장.
