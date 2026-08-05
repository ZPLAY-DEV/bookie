import { queryOptions } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api } from './api'

const weekById = api.api.weeks[':id{[0-9]+}']

export type WeekDetail = InferResponseType<typeof weekById.$get, 200>
export type Lesson = WeekDetail['lessons'][number]

export type Me = InferResponseType<typeof api.api.users.me.$get, 200>

// 내 정보 + 승인 상태 + 소속 학교 목록. 호출 시 사전 등록 매칭(자동 승인)도 일어난다.
export const meQuery = queryOptions({
  queryKey: ['me'],
  queryFn: async () => {
    const res = await api.api.users.me.$get()
    if (res.status !== 200) throw new Error('내 정보를 불러오지 못했어요')
    return res.json()
  },
})

const lessonById = api.api.lessons[':id{[0-9]+}']

// 수업 플레이어용 단건 조회 (flow/preps/media 포함)
export function lessonQuery(id: number) {
  return queryOptions({
    queryKey: ['lessons', id],
    queryFn: async () => {
      const res = await lessonById.$get({ param: { id: String(id) } })
      if (res.status !== 200) throw new Error('수업 정보를 불러오지 못했어요')
      return res.json()
    },
  })
}

// 전체 커리큘럼용 — 모든 주차의 수업을 한 번에 (12주 × 5일 = 최대 60)
export const allLessonsQuery = queryOptions({
  queryKey: ['lessons', 'all'],
  queryFn: async () => {
    const res = await api.api.lessons.$get({ query: { pageSize: '100' } })
    if (!res.ok) throw new Error('수업 목록을 불러오지 못했어요')
    return res.json()
  },
})

export const weeksQuery = queryOptions({
  queryKey: ['weeks'],
  queryFn: async () => {
    const res = await api.api.weeks.$get({ query: { pageSize: '12' } })
    if (!res.ok) throw new Error('주차 목록을 불러오지 못했어요')
    return res.json()
  },
})

export function weekDetailQuery(id: number) {
  return queryOptions({
    queryKey: ['weeks', id],
    queryFn: async () => {
      const res = await weekById.$get({ param: { id: String(id) } })
      if (res.status !== 200) throw new Error('주차 정보를 불러오지 못했어요')
      return res.json()
    },
  })
}
