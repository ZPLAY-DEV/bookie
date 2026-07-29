import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { materials } from '../db/schema'

export async function getMaterial(db: Database, materialId: number) {
  const [material] = await db
    .select()
    .from(materials)
    .where(eq(materials.id, materialId))
  return material ?? null
}

// TODO: Supabase Storage 버킷 결정 후 signed URL 발급으로 교체
export async function getDownloadUrl(material: { storagePath: string }) {
  return material.storagePath
}
