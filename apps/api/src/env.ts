export type AppBindings = {
  DATABASE_URL: string
  SUPABASE_URL: string
  SUPABASE_JWT_SECRET: string
}

export type AuthUser = {
  id: string
  email?: string
}

export type AppEnv = {
  Bindings: AppBindings
  Variables: {
    user: AuthUser
  }
}
