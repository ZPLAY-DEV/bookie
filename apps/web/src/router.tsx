import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'

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

const rootRoute = createRootRoute()

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
