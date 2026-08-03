import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { adminUsers, users } from '../db/schema'

export async function getUser(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user ?? null
}

// admin_users 뷰 조회 — role=admin인 사용자만 행이 존재한다
export async function getAdminUser(db: Database, userId: string) {
  const [admin] = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, userId))
  return admin ?? null
}
