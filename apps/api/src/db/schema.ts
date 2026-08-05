import {
  integer,
  jsonb,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

// Supabase Auth 사용자(auth.users)와 1:1로 매핑되는 앱 사용자.
// auth.users INSERT 트리거(handle_new_user)가 자동 생성하며 role='pending'으로 시작,
// associations 사전 등록과 매칭되면 'teacher'로 자동 승인된다.
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Supabase auth user id
  socialUserId: text('social_user_id'), // 소셜 제공자(카카오 등) 고유 ID
  name: text('name'),
  role: text('role').notNull().default('pending'), // pending | teacher | admin
  profileImageUrl: text('profile_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// 학교
export const schools = pgTable('schools', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// 학교-강사 소속 (사전 등록 겸용). 매니저가 이메일/전화를 미리 등록해 두면(invited)
// 강사가 로그인할 때 매칭되어 userId가 연결되고 active로 전환된다.
// 강사 한 명이 여러 학교에 소속될 수 있다.
export const associations = pgTable('associations', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  schoolId: integer('school_id')
    .notNull()
    .references(() => schools.id),
  email: text('email'), // 사전 등록 이메일 (email/phone 중 하나는 필수 — API에서 검증)
  phone: text('phone'), // 사전 등록 전화번호
  userId: uuid('user_id').references(() => users.id), // 로그인 후 연결
  status: text('status').notNull().default('invited'), // invited | active
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// users(role=admin) + auth.users.email 조인 뷰 — 콘솔 관리자 검증에 사용.
// auth 스키마를 참조하므로 SQL 마이그레이션으로 직접 생성한다 (.existing()).
export const adminUsers = pgView('admin_users', {
  id: uuid('id').notNull(),
  email: text('email'),
  name: text('name'),
  role: text('role').notNull(),
  profileImageUrl: text('profile_image_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}).existing()

// 주차 (1주차 ~ 12주차, 주 테마)
export const weeks = pgTable('weeks', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  weekNo: integer('week_no').notNull().unique(),
  theme: text('theme').notNull(), // 예: 시원한 책
  subtitle: text('subtitle'), // 예: 같은 것을 다르게 느끼다, 감각·표현의 관점
})

// 수업 흐름 한 단계 (단계명 + 분)
export type FlowStep = { title: string; durationMin: number }
// 수업단계 시트: 도입 / 활동1~4 / 마무리 — lesson 안에 통째로 저장
export type LessonFlow = {
  intro: FlowStep | null
  activities: FlowStep[]
  wrapup: FlowStep | null
}
// 준비물 시트 한 품목
export type LessonPrep = { name: string; quantity: string }
// 미디어 시트 한 큐 (웹 재생 시 슬라이드 위에 얹음)
export type LessonMediaCue = {
  slideNo: number
  kind: 'youtube' | 'audio' | 'video'
  source: string // 유튜브=링크, 음악·영상=파일명
}

// 일차별 수업 — 입력 템플릿의 일차정보 시트와 1:1.
// 수업단계/준비물/미디어는 lesson의 순수 구성요소(주차 단위 통째 교체)라 jsonb로 흡수.
// 파일 컬럼은 파일명만 저장하며, 실제 R2 키는 lessons/w{주차}d{일차}/{파일명}로 조합한다.
export const lessons = pgTable('lessons', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  weekId: integer('week_id')
    .notNull()
    .references(() => weeks.id),
  dayIndex: smallint('day_index').notNull().default(1), // 일차 1~5 = 월~금
  category: text('category').notNull(), // 책놀이 | 미술 | 음악 | 신체 | 사회정서
  title: text('title').notNull(), // 차시명
  description: text('description'), // 수업 설명
  durationMin: integer('duration_min'), // 시간(분), 예: 80
  thumbnailFile: text('thumbnail_file'), // 예: w1d5.png
  lessonPdfFile: text('lesson_pdf_file'), // 예: w1d5_lesson.pdf (다운로드용)
  guidePdfFile: text('guide_pdf_file'), // 예: w1d5_guide.pdf (다운로드용)
  slideCount: integer('slide_count'), // 웹 재생용 슬라이드 장수 (인제스트 시 산출)
  flow: jsonb('flow').$type<LessonFlow>(), // 수업단계
  preps: jsonb('preps').$type<LessonPrep[]>().notNull().default([]), // 준비물
  media: jsonb('media').$type<LessonMediaCue[]>().notNull().default([]), // 미디어 큐
})
