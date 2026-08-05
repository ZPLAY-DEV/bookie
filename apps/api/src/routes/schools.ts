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
  image: z.string().url().startsWith('https://').nullish(),
  neisCode: z.string().nullish(),
  office: z.string().nullish(),
  location: z.string().nullish(),
  schoolType: z.string().nullish(),
  zip: z.string().nullish(),
  address: z.string().nullish(),
  tel: z.string().nullish(),
  web: z.string().nullish(),
})

// NEIS 학교정보 응답 행 (open.neis.go.kr/hub/schoolInfo)
type NeisSchoolRow = {
  SD_SCHUL_CODE: string
  SCHUL_NM: string
  SCHUL_KND_SC_NM: string
  ATPT_OFCDC_SC_NM: string
  LCTN_SC_NM: string | null
  FOND_SC_NM: string | null
  ORG_RDNZC: string | null
  ORG_RDNMA: string | null
  ORG_RDNDA: string | null
  ORG_TELNO: string | null
  HMPG_ADRES: string | null
}

// 학교 관리 — 콘솔(관리자) 전용
export const schools = new Hono<AppEnv>()
  .use(requireAuth, requireAdmin)
  // NEIS 공공 API로 초등학교 검색 — 콘솔 학교 등록 자동완성용
  .get(
    '/neis',
    zValidator('query', z.object({ q: z.string().min(1) })),
    async (c) => {
      const { q } = c.req.valid('query')
      const url =
        `https://open.neis.go.kr/hub/schoolInfo` +
        `?KEY=${c.env.NEIS_API_KEY}` +
        `&Type=json&pIndex=1&pSize=30` +
        `&SCHUL_NM=${encodeURIComponent(q)}`
      const res = await fetch(url)
      if (!res.ok) return c.json({ error: 'NEIS 조회에 실패했습니다' }, 502)
      const json = (await res.json()) as {
        schoolInfo?: [unknown, { row?: NeisSchoolRow[] }]
      }
      const rows = json.schoolInfo?.[1]?.row ?? []
      return c.json(
        rows
          .filter((s) => s.SCHUL_KND_SC_NM === '초등학교')
          .map((s) => ({
            code: s.SD_SCHUL_CODE,
            name: s.SCHUL_NM,
            office: s.ATPT_OFCDC_SC_NM,
            location: s.LCTN_SC_NM ?? null,
            schoolType: s.FOND_SC_NM ?? null,
            zip: s.ORG_RDNZC?.trim() || null,
            address:
              [s.ORG_RDNMA, s.ORG_RDNDA]
                .map((part) => part?.trim())
                .filter(Boolean)
                .join(' ') || null,
            tel: s.ORG_TELNO?.trim() || null,
            web: s.HMPG_ADRES?.trim() || null,
          })),
      )
    },
  )
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
