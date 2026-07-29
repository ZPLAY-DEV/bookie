import { Hono } from 'hono'
import { createDb } from '../db'
import type { AppEnv } from '../env'
import { getDownloadUrl, getMaterial } from '../services/material.service'

export const materials = new Hono<AppEnv>().get(
  '/:id{[0-9]+}/download-url',
  async (c) => {
    const db = createDb(c.env.DATABASE_URL)
    const material = await getMaterial(db, Number(c.req.param('id')))
    if (!material) return c.json({ error: 'Material not found' }, 404)
    return c.json({ url: await getDownloadUrl(material) })
  },
)
