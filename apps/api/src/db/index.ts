import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Workers에서는 요청마다 생성한다. Supabase transaction pooler(포트 6543)를
// 사용하므로 prepared statement는 비활성화해야 한다.
export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false })
  return drizzle(client, { schema })
}

export type Database = ReturnType<typeof createDb>
