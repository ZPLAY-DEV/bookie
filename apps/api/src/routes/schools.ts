import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { idParamSchema, isForeignKeyViolation, listQuerySchema } from '../lib/query'
import { requireAdmin, requireAuth } from '../middleware/auth'
import {
  createSchool,
  deleteSchool,
  getSchool,
  listSchools,
  updateSchool,
} from '../services/school.service'

const schoolBodySchema = z.object({
  name: z.string().min(1),
})

// 학교 관리 — 콘솔(관리자) 전용
export const schools = new Hono<AppEnv>()
  .use(requireAuth, requireAdmin)
  .get(
    '/',
    zValidator('query', listQuerySchema(['id', 'name'], 'id')),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      return c.json(await listSchools(db, c.req.valid('query')))
    },
  )
  .get('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const school = await getSchool(db, c.req.valid('param').id)
    if (!school) return c.json({ error: 'School not found' }, 404)
    return c.json(school)
  })
  .post('/', zValidator('json', schoolBodySchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await createSchool(db, c.req.valid('json')), 201)
  })
  .patch(
    '/:id{[0-9]+}',
    zValidator('param', idParamSchema),
    zValidator('json', schoolBodySchema.partial()),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const school = await updateSchool(db, c.req.valid('param').id, c.req.valid('json'))
      if (!school) return c.json({ error: 'School not found' }, 404)
      return c.json(school)
    },
  )
  .delete('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    try {
      const school = await deleteSchool(db, c.req.valid('param').id)
      if (!school) return c.json({ error: 'School not found' }, 404)
      return c.json(school)
    } catch (err) {
      if (isForeignKeyViolation(err)) {
        return c.json({ error: '소속 강사가 있는 학교는 삭제할 수 없습니다' }, 409)
      }
      throw err
    }
  })
