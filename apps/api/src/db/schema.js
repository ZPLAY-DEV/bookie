import { integer, pgTable, pgView, smallint, text, timestamp, uuid, } from 'drizzle-orm/pg-core';
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
});
// 학교
export const schools = pgTable('schools', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
        .defaultNow()
        .notNull(),
});
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
});
// users(role=admin) + auth.users.email 조인 뷰 — 콘솔 관리자 검증에 사용.
// auth 스키마를 참조하므로 SQL 마이그레이션으로 직접 생성한다 (.existing()).
export const adminUsers = pgView('admin_users', {
    id: uuid('id').notNull(),
    email: text('email'),
    name: text('name'),
    role: text('role').notNull(),
    profileImageUrl: text('profile_image_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
}).existing();
// 주차 (1주차 ~ 12주차, 주 테마)
export const weeks = pgTable('weeks', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    weekNo: integer('week_no').notNull().unique(),
    theme: text('theme').notNull(), // 예: 시원한 책
    subtitle: text('subtitle'), // 예: 같은 것을 다르게 느끼다, 감각·표현의 관점
});
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
});
// 수업 흐름 (단계별 제목 + 소요 시간)
export const lessonSteps = pgTable('lesson_steps', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    lessonId: integer('lesson_id')
        .notNull()
        .references(() => lessons.id),
    sortOrder: integer('sort_order').notNull(),
    title: text('title').notNull(), // 예: 말 전하기 판 놀이
    durationMin: integer('duration_min').notNull(),
});
// 수업 전 준비물
export const lessonPreps = pgTable('lesson_preps', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    lessonId: integer('lesson_id')
        .notNull()
        .references(() => lessons.id),
    name: text('name').notNull(), // 예: 시원한 말, 따듯한 말 카드
    quantity: text('quantity'), // 예: 24세트
});
// 다운로드 자료 (지도안, 수업자료)
export const materials = pgTable('materials', {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    lessonId: integer('lesson_id')
        .notNull()
        .references(() => lessons.id),
    kind: text('kind').notNull(), // guide(지도안) | resource(수업자료)
    fileName: text('file_name').notNull(),
    storagePath: text('storage_path').notNull(), // R2(media 버킷) 오브젝트 키
});
