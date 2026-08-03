import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'

import { WeekPage } from '@/pages/week-page'

const rootRoute = createRootRoute()

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/weeks/$weekNo', params: { weekNo: '1' } })
  },
})

const weekRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/weeks/$weekNo',
  component: WeekPage,
})

const routeTree = rootRoute.addChildren([indexRoute, weekRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
