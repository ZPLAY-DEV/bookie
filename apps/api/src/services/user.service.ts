import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { profiles } from '../db/schema'

export async function getProfile(db: Database, userId: string) {
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, userId))
  return profile ?? null
}
