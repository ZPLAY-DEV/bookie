import { and, eq, or, type SQL } from 'drizzle-orm'
import type { Database } from '../db'
import { adminUsers, associations, schools, users } from '../db/schema'

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

// 사전 등록(invited)된 associations를 로그인한 사용자의 이메일/전화와 매칭해
// userId를 연결하고 active로 전환한다. 하나라도 매칭되면 pending → teacher 자동 승인.
export async function claimAssociations(
  db: Database,
  userId: string,
  email?: string,
  phone?: string,
) {
  const contactMatches: SQL[] = []
  if (email) contactMatches.push(eq(associations.email, email))
  if (phone) contactMatches.push(eq(associations.phone, phone))
  if (contactMatches.length === 0) return

  const claimed = await db
    .update(associations)
    .set({ userId, status: 'active' })
    .where(and(eq(associations.status, 'invited'), or(...contactMatches)))
    .returning()

  if (claimed.length > 0) {
    await db
      .update(users)
      .set({ role: 'teacher' })
      .where(and(eq(users.id, userId), eq(users.role, 'pending')))
  }
}

// 사전 등록이 없는 강사가 확인 버튼으로 합류하는 기본(데모) 학교
const DEFAULT_SCHOOL_NAME = '제트초등학교'

// 소속이 하나도 없는 사용자를 기본 학교에 합류시키고 teacher로 승격한다.
// 학교가 없으면 자동 생성. 이미 활성 소속이 있으면 아무것도 하지 않는다.
export async function joinDefaultSchool(
  db: Database,
  userId: string,
  email?: string,
  phone?: string,
) {
  const existing = await listUserAssociations(db, userId)
  if (existing.length > 0) return existing

  let [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.name, DEFAULT_SCHOOL_NAME))
  if (!school) {
    ;[school] = await db
      .insert(schools)
      .values({ name: DEFAULT_SCHOOL_NAME })
      .returning()
  }
  await db.insert(associations).values({
    schoolId: school.id,
    userId,
    email: email ?? null,
    phone: phone ?? null,
    status: 'active',
  })
  await db
    .update(users)
    .set({ role: 'teacher' })
    .where(and(eq(users.id, userId), eq(users.role, 'pending')))
  return listUserAssociations(db, userId)
}

// 사용자의 활성 소속 목록 (학교 이름 포함) — 복수면 웹에서 학교 선택 화면을 띄운다
export async function listUserAssociations(db: Database, userId: string) {
  return db
    .select({
      id: associations.id,
      schoolId: associations.schoolId,
      schoolName: schools.name,
    })
    .from(associations)
    .innerJoin(schools, eq(schools.id, associations.schoolId))
    .where(
      and(eq(associations.userId, userId), eq(associations.status, 'active')),
    )
}
