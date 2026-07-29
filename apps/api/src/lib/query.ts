import { z } from 'zod'

// Refine 목록 쿼리 공통 파라미터 (?page=&pageSize=&sortField=&sortOrder=)
export function listQuerySchema<const F extends readonly [string, ...string[]]>(
  sortFields: F,
  defaultSortField: F[number],
) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
    sortField: z.enum(sortFields).default(defaultSortField),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
}

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() })

// FK 제약 위반(23503) 여부 — 자식 행이 있는 리소스 삭제 시 409로 변환하는 데 사용
export function isForeignKeyViolation(err: unknown): boolean {
  return (
    err instanceof Error &&
    'cause' in err &&
    typeof err.cause === 'object' &&
    err.cause !== null &&
    'code' in err.cause &&
    err.cause.code === '23503'
  )
}
