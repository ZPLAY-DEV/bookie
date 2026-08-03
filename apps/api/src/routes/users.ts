import { Hono } from 'hono'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { requireAuth } from '../middleware/auth'
import { getAdminUser, getUser } from '../services/user.service'

export const users = new Hono<AppEnv>().get('/me', requireAuth, async (c) => {
  const authUser = c.get('user')
  const db = createDb(c.env.DATABASE_URL)
  const [user, admin] = await Promise.all([
    getUser(db, authUser.id),
    getAdminUser(db, authUser.id),
  ])
  // email은 JWT 클레임, admin 행의 email은 auth.users 원본 (admin_users 뷰 경유)
  return c.json({ ...authUser, user, admin, isAdmin: admin !== null })
})
