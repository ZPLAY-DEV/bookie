import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppSidebar } from '@/components/app-sidebar'
import { LessonHero } from '@/components/lesson-hero'
import { LottieLogo } from '@/components/lottie-logo'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { meQuery, weekDetailQuery, weeksQuery, type Lesson, type Me } from '@/lib/queries'
import { CATEGORY_COLORS, DAY_CATEGORY, WEEKDAY_LABELS } from '@/lib/lesson-meta'

const SCHOOL_KEY = 'bookie-school-id'

export function WeekPage() {
  const { weekNo } = useParams({ from: '/weeks/$weekNo' })
  const { day } = useSearch({ from: '/weeks/$weekNo' })
  const navigate = useNavigate()
  // 요일은 URL(?day=)에 실어 /play 갔다가 뒤로 와도 그대로 복원되게 한다
  const weekday = day ?? 1
  const setWeekday = (d: number) =>
    navigate({
      to: '/weeks/$weekNo',
      params: { weekNo },
      search: { day: d },
      replace: true,
    })
  const [schoolId, setSchoolId] = useState<number | null>(() => {
    const stored = localStorage.getItem(SCHOOL_KEY)
    return stored ? Number(stored) : null
  })

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/login' })
  }

  function selectSchool(id: number) {
    localStorage.setItem(SCHOOL_KEY, String(id))
    setSchoolId(id)
  }

  const { data: me } = useQuery(meQuery)
  const approved = me?.isApproved ?? false

  // 소속이 하나면 자동 선택, 복수면 유효한 선택이 있을 때만 통과
  const currentSchool =
    me?.associations.find((a) => a.schoolId === schoolId) ??
    (me?.associations.length === 1 ? me.associations[0] : undefined)

  const { data: weeks } = useQuery({ ...weeksQuery, enabled: approved })
  const week = weeks?.data.find((w) => w.weekNo === Number(weekNo))
  const { data: detail } = useQuery({
    ...weekDetailQuery(week?.id ?? 0),
    enabled: !!week,
  })

  const featured = detail?.lessons.find((l) => l.dayIndex === weekday)
  const others = detail?.lessons.filter((l) => l.dayIndex !== weekday) ?? []

  // 첫 로딩 — 실제 레이아웃과 같은 뼈대의 스켈레톤으로 점핑 없이 채운다
  if (!me) {
    return (
      <div className="flex h-full">
        <AppSidebar activeWeekNo={Number(weekNo)} />
        <WeekMainSkeleton />
      </div>
    )
  }

  // 사전 등록된 학교가 없으면 기본 학교(제트초등학교) 합류를 안내
  if (!approved) {
    return <DefaultSchoolConfirm onLogout={handleLogout} />
  }

  // 복수 소속인데 아직 학교를 고르지 않았으면 선택 화면
  if (!currentSchool && me.associations.length > 1) {
    return <SchoolPicker associations={me.associations} onSelect={selectSchool} />
  }

  // 주차/수업 데이터가 오기 전에는 본문을 스켈레톤으로 (빈 제목 '' 노출 방지)
  const contentLoading = !weeks || (!!week && !detail)

  return (
    <div className="flex h-full">
      <AppSidebar activeWeekNo={Number(weekNo)} />

        {contentLoading ? (
          <WeekMainSkeleton />
        ) : (
        <main className="flex-1 overflow-y-auto bg-card py-8 pl-8 pr-7">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-[32px] leading-none font-extrabold text-heading">
                이번 주 테마 '{week?.theme ?? ''}'
              </h1>
              {week?.subtitle && (
                <p className="mt-1.5 text-sm text-muted-foreground">{week.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {WEEKDAY_LABELS.map((label, i) => {
                const active = weekday === i + 1
                const color = CATEGORY_COLORS[DAY_CATEGORY[i]]
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setWeekday(i + 1)}
                    className={cn(
                      'size-14 rounded-full text-[18px] font-bold transition-colors',
                      active
                        ? 'text-white'
                        : 'border bg-card text-foreground hover:bg-muted',
                    )}
                    // 활성 요일은 해당 요일 과목의 색으로 (월=책놀이 노랑 …)
                    style={
                      active
                        ? { backgroundColor: color, boxShadow: `0 4px 12px ${color}55` }
                        : undefined
                    }
                  >
                    {label}
                  </button>
                )
              })}
              <img
                src="/images/avatar.png"
                alt="내 프로필"
                className="ml-2 size-13 rounded-full object-cover"
              />
            </div>
          </header>

          <div className="mt-6">
            {featured ? (
              <LessonHero lesson={featured} weekSubtitle={week?.subtitle ?? null} />
            ) : (
              <section className="flex h-120 items-center justify-center rounded-3xl border bg-muted/40 text-muted-foreground">
                이번 주 수업을 준비 중이에요
              </section>
            )}
          </div>

          {others.length > 0 && (
            <section className="mt-12">
              <div className="flex items-end justify-between">
                <h2 className="text-[32px] leading-none font-extrabold text-heading">
                  이번 주 다른 요일 수업
                </h2>
                <ul className="flex items-center gap-4">
                  {detail?.lessons.map((l) => (
                    <li key={l.id} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[l.category] ?? '#a78bfa' }}
                      />
                      {WEEKDAY_LABELS[l.dayIndex - 1]}({l.category})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-6 grid grid-cols-4 gap-8">
                {others.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onSelect={() => setWeekday(lesson.dayIndex)}
                  />
                ))}
              </div>
            </section>
          )}
        </main>
        )}
    </div>
  )
}

