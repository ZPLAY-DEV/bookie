import { useQuery } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'

import { AppSidebar } from '@/components/app-sidebar'
import { cn } from '@/lib/utils'
import { allLessonsQuery, weeksQuery } from '@/lib/queries'
import { CATEGORY_COLORS, DAY_CATEGORY, WEEKDAY_LABELS } from '@/lib/lesson-meta'

// 전체 커리큘럼 — 12주 × 5과목 격자. 셀을 누르면 해당 주차 대시보드로 이동
export function CurriculumPage() {
  const router = useRouter()
  const navigate = useNavigate()
  const { data: weeks } = useQuery(weeksQuery)
  const { data: lessons } = useQuery(allLessonsQuery)

  // weekId → dayIndex → 차시명
  const titleByWeekDay = new Map<number, Map<number, string>>()
  for (const lesson of lessons?.data ?? []) {
    if (!titleByWeekDay.has(lesson.weekId)) titleByWeekDay.set(lesson.weekId, new Map())
    titleByWeekDay.get(lesson.weekId)!.set(lesson.dayIndex, lesson.title)
  }

  const weekCount = weeks?.data.length ?? 12

  return (
    <div className="flex h-full">
      <AppSidebar curriculumActive />

        <main className="flex-1 overflow-y-auto px-12 py-9">
          <header className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => router.history.back()}
                title="뒤로"
                className="mt-1 rounded-full p-1.5 text-heading hover:bg-muted"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-6" />
              </button>
              <div>
                <h1 className="text-[26px] font-extrabold text-heading">전체 커리큘럼</h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {weekCount}주 x 5과목 = {weekCount * 5}차시
                </p>
              </div>
            </div>
            <img
              src="/images/avatar.png"
              alt="내 프로필"
              className="size-13 rounded-full object-cover"
            />
          </header>

          <div className="mt-7 overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="w-24 rounded-l-xl bg-sidebar-primary px-4 py-3.5 text-center font-bold text-white">
                    주차
                  </th>
                  {DAY_CATEGORY.map((category, i) => (
                    <th
                      key={category}
                      className={cn(
                        'px-4 py-3.5 text-center font-bold text-white',
                        i === DAY_CATEGORY.length - 1 && 'rounded-r-xl',
                      )}
                      style={{ backgroundColor: CATEGORY_COLORS[category] }}
                    >
                      {WEEKDAY_LABELS[i]}요일 {category}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weeks?.data.map((week) => (
                  <tr
                    key={week.id}
                    className="cursor-pointer transition-colors hover:bg-secondary/60"
                    onClick={() =>
                      navigate({
                        to: '/weeks/$weekNo',
                        params: { weekNo: String(week.weekNo) },
                      })
                    }
                  >
                    <td className="border-b px-4 py-5 text-center font-extrabold text-heading">
                      {week.weekNo}주차
                    </td>
                    {DAY_CATEGORY.map((_, i) => (
                      <td key={i} className="w-1/6 border-b px-5 py-5 font-semibold text-heading">
                        {titleByWeekDay.get(week.id)?.get(i + 1) ?? (
                          <span className="font-normal text-muted-foreground/60">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
    </div>
  )
}
