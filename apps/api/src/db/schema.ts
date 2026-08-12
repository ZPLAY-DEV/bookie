import {
  integer,
  jsonb,
  pgTable,
  pgView,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
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
  note: varchar('note', { length: 64 }), // 관리자용 메모
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// 학교
export const schools = pgTable('schools', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull(),
  image: text('image'), // full URL. 없으면 기본 학교 이미지로 표시
  neisCode: text('neis_code'), // 행정표준코드 (SD_SCHUL_CODE)
  office: text('office'), // 교육청 (ATPT_OFCDC_SC_NM)
  location: text('location'), // 시도명 (LCTN_SC_NM)
  schoolType: text('school_type'), // 설립명 (FOND_SC_NM)
  zip: text('zip'), // 우편번호 (ORG_RDNZC)
  address: text('address'), // 주소 (ORG_RDNMA + ORG_RDNDA)
  tel: text('tel'), // 전화번호 (ORG_TELNO)
  web: text('web'), // 홈페이지 (HMPG_ADRES)
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

// users + auth.users의 email·phone을 붙인 1:1 확장 뷰 — 콘솔 사용자 목록의
// 데이터 소스. 필터가 없으므로 users와 행 수가 같다 (LEFT JOIN — 이메일
// 미제공 계정도 남는다). 관리자 판정은 이 뷰가 아니라 users.role이 담당한다.
// auth 스키마를 참조하므로 SQL 마이그레이션으로 직접 생성한다 (.existing()).
export const adminUsers = pgView('admin_users', {
  id: uuid('id').notNull(),
  name: text('name'),
  role: text('role').notNull(),
  profileImageUrl: text('profile_image_url'),
  socialUserId: text('social_user_id'),
  note: varchar('note', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  email: text('email'),
  phone: text('phone'),
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
// 수업 재생목록 한 항목 — 이미지·유튜브·음악을 순서대로 섞어 구성한다.
// value는 https:// 로 시작하는 전체 URL만 허용한다.
// 전환 간격(초)은 저장하지 않는다 — 플레이어에서 사용자가 조절 (기본 5초)
export type LessonMediaItem = {
  index: number
  type: 'image' | 'youtube' | 'music' | 'video'
  value: string
}

// 일차별 수업 — 입력 템플릿의 일차정보 시트와 1:1.
// 수업단계/준비물/미디어는 lesson의 순수 구성요소(주차 단위 통째 교체)라 jsonb로 흡수.
// 파일 컬럼은 파일명만 저장하며, 실제 R2 키는 lessons/w{주차}d{일차}/{파일명}로 조합한다.
export const lessons = pgTable('lessons', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  weekId: integer('week_id')
    .notNull()
    .references(() => weeks.id),
  weekIndex: smallint('week_index').notNull().default(1), // 주차 (weeks.week_no 비정규화 — 슬라이드 경로 w{주차}d{일차} 구성용)
  dayIndex: smallint('day_index').notNull().default(1), // 일차 1~5 = 월~금
  category: text('category').notNull(), // 책톡 | 그림톡 | 소리톡 | 몸톡 | 마음톡
  title: text('title').notNull(), // 차시명
  description: text('description'), // 수업 설명
  durationMin: integer('duration_min'), // 시간(분), 예: 80
  image: text('image'), // full URL 예: https://cdn.bktk.kr/lessons/w1d5/w1d5.png
  lessonDownload: text('lesson_download'), // full URL (수업자료 다운로드)
  guideDownload: text('guide_download'), // full URL (지도안 다운로드)
  slideCount: integer('slide_count'), // 웹 재생용 슬라이드 장수 (인제스트 시 산출)
  flow: jsonb('flow').$type<LessonFlow>(), // 수업단계
  preps: jsonb('preps').$type<LessonPrep[]>().notNull().default([]), // 준비물
  media: jsonb('media').$type<LessonMediaItem[]>().notNull().default([]), // 재생목록
})
