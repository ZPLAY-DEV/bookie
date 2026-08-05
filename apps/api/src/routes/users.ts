import { Hono } from 'hono'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { requireAuth } from '../middleware/auth'
import {
  claimAssociations,
  getAdminUser,
  getUser,
  joinDefaultSchool,
  listUserAssociations,
} from '../services/user.service'

export const users = new Hono<AppEnv>()
  // 사전 등록이 없는 사용자가 확인을 거쳐 기본 학교(제트초등학교)로 합류
  .post('/me/join-default-school', requireAuth, async (c) => {
    const authUser = c.get('user')
    const db = createDb(c.env.DATABASE_URL)
    const associations = await joinDefaultSchool(
      db,
      authUser.id,
      authUser.email,
      authUser.phone,
    )
    return c.json({ associations })
  })
  .get('/me', requireAuth, async (c) => {
  const authUser = c.get('user')
  const db = createDb(c.env.DATABASE_URL)

  // 사전 등록(associations) 매칭 — 승인 후에 매니저가 추가 등록한 학교도
  // 다음 방문 때 연결되도록 매번 시도한다 (매칭 없으면 no-op)
  await claimAssociations(db, authUser.id, authUser.email, authUser.phone)

  const [user, admin, associations] = await Promise.all([
    getUser(db, authUser.id),
    getAdminUser(db, authUser.id),
    listUserAssociations(db, authUser.id),
  ])
  // email은 JWT 클레임, admin 행의 email은 auth.users 원본 (admin_users 뷰 경유)
  return c.json({
    ...authUser,
    user,
    admin,
    isAdmin: admin !== null,
    isApproved: user?.role === 'teacher' || user?.role === 'admin',
    associations,
  })
})
