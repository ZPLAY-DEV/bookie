import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { AppSidebar } from '@/components/app-sidebar'
import { allLessonsQuery, weeksQuery } from '@/lib/queries'
import { CATEGORY_COLORS, DAY_CATEGORY, WEEKDAY_LABELS } from '@/lib/lesson-meta'

// 전체 커리큘럼 — 12주 × 5과목 격자. 셀을 누르면 해당 주차 대시보드로 이동
export function CurriculumPage() {
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

        <main className="flex-1 overflow-y-auto p-8">
          <header className="flex items-start justify-between">
            <div>
              <h1 className="text-[30px] leading-[34px] font-extrabold text-heading">
                전체 커리큘럼
              </h1>
              <p className="mt-2 text-xs leading-[13px]">
                {weekCount}주 x 5과목 = {weekCount * 5}차시
              </p>
            </div>
            <img
              src="/images/avatar.png"
              alt="내 프로필"
              className="size-16 rounded-full object-cover"
            />
          </header>

          <table className="mt-4 w-full table-fixed border-separate border-spacing-0">
            <thead>
              <tr className="text-[18px] leading-5 font-extrabold text-white">
                {/* 주차 열머리는 과목색이 아닌 별도의 짙은 남보라 */}
                <th className="h-17 w-38 bg-[#2e2982]">주차</th>
                {DAY_CATEGORY.map((category, i) => (
                  <th
                    key={category}
                    className="h-17"
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
                  className="cursor-pointer bg-card transition-colors hover:bg-muted"
                  onClick={() =>
                    navigate({
                      to: '/weeks/$weekNo',
                      params: { weekNo: String(week.weekNo) },
                    })
                  }
                >
                  <td className="h-17 text-center text-[16px] leading-[18px] font-bold text-heading">
                    {week.weekNo}주차
                  </td>
                  {DAY_CATEGORY.map((_, i) => (
                    <td key={i} className="h-17 px-8 text-[16px] leading-[21px] text-heading">
                      {titleByWeekDay.get(week.id)?.get(i + 1) ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </main>
    </div>
  )
}
