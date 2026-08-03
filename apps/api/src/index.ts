import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './env'
import { files } from './routes/files'
import { lessons } from './routes/lessons'
import { materials } from './routes/materials'
import { users } from './routes/users'
import { weeks } from './routes/weeks'

const app = new Hono<AppEnv>()

app.use('/api/*', cors())

const routes = app
  .get('/health', (c) => c.json({ ok: true }))
  .route('/api/users', users)
  .route('/api/weeks', weeks)
  .route('/api/lessons', lessons)
  .route('/api/materials', materials)
  .route('/api/files', files)

// web에서 hono/client(hc)로 엔드투엔드 타입 안전 호출에 사용
export type AppType = typeof routes

export default app
