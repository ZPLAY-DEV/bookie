import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import {
  associations,
  lessons,
  schools,
  users,
  weeks,
  type LessonFlow,
  type LessonMediaCue,
  type LessonPrep,
} from '../src/db/schema.ts'

// 로컬 개발용 시드. 실행: pnpm db:seed (DATABASE_URL로 덮어쓰기 가능)
// 콘텐츠 데이터 출처: 북키톡키 콘텐츠 입력 템플릿 v5 (구글 시트) — 1주차 확정 데이터
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const client = postgres(databaseUrl, { prepare: false })
const db = drizzle(client)

// 주차정보 시트 — 1주차만 확정, 2~12주차는 콘텐츠팀 전달 대기
const WEEK_THEMES: Array<{ theme: string; subtitle?: string }> = [
  { theme: '시원한 책', subtitle: '같은 것을 다르게 느낀다' },
  { theme: '2주차 (준비 중)' },
  { theme: '3주차 (준비 중)' },
  { theme: '4주차 (준비 중)' },
  { theme: '5주차 (준비 중)' },
  { theme: '6주차 (준비 중)' },
  { theme: '7주차 (준비 중)' },
  { theme: '8주차 (준비 중)' },
  { theme: '9주차 (준비 중)' },
  { theme: '10주차 (준비 중)' },
  { theme: '11주차 (준비 중)' },
  { theme: '12주차 (준비 중)' },
]

type LessonSeed = {
  dayIndex: number
  category: string
  title: string
  description: string
  durationMin: number
  flow: LessonFlow
  preps: LessonPrep[]
  media: LessonMediaCue[]
}

// 일차정보 + 수업단계 + 준비물 + 미디어 시트의 1주차 실데이터
const WEEK1_LESSONS: LessonSeed[] = [
  {
    dayIndex: 1,
    category: '책놀이',
    title: '『시원한 책』 같은 것을 다르게 느낀다',
    description:
      '같은 매운탕을 두고 아빠는 "시원하다~", 아이는 갸우뚱! 그림카드를 몸/마음 보드에 분류하고 투표 놀이로 서로의 느낌을 비교합니다.',
    durationMin: 80,
    flow: {
      intro: { title: '아빠는 왜 "시원하다"고 할까?', durationMin: 5 },
      activities: [
        { title: '『시원한 책』 함께 읽기', durationMin: 15 },
        { title: '몸/마음 분류 & 투표 놀이', durationMin: 15 },
      ],
      wrapup: { title: '느낌은 저마다 달라요', durationMin: 5 },
    },
    preps: [
      { name: '그림책 『시원한 책』 실물', quantity: '1권' },
      { name: '그림카드 세트', quantity: '모둠당 1세트' },
      { name: '몸/마음 분류보드', quantity: '1개' },
      { name: '투표용 세트', quantity: '24인용' },
    ],
    media: [],
  },
  {
    dayIndex: 2,
    category: '미술',
    title: '마음 온도! 색으로 느끼기',
    description:
      '어제 읽은 『시원한 책』의 느낌을 색으로 옮겨요. 쿨톤·웜톤 색카드로 마음의 온도를 나누고 컬러칩으로 내 마음 온도를 찾습니다.',
    durationMin: 80,
    flow: {
      intro: { title: '마음에도 온도가 있을까?', durationMin: 5 },
      activities: [
        { title: '쿨톤·웜톤 색카드 놀이', durationMin: 15 },
        { title: '컬러칩으로 내 마음 온도 만들기', durationMin: 15 },
      ],
      wrapup: { title: '색깔 보자기 감상회', durationMin: 5 },
    },
    preps: [
      { name: '쿨톤·웜톤 색카드', quantity: '24세트' },
      { name: '모둠용 컬러칩', quantity: '6세트' },
      { name: '모둠 거울', quantity: '6개' },
      { name: '쿨톤·웜톤 색깔 보자기', quantity: '2장' },
    ],
    media: [],
  },
  {
    dayIndex: 3,
    category: '음악',
    title: '소리 속의 리듬 — 다른 소리가 모여',
    description:
      '시원한 소리 음원을 듣고, 손뼉·발구르기로 소리를 리듬으로 바꾼 뒤 분단 리듬 표시판을 보며 다 함께 합주합니다.',
    durationMin: 80,
    flow: {
      intro: { title: '시원한 소리 듣기', durationMin: 5 },
      activities: [
        { title: '소리·리듬 카드 놀이', durationMin: 15 },
        { title: '몸으로 리듬치기', durationMin: 15 },
      ],
      wrapup: { title: '다른 소리가 모여 — 분단 합주', durationMin: 5 },
    },
    preps: [
      { name: '소리·리듬 카드', quantity: '6세트' },
      { name: '분단 리듬 표시판', quantity: '4개' },
      { name: '블루투스 스피커 연결', quantity: '1대' },
    ],
    media: [{ slideNo: 5, kind: 'audio', source: 'w1d3_audio1.mp3' }],
  },
  {
    dayIndex: 4,
    category: '신체',
    title: '속이 뻥! 시원한 몸',
    description:
      '방귀 이야기로 웃으며 열고 복식호흡을 배워요. 체조 동작 카드를 따라 매트 위에서 몸을 풀며 시원함을 몸으로 느낍니다.',
    durationMin: 80,
    flow: {
      intro: { title: '방귀 이야기로 열기', durationMin: 5 },
      activities: [
        { title: '복식호흡 배우기', durationMin: 10 },
        { title: '속이 뻥! 시원한 몸 체조', durationMin: 20 },
      ],
      wrapup: { title: '숨 고르기', durationMin: 5 },
    },
    preps: [
      { name: '시원한 몸 체조 동작 카드', quantity: '1세트' },
      { name: '개인 매트', quantity: '24개' },
    ],
    media: [
      {
        slideNo: 2,
        kind: 'youtube',
        source:
          'https://www.youtube.com/watch?v=K7nRz4Ka_KM&list=RDK7nRz4Ka_KM&start_radio=1',
      },
    ],
  },
  {
    dayIndex: 5,
    category: '사회정서',
    title: '시원한 말, 따뜻한 말',
    description:
      '"속 시원하다!"는 말, 항상 좋은 말일까요? 말 카드로 말의 온도를 배우고 말 전하기 판으로 마음이 닿는 말을 연습해요.',
    durationMin: 80,
    flow: {
      intro: { title: '"속 시원하다!"는 어떤 말?', durationMin: 5 },
      activities: [
        { title: '시원한 말·따뜻한 말 카드 분류', durationMin: 15 },
        { title: '말 전하기 판 놀이', durationMin: 15 },
      ],
      wrapup: { title: '주말 미션카드', durationMin: 5 },
    },
    preps: [
      { name: '시원한 말·따뜻한 말 카드', quantity: '24세트' },
      { name: '말 전하기 판 (문장 카드)', quantity: '6세트' },
      { name: '주말 미션카드', quantity: '24매' },
    ],
    media: [],
  },
]

