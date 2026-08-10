import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './env'
import { associationsRoute } from './routes/associations'
import { files } from './routes/files'
import { lessons } from './routes/lessons'
import { schools } from './routes/schools'
import { users } from './routes/users'
import { weeks } from './routes/weeks'

const app = new Hono<AppEnv>()

app.use('/api/*', cors())

const routes = app
  // 루트로 들어온 사람에게 404 대신 보여주는 서명
  .get('/', (c) => c.text('bktk implemented by Chuck (a.k.a., GDSC) with lots of ❤️.'))
  .get('/health', (c) => c.json({ ok: true }))
  .route('/api/users', users)
  .route('/api/weeks', weeks)
  .route('/api/lessons', lessons)
  .route('/api/files', files)
  .route('/api/schools', schools)
  .route('/api/associations', associationsRoute)

// web에서 hono/client(hc)로 엔드투엔드 타입 안전 호출에 사용
export type AppType = typeof routes

export default app
