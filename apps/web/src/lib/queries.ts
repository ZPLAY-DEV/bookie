import { queryOptions } from '@tanstack/react-query'
import type { InferResponseType } from 'hono/client'
import { api } from './api'

const weekById = api.api.weeks[':id{[0-9]+}']
const lessonById = api.api.lessons[':id{[0-9]+}']

export type WeekDetail = InferResponseType<typeof weekById.$get, 200>
export type Lesson = WeekDetail['lessons'][number]
export type LessonDetail = InferResponseType<typeof lessonById.$get, 200>

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

export function lessonDetailQuery(id: number) {
  return queryOptions({
    queryKey: ['lessons', id],
    queryFn: async () => {
      const res = await lessonById.$get({ param: { id: String(id) } })
      if (res.status !== 200) throw new Error('수업 정보를 불러오지 못했어요')
      return res.json()
    },
  })
}
