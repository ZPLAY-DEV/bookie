import { asc, count, desc, eq, getTableColumns, type SQL } from 'drizzle-orm'
import type { Database } from '../db'
import { associations, schools, users } from '../db/schema'
import type { ListParams } from './lesson.service'

function paginate(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

// --- schools ---

const schoolSortColumns = {
  id: schools.id,
  name: schools.name,
} as const

export type SchoolSortField = keyof typeof schoolSortColumns

// 저장 가능한 학교 필드 — 스키마(insert 모델)에서 유도
export type SchoolValues = Omit<typeof schools.$inferInsert, 'id' | 'createdAt'>

export async function listSchools(
  db: Database,
  params: ListParams & { sortField: SchoolSortField },
) {
  const { limit, offset } = paginate(params.page, params.pageSize)
  const order = params.sortOrder === 'desc' ? desc : asc
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(schools)
      .orderBy(order(schoolSortColumns[params.sortField]))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(schools),
  ])
  return { data, total }
}

export async function getSchool(db: Database, id: number) {
  const [school] = await db.select().from(schools).where(eq(schools.id, id))
  return school ?? null
}

export async function createSchool(
  db: Database,
  values: SchoolValues,
) {
  const [school] = await db.insert(schools).values(values).returning()
  return school
}

export async function updateSchool(
  db: Database,
  id: number,
  values: Partial<SchoolValues>,
) {
  const [school] = await db
    .update(schools)
    .set(values)
    .where(eq(schools.id, id))
    .returning()
  return school ?? null
}

export async function deleteSchool(db: Database, id: number) {
  const [school] = await db
    .delete(schools)
    .where(eq(schools.id, id))
    .returning()
  return school ?? null
}

// --- associations ---

export type AssociationValues = {
  schoolId: number
  email?: string | null
  phone?: string | null
}

const associationSortColumns = {
  id: associations.id,
  schoolId: associations.schoolId,
  status: associations.status,
} as const

export type AssociationSortField = keyof typeof associationSortColumns

export async function listAssociations(
  db: Database,
  params: ListParams & { sortField: AssociationSortField; schoolId?: number },
) {
  const { limit, offset } = paginate(params.page, params.pageSize)
  const order = params.sortOrder === 'desc' ? desc : asc
  const where: SQL | undefined =
    params.schoolId === undefined
      ? undefined
      : eq(associations.schoolId, params.schoolId)
  const [data, [{ total }]] = await Promise.all([
    db
      // 연결된 강사 이름(users.name)을 함께 내려준다 — 콘솔 학교 상세의 강사 목록용
      .select({ ...getTableColumns(associations), userName: users.name })
      .from(associations)
      .leftJoin(users, eq(associations.userId, users.id))
      .where(where)
      .orderBy(order(associationSortColumns[params.sortField]))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(associations).where(where),
  ])
  return { data, total }
}

export async function getAssociation(db: Database, id: number) {
  const [association] = await db
    .select()
    .from(associations)
    .where(eq(associations.id, id))
  return association ?? null
}

export async function createAssociation(
  db: Database,
  values: AssociationValues,
) {
  const [association] = await db
    .insert(associations)
    .values(values)
    .returning()
  return association
}

export async function updateAssociation(
  db: Database,
  id: number,
  values: Partial<AssociationValues>,
) {
  const [association] = await db
    .update(associations)
    .set(values)
    .where(eq(associations.id, id))
    .returning()
  return association ?? null
}

export async function deleteAssociation(db: Database, id: number) {
  const [association] = await db
    .delete(associations)
    .where(eq(associations.id, id))
    .returning()
  return association ?? null
}
