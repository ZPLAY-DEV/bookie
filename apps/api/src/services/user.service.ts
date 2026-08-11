import { and, asc, count, desc, eq, isNull, or, type SQL } from 'drizzle-orm'
import type { Database } from '../db'
import { adminUsers, associations, schools, users } from '../db/schema'
import type { ListParams } from './lesson.service'

export async function getUser(db: Database, userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId))
  return user ?? null
}

// 콘솔 사용자 목록 — admin_users 확장 뷰(users + auth.users의 email·phone)
const userSortColumns = {
  createdAt: adminUsers.createdAt,
  name: adminUsers.name,
  role: adminUsers.role,
} as const

export type UserSortField = keyof typeof userSortColumns

export const USER_ROLES = ['pending', 'teacher', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export async function listUsers(
  db: Database,
  params: ListParams & { sortField: UserSortField; role?: UserRole },
) {
  const where = params.role ? eq(adminUsers.role, params.role) : undefined
  const order = params.sortOrder === 'desc' ? desc : asc
  const [data, [{ total }]] = await Promise.all([
    db
      .select()
      .from(adminUsers)
      .where(where)
      .orderBy(order(userSortColumns[params.sortField]))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ total: count() }).from(adminUsers).where(where),
  ])
  return { data, total }
}

export async function updateUserRole(db: Database, id: string, role: UserRole) {
  const [user] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, id))
    .returning()
  return user ?? null
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
    // 연결 안 된 행이 대상 — 사전 등록(invited)뿐 아니라, 탈퇴로 userId가
    // 끊긴(ON DELETE SET NULL) 행도 재가입 시 다시 연결된다
    .where(and(isNull(associations.userId), or(...contactMatches)))
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
