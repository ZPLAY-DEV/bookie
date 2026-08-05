import type { R2Bucket } from '@cloudflare/workers-types'

export type AppBindings = {
  DATABASE_URL: string
  SUPABASE_URL: string
  SUPABASE_JWT_SECRET: string
  NEIS_API_KEY: string
  MEDIA: R2Bucket
}

export type AuthUser = {
  id: string
  email?: string
  phone?: string
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: {
    user: AuthUser
  }
}
