import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { idParamSchema, isForeignKeyViolation, listQuerySchema } from '../lib/query'
import { requireAuth } from '../middleware/auth'
import {
  createLesson,
  deleteLesson,
  getLessonDetail,
  listLessons,
  updateLesson,
} from '../services/lesson.service'

const lessonBodySchema = z.object({
  weekId: z.number().int().positive(),
  weekday: z.number().int().min(1).max(5),
  category: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullish(),
  imageUrl: z.string().nullish(),
  durationMin: z.number().int().positive().nullish(),
})

const lessonListSchema = listQuerySchema(['id', 'weekId', 'weekday'], 'weekId').extend({
  weekId: z.coerce.number().int().positive().optional(),
})

export const lessons = new Hono<AppEnv>()
  .get('/', zValidator('query', lessonListSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await listLessons(db, c.req.valid('query')))
  })
  .get('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const lesson = await getLessonDetail(db, c.req.valid('param').id)
    if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
    return c.json(lesson)
  })
  .post('/', requireAuth, zValidator('json', lessonBodySchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await createLesson(db, c.req.valid('json')), 201)
  })
  .patch(
    '/:id{[0-9]+}',
    requireAuth,
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
    zValidator('param', idParamSchema),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      try {
        const lesson = await deleteLesson(db, c.req.valid('param').id)
        if (!lesson) return c.json({ error: 'Lesson not found' }, 404)
        return c.json(lesson)
      } catch (err) {
        if (isForeignKeyViolation(err)) {
          return c.json(
            { error: '흐름/준비물/자료가 남아 있는 수업은 삭제할 수 없습니다' },
            409,
          )
        }
        throw err
      }
    },
  )
