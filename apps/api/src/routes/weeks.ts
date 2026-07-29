import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { idParamSchema, isForeignKeyViolation, listQuerySchema } from '../lib/query'
import { requireAuth } from '../middleware/auth'
import {
  createWeek,
  deleteWeek,
  getWeekWithLessons,
  listWeeks,
  updateWeek,
} from '../services/lesson.service'

const weekBodySchema = z.object({
  weekNo: z.number().int().min(1),
  theme: z.string().min(1),
  subtitle: z.string().nullish(),
})

export const weeks = new Hono<AppEnv>()
  .get(
    '/',
    zValidator('query', listQuerySchema(['id', 'weekNo', 'theme'], 'weekNo')),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      return c.json(await listWeeks(db, c.req.valid('query')))
    },
  )
  .get('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const week = await getWeekWithLessons(db, c.req.valid('param').id)
    if (!week) return c.json({ error: 'Week not found' }, 404)
    return c.json(week)
  })
  .post('/', requireAuth, zValidator('json', weekBodySchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await createWeek(db, c.req.valid('json')), 201)
  })
  .patch(
    '/:id{[0-9]+}',
    requireAuth,
    zValidator('param', idParamSchema),
    zValidator('json', weekBodySchema.partial()),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const week = await updateWeek(db, c.req.valid('param').id, c.req.valid('json'))
      if (!week) return c.json({ error: 'Week not found' }, 404)
      return c.json(week)
    },
  )
  .delete(
    '/:id{[0-9]+}',
    requireAuth,
    zValidator('param', idParamSchema),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      try {
        const week = await deleteWeek(db, c.req.valid('param').id)
        if (!week) return c.json({ error: 'Week not found' }, 404)
        return c.json(week)
      } catch (err) {
        if (isForeignKeyViolation(err)) {
          return c.json({ error: '소속 수업이 있는 주차는 삭제할 수 없습니다' }, 409)
        }
        throw err
      }
    },
  )
