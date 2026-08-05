import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { associationsRoute } from './routes/associations';
import { files } from './routes/files';
import { lessons } from './routes/lessons';
import { schools } from './routes/schools';
import { materials } from './routes/materials';
import { users } from './routes/users';
import { weeks } from './routes/weeks';
const app = new Hono();
app.use('/api/*', cors());
const routes = app
    .get('/health', (c) => c.json({ ok: true }))
    .route('/api/users', users)
    .route('/api/weeks', weeks)
    .route('/api/lessons', lessons)
    .route('/api/materials', materials)
    .route('/api/files', files)
    .route('/api/schools', schools)
    .route('/api/associations', associationsRoute);
export default app;