async function seed() {
  // 재실행 가능하도록 FK 역순으로 비운다
  await db.delete(lessons)
  await db.delete(weeks)
  await db.delete(associations)
  await db.delete(schools)

  const insertedWeeks = await db
    .insert(weeks)
    .values(
      WEEK_THEMES.map((w, i) => ({
        weekNo: i + 1,
        theme: w.theme,
        subtitle: w.subtitle ?? null,
      })),
    )
    .returning()

  const week1 = insertedWeeks.find((w) => w.weekNo === 1)
  if (!week1) throw new Error('week 1 not inserted')

  await db.insert(lessons).values(
    WEEK1_LESSONS.map((l) => ({
      weekId: week1.id,
      dayIndex: l.dayIndex,
      category: l.category,
      title: l.title,
      description: l.description,
      durationMin: l.durationMin,
      // 파일명 규칙: w{주차}d{일차}.png / _lesson.pdf / _guide.pdf
      thumbnailFile: `w1d${l.dayIndex}.png`,
      lessonPdfFile: `w1d${l.dayIndex}_lesson.pdf`,
      guidePdfFile: `w1d${l.dayIndex}_guide.pdf`,
      flow: l.flow,
      preps: l.preps,
      media: l.media,
    })),
  )

  console.log(
    `seeded: ${insertedWeeks.length} weeks, ${WEEK1_LESSONS.length} lessons (시트 1주차 실데이터)`,
  )

  // 관리자 사용자 — 로컬 auth 계정과 매핑해 role=admin 부여
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'a@gmail.com'
  const [authUser] =
    await client`select id from auth.users where email = ${ADMIN_EMAIL}`
  if (authUser) {
    await db
      .insert(users)
      .values({ id: authUser.id, name: '관리자', role: 'admin' })
      .onConflictDoUpdate({ target: users.id, set: { role: 'admin' } })
    console.log(`admin linked: ${ADMIN_EMAIL}`)
  } else {
    console.warn(
      `auth user ${ADMIN_EMAIL} 없음 — Studio(Authentication)에서 계정 생성 후 pnpm db:seed 재실행`,
    )
  }

  // 학교 + 강사 사전 등록 데모 — 같은 이메일이 두 학교에 소속되어
  // 로그인 시 학교 선택 화면이 뜨는 케이스를 재현한다
  const TEACHER_EMAIL = 'jinseokoh@kakao.com'
  const insertedSchools = await db
    .insert(schools)
    .values([{ name: '늘봄초등학교' }, { name: '햇살유치원' }])
    .returning()
  await db.insert(associations).values(
    insertedSchools.map((school) => ({
      schoolId: school.id,
      email: TEACHER_EMAIL,
    })),
  )
  console.log(
    `seeded: ${insertedSchools.length} schools, 사전등록(${TEACHER_EMAIL}) 완료`,
  )
}

seed()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => client.end())
