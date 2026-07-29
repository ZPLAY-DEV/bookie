import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // drizzle-kit은 .dev.vars를 읽지 않으므로 셸에서 주입한다:
    // DATABASE_URL=... pnpm db:generate / db:migrate
    url: process.env.DATABASE_URL!,
  },
})
