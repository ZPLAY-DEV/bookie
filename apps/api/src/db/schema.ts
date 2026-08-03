import {
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Supabase Auth 사용자(auth.users)와 1:1로 매핑되는 앱 프로필
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(), // Supabase auth user id
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// 주차 (1주차 ~ 12주차, 주 테마)
export const weeks = pgTable('weeks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  weekNo: integer('week_no').notNull().unique(),
  theme: text('theme').notNull(), // 예: 시원한 책
  subtitle: text('subtitle'), // 예: 같은 것을 다르게 느끼다, 감각·표현의 관점
})

// 요일별 수업
export const lessons = pgTable('lessons', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  weekId: integer('week_id')
    .notNull()
    .references(() => weeks.id),
  weekday: smallint('weekday').notNull(), // 1=월 ... 5=금
  category: text('category').notNull(), // 책놀이 | 미술 | 음악 | 신체 | 사회정서
  title: text('title').notNull(), // 예: 시원한 말, 따듯한 말
  description: text('description'),
  imageUrl: text('image_url'),
  durationMin: integer('duration_min'), // 예: 40
})

// 수업 흐름 (단계별 제목 + 소요 시간)
export const lessonSteps = pgTable('lesson_steps', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer('lesson_id')
    .notNull()
    .references(() => lessons.id),
  sortOrder: integer('sort_order').notNull(),
  title: text('title').notNull(), // 예: 말 전하기 판 놀이
  durationMin: integer('duration_min').notNull(),
})

// 수업 전 준비물
export const lessonPreps = pgTable('lesson_preps', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer('lesson_id')
    .notNull()
    .references(() => lessons.id),
  name: text('name').notNull(), // 예: 시원한 말, 따듯한 말 카드
  quantity: text('quantity'), // 예: 24세트
})

// 다운로드 자료 (지도안, 수업자료)
export const materials = pgTable('materials', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  lessonId: integer('lesson_id')
    .notNull()
    .references(() => lessons.id),
  kind: text('kind').notNull(), // guide(지도안) | resource(수업자료)
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(), // R2(media 버킷) 오브젝트 키
})
