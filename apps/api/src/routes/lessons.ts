import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { idParamSchema, listQuerySchema } from '../lib/query'
import { requireAdmin, requireAuth, requireMember } from '../middleware/auth'
import {
  createLesson,
  deleteLesson,
  getLessonDetail,
  listLessons,
  updateLesson,
} from '../services/lesson.service'

const flowStepSchema = z.object({
  title: z.string().min(1),
  durationMin: z.number().int().positive(),
})

const lessonBodySchema = z.object({
  weekId: z.number().int().positive(),
  dayIndex: z.number().int().min(1).max(5),
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  durationMin: z.number().int().positive().nullish(),
  thumbnailFile: z.string().url().startsWith('https://').nullish(),
  lessonPdfFile: z.string().url().startsWith('https://').nullish(),
  guidePdfFile: z.string().url().startsWith('https://').nullish(),
  slideCount: z.number().int().min(0).nullish(),
  // 수업단계: 도입/마무리는 없을 수 있고 활동은 최대 4개 (입력 템플릿 규칙)
  flow: z
    .object({
      intro: flowStepSchema.nullable(),
      activities: z.array(flowStepSchema).max(4),
      wrapup: flowStepSchema.nullable(),
    })
    .nullish(),
  preps: z.array(z.object({ name: z.string().min(1), quantity: z.string() })).optional(),
  // 재생목록: 이미지(duration=초)·유튜브·음악(duration=null)을 순서대로 혼합
  media: z
    .array(
      z.object({
        index: z.number().int().positive(),
        type: z.enum(['image', 'youtube', 'music']),
        // 이미지·음악·유튜브 모두 https:// 전체 URL만 허용
        value: z.string().url().startsWith('https://'),
        duration: z.number().int().positive().nullable(),
      }),
    )
    .optional(),
})

const lessonListSchema = listQuerySchema(['id', 'weekId', 'dayIndex'], 'weekId').extend({
  weekId: z.coerce.number().int().positive().optional(),
})

export const lessons = new Hono<AppEnv>()
  .get('/', requireAuth, requireMember, zValidator('query', lessonListSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await listLessons(db, c.req.valid('query')))
  })
  .get('/:id{[0-9]+}', requireAuth, requireMember, zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const lesson = await getLessonDetail(db, c.req.valid('param').id)
    if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
    return c.json(lesson)
  })
  .post('/', requireAuth, requireAdmin, zValidator('json', lessonBodySchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await createLesson(db, c.req.valid('json')), 201)
  })
  .patch(
    '/:id{[0-9]+}',
    requireAuth,
    requireAdmin,
    zValidator('param', idParamSchema),
    zValidator('json', lessonBodySchema.partial()),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const lesson = await updateLesson(
        db,
        c.req.valid('param').id,
        c.req.valid('json'),
      )
      if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
      return c.json(lesson)
    },
  )
  .delete(
    '/:id{[0-9]+}',
    requireAuth,
    requireAdmin,
    zValidator('param', idParamSchema),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const lesson = await deleteLesson(db, c.req.valid('param').id)
      if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
      return c.json(lesson)
    },
  )
