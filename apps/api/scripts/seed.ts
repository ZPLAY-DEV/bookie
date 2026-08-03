import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { lessonPreps, lessons, lessonSteps, materials, weeks } from '../src/db/schema.ts'

// 로컬 개발용 시드. 실행: pnpm db:seed (DATABASE_URL로 덮어쓰기 가능)
const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const client = postgres(databaseUrl, { prepare: false })
const db = drizzle(client)

const WEEK_THEMES: Array<{ theme: string; subtitle?: string }> = [
  { theme: '시원한 책', subtitle: '같은 것을 다르게 느끼다, 감각·표현의 관점' },
  { theme: '알록달록 색깔 여행' },
  { theme: '움직이는 그림자' },
  { theme: '소리로 그리는 그림' },
  { theme: '마음을 담는 상자' },
  { theme: '계절의 맛' },
  { theme: '우리 동네 탐험' },
  { theme: '반짝이는 밤하늘' },
  { theme: '몸으로 말해요' },
  { theme: '함께 만드는 이야기' },
  { theme: '고마운 손' },
  { theme: '나의 열두 달' },
]

type LessonSeed = {
  weekday: number
  category: string
  title: string
  description: string
  imageUrl: string
  steps: Array<[string, number]>
  preps: Array<[string, string]>
}

const WEEK1_LESSONS: LessonSeed[] = [
  {
    weekday: 1,
    category: '책놀이',
    title: '시원한 책, 같은 것을 다르게 느끼기',
    description:
      '같은 책도 읽는 사람마다 다르게 느껴요. 그림책을 함께 읽고 서로 다른 느낌을 나눠 봐요.',
    imageUrl: 'images/lessons/w1-mon.png',
    steps: [
      ['표지 보고 상상하기', 5],
      ['그림책 함께 읽기', 15],
      ['다르게 느낀 장면 나누기', 15],
      ['주말 미션카드', 5],
    ],
    preps: [
      ['그림책 『시원한 책』', '1권'],
      ['느낌 카드', '24매'],
    ],
  },
  {
    weekday: 2,
    category: '미술',
    title: '마음 온도! 색으로 느끼기',
    description:
      '차가운 색과 따뜻한 색을 알아보고, 오늘의 내 마음 온도를 색으로 표현해요.',
    imageUrl: 'images/lessons/w1-tue.png',
    steps: [
      ['색깔 온도 알아보기', 5],
      ['차가운 색, 따뜻한 색 분류', 15],
      ['내 마음 온도 그리기', 15],
      ['작품 소개하기', 5],
    ],
    preps: [
      ['색깔 카드', '24세트'],
      ['도화지·크레파스', '24인분'],
    ],
  },
  {
    weekday: 3,
    category: '음악',
    title: '소리 속의 리듬, 다른 소리가 모여',
    description: '서로 다른 소리가 모여 하나의 리듬이 되는 경험을 해요.',
    imageUrl: 'images/lessons/w1-wed.png',
    steps: [
      ['소리 탐색하기', 5],
      ['리듬 따라 치기', 15],
      ['서로 다른 소리 모으기', 15],
      ['함께 연주하기', 5],
    ],
    preps: [['리듬 악기 바구니', '6세트']],
  },
  {
    weekday: 4,
    category: '신체',
    title: '속이 뻥! 시원한 몸',
    description: '크게 움직이고 시원하게 뻗으며 몸과 마음의 긴장을 풀어요.',
    imageUrl: 'images/lessons/w1-thu.png',
    steps: [
      ['준비 운동', 5],
      ['시원하게 뻗기 놀이', 15],
      ['몸으로 표현하기', 15],
      ['정리 운동', 5],
    ],
    preps: [['콘·매트', '6세트']],
  },
  {
    weekday: 5,
    category: '사회정서',
    title: '시원한 말, 따듯한 말',
    description:
      "'속 시원하다'는 말, 항상 좋은 말일까요? 말 카드로 말의 온도를 배우고 말 전하기 판으로 마음이 닿는 말을 연습해요.",
    imageUrl: 'images/lessons/w1-fri.png',
    steps: [
      ["'속 시원하다'는 어떤 말?", 5],
      ['시원한 말, 따듯한 말 카드 분류', 15],
      ['말 전하기 판 놀이', 15],
      ['주말 미션카드', 5],
    ],
    preps: [
      ['시원한 말, 따듯한 말 카드', '24세트'],
      ['주말 미션카드', '24매'],
      ['말 전하기 판(문장 카드)', '6세트'],
    ],
  },
]

const WEEKDAY_SLUGS = ['mon', 'tue', 'wed', 'thu', 'fri']

async function seed() {
  // 재실행 가능하도록 FK 역순으로 비운다
  await db.delete(materials)
  await db.delete(lessonPreps)
  await db.delete(lessonSteps)
  await db.delete(lessons)
  await db.delete(weeks)

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

  for (const l of WEEK1_LESSONS) {
    const [lesson] = await db
      .insert(lessons)
      .values({
        weekId: week1.id,
        weekday: l.weekday,
        category: l.category,
        title: l.title,
        description: l.description,
        imageUrl: l.imageUrl,
        durationMin: 40,
      })
      .returning()

    await db.insert(lessonSteps).values(
      l.steps.map(([title, durationMin], i) => ({
        lessonId: lesson.id,
        sortOrder: i + 1,
        title,
        durationMin,
      })),
    )
    await db.insert(lessonPreps).values(
      l.preps.map(([name, quantity]) => ({ lessonId: lesson.id, name, quantity })),
    )

    const slug = WEEKDAY_SLUGS[l.weekday - 1]
    await db.insert(materials).values([
      {
        lessonId: lesson.id,
        kind: 'guide',
        fileName: `1주차_${slug}_지도안.pdf`,
        storagePath: `materials/w1/${slug}/guide.pdf`,
      },
      {
        lessonId: lesson.id,
        kind: 'resource',
        fileName: `1주차_${slug}_수업자료.zip`,
        storagePath: `materials/w1/${slug}/resource.zip`,
      },
    ])
  }

  console.log(
    `seeded: ${insertedWeeks.length} weeks, ${WEEK1_LESSONS.length} lessons`,
  )
}

seed()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => client.end())
