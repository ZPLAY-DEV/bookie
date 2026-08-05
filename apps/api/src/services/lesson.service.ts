import { asc, count, desc, eq, type SQL } from 'drizzle-orm'
import type { Database } from '../db'
import { lessons, weeks } from '../db/schema'

export type ListParams = {
  page: number
  pageSize: number
  sortOrder: 'asc' | 'desc'
}

function paginate(page: number, pageSize: number) {
  return { limit: pageSize, offset: (page - 1) * pageSize }
}

// --- weeks ---

const weekSortColumns = {
  id: weeks.id,
  weekNo: weeks.weekNo,
  theme: weeks.theme,
} as const

export type WeekSortField = keyof typeof weekSortColumns

export async function listWeeks(
  db: Database,
  params: ListParams & { sortField: WeekSortField },
) {
  const { limit, offset } = paginate(params.page, params.pageSize)
  const order = params.sortOrder === 'desc' ? desc : asc
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(weeks)
      .orderBy(order(weekSortColumns[params.sortField]))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(weeks),
  ])
  return { data, total }
}

export async function getWeekWithLessons(db: Database, id: number) {
  const [week] = await db.select().from(weeks).where(eq(weeks.id, id))
  if (!week) return null
  const weekLessons = await db
    .select()
    .from(lessons)
    .where(eq(lessons.weekId, week.id))
    .orderBy(asc(lessons.dayIndex))
  return { ...week, lessons: weekLessons }
}

export async function createWeek(
  db: Database,
  values: { weekNo: number; theme: string; subtitle?: string | null },
) {
  const [week] = await db.insert(weeks).values(values).returning()
  return week
}

export async function updateWeek(
  db: Database,
  id: number,
  values: Partial<{ weekNo: number; theme: string; subtitle: string | null }>,
) {
  const [week] = await db
    .update(weeks)
    .set(values)
    .where(eq(weeks.id, id))
    .returning()
  return week ?? null
}

export async function deleteWeek(db: Database, id: number) {
  const [week] = await db.delete(weeks).where(eq(weeks.id, id)).returning()
  return week ?? null
}

// --- lessons ---

import type { LessonFlow, LessonMediaItem, LessonPrep } from '../db/schema'

export type LessonValues = {
  weekId: number
  dayIndex: number
  category: string
  title: string
  description?: string | null
  durationMin?: number | null
  image?: string | null
  lessonDownload?: string | null
  guideDownload?: string | null
  slideCount?: number | null
  flow?: LessonFlow | null
  preps?: LessonPrep[]
  media?: LessonMediaItem[]
}

export async function listLessons(
  db: Database,
  params: ListParams & { weekId?: number },
) {
  const { limit, offset } = paginate(params.page, params.pageSize)
  const order = params.sortOrder === 'desc' ? desc : asc
  const where: SQL | undefined =
    params.weekId === undefined ? undefined : eq(lessons.weekId, params.weekId)
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(lessons)
      .where(where)
      .orderBy(order(lessons.weekId), order(lessons.dayIndex))
      .limit(limit)
      .offset(offset),
    db.select({ total: count() }).from(lessons).where(where),
  ])
  return { data, total }
}

// flow/preps/media가 lessons에 내장되어 단일 행 조회로 끝난다
export async function getLessonDetail(db: Database, lessonId: number) {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId))
  return lesson ?? null
}

// weekId가 정해지면 weekIndex(주차 번호)는 항상 서버에서 유도한다 — 경로 규칙(w{주차}d{일차})의 원천
async function weekIndexOf(db: Database, weekId: number) {
  const [week] = await db.select().from(weeks).where(eq(weeks.id, weekId))
  return week?.weekNo ?? 1
}

export async function createLesson(db: Database, values: LessonValues) {
  const weekIndex = await weekIndexOf(db, values.weekId)
  const [lesson] = await db
    .insert(lessons)
    .values({ ...values, weekIndex })
    .returning()
  return lesson
}

export async function updateLesson(
  db: Database,
  id: number,
  values: Partial<LessonValues>,
) {
  const weekIndex =
    values.weekId === undefined ? undefined : await weekIndexOf(db, values.weekId)
  const [lesson] = await db
    .update(lessons)
    .set(weekIndex === undefined ? values : { ...values, weekIndex })
    .where(eq(lessons.id, id))
    .returning()
  return lesson ?? null
}

export async function deleteLesson(db: Database, id: number) {
  const [lesson] = await db.delete(lessons).where(eq(lessons.id, id)).returning()
  return lesson ?? null
}
