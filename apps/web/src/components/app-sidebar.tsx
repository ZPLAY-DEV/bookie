import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { meQuery, weeksQuery } from '@/lib/queries'

const SCHOOL_KEY = 'bookie-school-id'

// 주차 대시보드/전체 커리큘럼이 공유하는 좌측 사이드바.
// 데이터(weeks/me)는 React Query 캐시로 페이지와 공유된다.
export function AppSidebar({
  activeWeekNo,
  curriculumActive,
}: {
  activeWeekNo?: number
  curriculumActive?: boolean
}) {
  const navigate = useNavigate()
  const { data: weeks } = useQuery(weeksQuery)
  const { data: me } = useQuery(meQuery)
  const [schoolId, setSchoolId] = useState<number | null>(() => {
    const stored = localStorage.getItem(SCHOOL_KEY)
    return stored ? Number(stored) : null
  })

  const currentSchool =
    me?.associations.find((a) => a.schoolId === schoolId) ??
    (me?.associations.length === 1 ? me.associations[0] : undefined)

  function selectSchool(id: number) {
    localStorage.setItem(SCHOOL_KEY, String(id))
    setSchoolId(id)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  return (
    <aside className="flex w-70 shrink-0 flex-col border-r bg-sidebar px-7 pt-9 pb-10">
      <Link to="/weeks/$weekNo" params={{ weekNo: '1' }}>
        <img src="/images/title.png" alt="북키톡키" className="w-55 self-start" />
      </Link>
      <nav className="mt-9 flex flex-col gap-3.5">
        {!weeks &&
          Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        {weeks?.data.map((w) => (
          <Link
            key={w.id}
            to="/weeks/$weekNo"
            params={{ weekNo: String(w.weekNo) }}
            className={cn(
              buttonVariants({ variant: 'secondary' }),
              'h-11 w-full rounded-xl border-border/60 text-[15px] font-bold',
              w.weekNo === activeWeekNo &&
                'bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary',
            )}
          >
            {w.weekNo}주차 수업
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 pt-10">
        <Link
          to="/curriculum"
          className={cn(
            buttonVariants({ variant: 'outline' }),
            'h-12 w-full rounded-xl bg-card text-[15px] font-bold text-heading',
            curriculumActive &&
              'border-transparent bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
          )}
        >
          전체 커리큘럼 보기
        </Link>
        <div className="flex items-center gap-2">
          {/* 재로그인 시 이전 학교로 자동 진입하므로 여기서 언제든 전환.
              소속 학교가 없으면(관리자 등) 아예 표시하지 않는다 */}
          {me != null && me.associations.length > 0 && (
            <select
              value={currentSchool?.schoolId ?? ''}
              onChange={(e) => selectSchool(Number(e.target.value))}
              disabled={me.associations.length < 2}
              title="학교 전환"
              className="h-10 min-w-0 flex-1 cursor-pointer appearance-none rounded-xl border bg-card bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b6ba3%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.75rem_center] bg-no-repeat pr-8 pl-3 text-sm font-bold text-heading outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30 disabled:cursor-default disabled:opacity-100"
            >
              {me.associations.map((a) => (
                <option key={a.id} value={a.schoolId}>
                  {a.schoolName}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="h-10 min-w-0 flex-1 rounded-xl px-3 text-sm font-semibold text-muted-foreground"
          >
            로그아웃
          </Button>
        </div>
      </div>
    </aside>
  )
}