// 주차 대시보드 본문과 같은 골격의 로딩 스켈레톤
function WeekMainSkeleton() {
  return (
    <main className="flex-1 overflow-y-auto bg-card py-8 pl-8 pr-7">
      <header className="flex items-center justify-between">
        <div>
          <Skeleton className="h-12 w-96" />
          <Skeleton className="mt-2.5 h-4 w-48" />
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="size-14 rounded-full" />
          ))}
          <Skeleton className="ml-2 size-13 rounded-full" />
        </div>
      </header>
      <div className="mt-6 flex gap-8 rounded-[32px] border bg-card shadow-sm">
        <Skeleton className="aspect-[578/525] w-[37%] shrink-0 rounded-[32px]" />
        <div className="flex flex-1 flex-col py-6.5 pr-8">
          <Skeleton className="h-8 w-44 rounded-full" />
          <Skeleton className="mt-4 h-9 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-8 grid flex-1 grid-cols-2 gap-9">
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between pt-6">
            <Skeleton className="h-13 w-44 rounded-full" />
            <Skeleton className="h-5 w-72" />
          </div>
        </div>
      </div>
      <div className="mt-12">
        <Skeleton className="h-9 w-72" />
        <div className="mt-6 grid grid-cols-4 gap-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="overflow-hidden rounded-[32px] border">
              <Skeleton className="aspect-[364/208] w-full rounded-none" />
              <div className="px-5 py-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="mt-2 h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}

// 사전 등록된 학교가 없는 사용자 — 확인하면 기본 학교(제트초등학교) 강사로 합류
function DefaultSchoolConfirm({ onLogout }: { onLogout: () => void }) {
  const queryClient = useQueryClient()
  const join = useMutation({
    mutationFn: async () => {
      const res = await api.api.users['me']['join-default-school'].$post()
      if (!res.ok) throw new Error('합류에 실패했어요')
      return res.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  })

  return (
    <div className="flex h-full items-center justify-center p-7">
      <div className="w-full max-w-105 rounded-3xl border bg-card p-10 text-center shadow-sm">
        <LottieLogo className="mx-auto size-24" />
        <p className="mt-4 text-[15px] leading-relaxed text-heading">
          등록된 학교가 없어서
          <br />
          <strong>제트초등학교</strong> 수업으로 이동하겠습니다.
        </p>
        {join.isError && (
          <p className="mt-3 text-sm font-medium text-destructive">
            잠시 후 다시 시도해 주세요
          </p>
        )}
        <Button
          onClick={() => join.mutate()}
          disabled={join.isPending}
          className="mt-7 h-12 w-full rounded-full font-bold shadow-lg shadow-primary/30 hover:bg-primary/90"
        >
          {join.isPending ? '이동 중…' : '확인'}
        </Button>
        <Button
          variant="ghost"
          onClick={onLogout}
          className="mt-2 h-10 w-full rounded-xl text-sm font-semibold text-muted-foreground"
        >
          로그아웃
        </Button>
      </div>
    </div>
  )
}

// 복수 소속 강사의 학교 선택 화면
function SchoolPicker({
  associations,
  onSelect,
}: {
  associations: Me['associations']
  onSelect: (schoolId: number) => void
}) {
  return (
    <div className="flex h-full items-center justify-center p-7">
      <div className="w-full max-w-105 rounded-3xl border bg-card p-10 shadow-sm">
        <h1 className="text-center text-[22px] font-extrabold text-heading">
          어느 학교로 들어갈까요?
        </h1>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          여러 학교에 소속되어 있어요. 수업할 학교를 선택해 주세요.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          {associations.map((a) => (
            <Button
              key={a.id}
              variant="secondary"
              onClick={() => onSelect(a.schoolId)}
              className="h-13 w-full rounded-xl text-[16px] font-bold"
            >
              {a.schoolName}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}

function LessonCard({ lesson, onSelect }: { lesson: Lesson; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="overflow-hidden rounded-[32px] border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {lesson.image && (
        <img
          src={lesson.image}
          alt=""
          className="aspect-[364/208] w-full object-cover"
        />
      )}
      <div className="px-5 py-4">
        <h3 className="truncate text-[17px] font-bold text-heading">{lesson.title}</h3>
        <p
          className="mt-1 text-sm font-semibold"
          style={{ color: CATEGORY_COLORS[lesson.category] ?? '#6b6ba3' }}
        >
          {WEEKDAY_LABELS[lesson.dayIndex - 1]}요일 {lesson.category}
        </p>
      </div>
    </button>
  )
}
