import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'

import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { meQuery, weeksQuery } from '@/lib/queries'

const SCHOOL_KEY = 'bookie-school-id'

// 주차 대시보드/전체 커리큘럼이 공유하는 좌측 사이드바 (디자인 스펙: 폭 304px, 흰 배경).
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
    <aside className="flex w-76 shrink-0 flex-col bg-sidebar px-8 pt-8 pb-8">
      <Link to="/weeks/$weekNo" params={{ weekNo: '1' }}>
        {/* XD 스펙: 208×40 @ (48,32) — aside 의 px-8(32) + ml-4(16) = 48 */}
        <img src="/logo-horizontal.svg" alt="북키톡키" className="ml-4 h-10 w-52 self-start" />
      </Link>
      <nav className="mt-[34px] flex flex-col gap-2">
        {!weeks &&
          Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        {weeks?.data.map((w) => (
          <Link
            key={w.id}
            to="/weeks/$weekNo"
            params={{ weekNo: String(w.weekNo) }}
            className={cn(
              'flex h-14 w-full items-center justify-center rounded-xl bg-secondary text-[16px] font-extrabold text-heading transition-colors hover:bg-muted',
              w.weekNo === activeWeekNo &&
                'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary',
            )}
          >
            {w.weekNo}주차
          </Link>
        ))}
      </nav>
      <div className="mt-auto flex flex-col pt-6">
        {/* 재로그인 시 이전 학교로 자동 진입하므로 여기서 언제든 전환.
            소속이 하나뿐이면 고를 것이 없어 디자인대로 감춘다 */}
        {me != null && me.associations.length > 1 && (
          <select
            value={currentSchool?.schoolId ?? ''}
            onChange={(e) => selectSchool(Number(e.target.value))}
            title="학교 전환"
            className="mb-3 h-12 w-full cursor-pointer appearance-none rounded-xl border bg-card bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23878B94%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_1rem_center] bg-no-repeat px-4 text-center text-[15px] font-bold text-heading outline-none focus:border-ring focus:ring-[3px] focus:ring-ring/30"
          >
            {me.associations.map((a) => (
              <option key={a.id} value={a.schoolId}>
                {a.schoolName}
              </option>
            ))}
          </select>
        )}
        <Link
          to="/curriculum"
          className={cn(
            'flex h-14 w-full items-center justify-center rounded-xl border bg-card text-[16px] font-extrabold text-heading transition-colors hover:bg-secondary',
            curriculumActive &&
              'border-transparent bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary',
          )}
        >
          전체 커리큘럼 보기
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 text-center text-xs leading-[13px] text-muted-foreground hover:underline"
        >
          로그아웃
        </button>
      </div>
    </aside>
  )
}
