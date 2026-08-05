import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { AppSidebar } from '@/components/app-sidebar'
import { LessonHero } from '@/components/lesson-hero'
import { api, lessonFileUrl } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { meQuery, weekDetailQuery, weeksQuery, type Lesson, type Me } from '@/lib/queries'
import { CATEGORY_COLORS, DAY_CATEGORY, WEEKDAY_LABELS } from '@/lib/lesson-meta'

const SCHOOL_KEY = 'bookie-school-id'

export function WeekPage() {
  const { weekNo } = useParams({ from: '/weeks/$weekNo' })
  const navigate = useNavigate()
  const [weekday, setWeekday] = useState(5)
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

  if (!me) return null

  // 사전 등록된 학교가 없으면 기본 학교(제트초등학교) 합류를 안내
  if (!approved) {
    return <DefaultSchoolConfirm onLogout={handleLogout} />
  }

  // 복수 소속인데 아직 학교를 고르지 않았으면 선택 화면
  if (!currentSchool && me.associations.length > 1) {
    return <SchoolPicker associations={me.associations} onSelect={selectSchool} />
  }

  return (
    <div className="min-h-svh p-7">
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-[1880px] overflow-hidden rounded-3xl border bg-sidebar shadow-sm">
        <AppSidebar activeWeekNo={Number(weekNo)} />

        <main className="flex-1 bg-card px-12 py-9">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-[26px] font-extrabold text-heading">
                이번 주 테마 '{week?.theme ?? ''}'
              </h1>
              {week?.subtitle && (
                <p className="mt-1.5 text-[13px] text-muted-foreground">{week.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {WEEKDAY_LABELS.map((label, i) => {
                const active = weekday === i + 1
                const color = CATEGORY_COLORS[DAY_CATEGORY[i]]
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setWeekday(i + 1)}
                    className={cn(
                      'size-11 rounded-full text-[15px] font-bold transition-colors',
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

          <div className="mt-7">
            {featured ? (
              <LessonHero lesson={featured} weekSubtitle={week?.subtitle ?? null} />
            ) : (
              <section className="flex h-120 items-center justify-center rounded-3xl border bg-muted/40 text-muted-foreground">
                이번 주 수업을 준비 중이에요
              </section>
            )}
          </div>

          {others.length > 0 && (
            <section className="mt-9">
              <div className="flex items-end justify-between">
                <h2 className="text-[22px] font-extrabold text-heading">
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
              <div className="mt-5 grid grid-cols-4 gap-7">
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
      </div>
    </div>
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
    <div className="flex min-h-svh items-center justify-center p-7">
      <div className="w-full max-w-105 rounded-3xl border bg-card p-10 text-center shadow-sm">
        <img src="/logo-title.svg" alt="북키톡키" className="mx-auto size-24" />
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
    <div className="flex min-h-svh items-center justify-center p-7">
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
      className="overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {lesson.thumbnailFile && (
        <img
          src={lessonFileUrl(lesson.thumbnailFile)}
          alt=""
          className="aspect-[338/194] w-full object-cover"
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
