import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  useRouterState,
} from '@tanstack/react-router'

import { ScaledViewport } from '@/components/scaled-viewport'

import { CurriculumPage } from '@/pages/curriculum-page'
import { LoginPage } from '@/pages/login-page'
import { PlayerPage } from '@/pages/player-page'
import { WeekPage } from '@/pages/week-page'
import { supabase } from '@/lib/supabase'

// 로그인하지 않으면 대시보드 접근 불가
async function requireSession() {
  const { data } = await supabase.auth.getSession()
  if (!data.session) throw redirect({ to: '/login' })
}

// 로그인을 뺀 나머지 화면은 1920×1080 고정 캔버스에 렌더된다(뷰포트가 작으면 캔버스째 축소).
// 로그인만 캔버스 밖에서 실제 뷰포트에 맞춰 렌더한다 — 좁은 화면에서 카드가 밀려나면 안 된다.
function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (pathname === '/login') return <Outlet />
  return (
    <ScaledViewport>
      <Outlet />
    </ScaledViewport>
  )
}

const rootRoute = createRootRoute({ component: RootLayout })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: async () => {
    await requireSession()
    throw redirect({ to: '/weeks/$weekNo', params: { weekNo: '1' } })
  },
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

const curriculumRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/curriculum',
  beforeLoad: requireSession,
  component: CurriculumPage,
})

const playRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/play/$lessonId',
  // ?start=N 으로 재생목록 중간부터 시작할 수 있다
  validateSearch: (search: Record<string, unknown>): { start?: number } => {
    const n = Number(search.start)
    return Number.isFinite(n) && n > 0 ? { start: n } : {}
  },
  beforeLoad: requireSession,
  component: PlayerPage,
})

const weekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weeks/$weekNo',
  // ?day=1~5 — 선택한 요일을 URL에 실어 뒤로가기 시에도 유지한다
  validateSearch: (search: Record<string, unknown>): { day?: number } => {
    const n = Number(search.day)
    return Number.isInteger(n) && n >= 1 && n <= 5 ? { day: n } : {}
  },
  beforeLoad: requireSession,
  component: WeekPage,
})

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, curriculumRoute, playRoute, weekRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
