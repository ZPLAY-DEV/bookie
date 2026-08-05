import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { idParamSchema, listQuerySchema } from '../lib/query'
import { requireAdmin, requireAuth } from '../middleware/auth'
import {
  createAssociation,
  deleteAssociation,
  getAssociation,
  listAssociations,
  updateAssociation,
} from '../services/school.service'

const associationBaseSchema = z.object({
  schoolId: z.number().int().positive(),
  email: z.string().email().nullish(),
  phone: z.string().min(1).nullish(),
})

// 사전 등록: email/phone 중 하나는 필수 (refine이 붙으면 .partial() 불가라 분리)
const associationBodySchema = associationBaseSchema.refine(
  (v) => v.email || v.phone,
  { message: '이메일 또는 전화번호 중 하나는 필요합니다' },
)

const associationListSchema = listQuerySchema(
  ['id', 'schoolId', 'status'],
  'id',
).extend({
  schoolId: z.coerce.number().int().positive().optional(),
})

// 학교-강사 사전 등록/소속 관리 — 콘솔(관리자) 전용
export const associationsRoute = new Hono<AppEnv>()
  .use(requireAuth, requireAdmin)
  .get('/', zValidator('query', associationListSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await listAssociations(db, c.req.valid('query')))
  })
  .get('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const association = await getAssociation(db, c.req.valid('param').id)
    if (!association) return c.json({ error: 'Association not found' }, 404)
    return c.json(association)
  })
  .post('/', zValidator('json', associationBodySchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    return c.json(await createAssociation(db, c.req.valid('json')), 201)
  })
  .patch(
    '/:id{[0-9]+}',
    zValidator('param', idParamSchema),
    zValidator('json', associationBaseSchema.partial()),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const association = await updateAssociation(
        db,
        c.req.valid('param').id,
        c.req.valid('json'),
      )
      if (!association) return c.json({ error: 'Association not found' }, 404)
      return c.json(association)
    },
  )
  .delete('/:id{[0-9]+}', zValidator('param', idParamSchema), async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const association = await deleteAssociation(db, c.req.valid('param').id)
    if (!association) return c.json({ error: 'Association not found' }, 404)
    return c.json(association)
  })
