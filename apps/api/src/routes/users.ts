import { Hono } from 'hono'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { requireAuth } from '../middleware/auth'
import { getProfile } from '../services/user.service'

export const users = new Hono<AppEnv>().get('/me', requireAuth, async (c) => {
  const user = c.get('user')
  const db = createDb(c.env.DATABASE_URL)
  const profile = await getProfile(db, user.id)
  return c.json({ ...user, profile })
})
