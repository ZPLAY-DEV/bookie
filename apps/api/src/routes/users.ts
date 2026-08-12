import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { listQuerySchema } from '../lib/query'
import { requireAdmin, requireAuth } from '../middleware/auth'
import {
  USER_ROLES,
  claimAssociations,
  getAdminUser,
  getUser,
  joinDefaultSchool,
  listUserAssociations,
  listUsers,
  updateUser,
} from '../services/user.service'

const userListQuerySchema = listQuerySchema(
  ['createdAt', 'name', 'role'],
  'createdAt',
).extend({ role: z.enum(USER_ROLES).optional() })

export const users = new Hono<AppEnv>()
  // 사전 등록이 없는 사용자가 확인을 거쳐 기본 학교(제트초등학교)로 합류
  .post('/me/join-default-school', requireAuth, async (c) => {
    const authUser = c.get('user')
    const db = createDb(c.env.DATABASE_URL)
    const associations = await joinDefaultSchool(
      db,
      authUser.id,
      authUser.email,
      authUser.phone,
    )
    return c.json({ associations })
  })
  .get('/me', requireAuth, async (c) => {
  const authUser = c.get('user')
  const db = createDb(c.env.DATABASE_URL)

  // 사전 등록(associations) 매칭 — 승인 후에 매니저가 추가 등록한 학교도
  // 다음 방문 때 연결되도록 매번 시도한다 (매칭 없으면 no-op)
  await claimAssociations(db, authUser.id, authUser.email, authUser.phone)

  const [user, associations] = await Promise.all([
    getUser(db, authUser.id),
    listUserAssociations(db, authUser.id),
  ])
  return c.json({
    ...authUser,
    user,
    isAdmin: user?.role === 'admin',
    isApproved: user?.role === 'teacher' || user?.role === 'admin',
    // 이메일 미제공 계정은 웹 앱이 게이트 화면으로 막는다 (승인 판단 불가)
    hasEmail: Boolean(authUser.email),
    associations,
  })
})
  // --- 콘솔(관리자) 전용 ---
  .get(
    '/',
    requireAuth,
    requireAdmin,
    zValidator('query', userListQuerySchema),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      return c.json(await listUsers(db, c.req.valid('query')))
    },
  )
  .get(
    '/:id',
    requireAuth,
    requireAdmin,
    zValidator('param', z.object({ id: z.uuid() })),
    async (c) => {
      const db = createDb(c.env.DATABASE_URL)
      const user = await getAdminUser(db, c.req.valid('param').id)
      if (!user) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
      return c.json(user)
    },
  )
  .patch(
    '/:id',
    requireAuth,
    requireAdmin,
    zValidator('param', z.object({ id: z.uuid() })),
    zValidator(
      'json',
      z.object({
        role: z.enum(USER_ROLES).optional(),
        note: z.string().max(64).nullable().optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param')
      const { role, note } = c.req.valid('json')
      const db = createDb(c.env.DATABASE_URL)
      // 관리자가 스스로를 강등해 콘솔에서 잠기는 사고를 막는다. 수정 폼은 role을
      // 항상 함께 보내므로 "실제로 바뀔 때"만 막아야 자기 메모 수정이 가능하다.
      if (role !== undefined && id === c.get('user').id) {
        const current = await getUser(db, id)
        if (current && current.role !== role) {
          return c.json({ error: '자신의 권한은 변경할 수 없습니다' }, 400)
        }
      }
      const user = await updateUser(db, id, {
        ...(role !== undefined && { role }),
        // 빈 문자열로 비운 메모는 null로 저장
        ...(note !== undefined && { note: note?.trim() || null }),
      })
      if (!user) return c.json({ error: '사용자를 찾을 수 없습니다' }, 404)
      return c.json(user)
    },
  )
