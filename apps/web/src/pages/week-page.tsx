import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'

import { Button, buttonVariants } from '@/components/ui/button'
import { LessonHero } from '@/components/lesson-hero'
import { mediaUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { weekDetailQuery, weeksQuery, type Lesson } from '@/lib/queries'
import { CATEGORY_COLORS, WEEKDAY_LABELS } from '@/lib/lesson-meta'

export function WeekPage() {
  const { weekNo } = useParams({ from: '/weeks/$weekNo' })
  const [weekday, setWeekday] = useState(5)

  const { data: weeks } = useQuery(weeksQuery)
  const week = weeks?.data.find((w) => w.weekNo === Number(weekNo))
  const { data: detail } = useQuery({
    ...weekDetailQuery(week?.id ?? 0),
    enabled: !!week,
  })

  const featured = detail?.lessons.find((l) => l.weekday === weekday)
  const others = detail?.lessons.filter((l) => l.weekday !== weekday) ?? []

  return (
    <div className="min-h-svh p-7">
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-[1880px] overflow-hidden rounded-3xl border bg-sidebar shadow-sm">
        <aside className="flex w-70 shrink-0 flex-col px-7 py-24">
          <nav className="flex flex-col gap-3.5">
            {weeks?.data.map((w) => (
              <Link
                key={w.id}
                to="/weeks/$weekNo"
                params={{ weekNo: String(w.weekNo) }}
                className={cn(
                  buttonVariants({ variant: 'secondary' }),
                  'h-11 w-full rounded-xl border-border/60 text-[15px] font-bold',
                  w.weekNo === Number(weekNo) &&
                    'bg-sidebar-primary text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary',
                )}
              >
                {w.weekNo}주차 수업
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-10">
            <Button
              variant="outline"
              className="h-12 w-full rounded-xl bg-card text-[15px] font-bold text-heading"
            >
              전체 커리큘럼 보기
            </Button>
          </div>
        </aside>

        <main className="flex-1 rounded-3xl bg-card px-12 py-9">
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
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setWeekday(i + 1)}
                  className={cn(
                    'size-11 rounded-full text-[15px] font-bold transition-colors',
                    weekday === i + 1
                      ? 'bg-accent text-accent-foreground shadow-md shadow-accent/30'
                      : 'border bg-card text-foreground hover:bg-muted',
                  )}
                >
                  {label}
                </button>
              ))}
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
                      {WEEKDAY_LABELS[l.weekday - 1]}({l.category})
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 grid grid-cols-4 gap-7">
                {others.map((lesson) => (
                  <LessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onSelect={() => setWeekday(lesson.weekday)}
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

function LessonCard({ lesson, onSelect }: { lesson: Lesson; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md"
    >
      {lesson.imageUrl && (
        <img
          src={mediaUrl(lesson.imageUrl)}
          alt=""
          className="aspect-[338/194] w-full object-cover"
        />
      )}
      <div className="px-5 py-4">
        <h3 className="truncate text-[17px] font-bold text-heading">{lesson.title}</h3>
        {lesson.durationMin && (
          <p className="mt-1 text-sm text-muted-foreground">{lesson.durationMin}분</p>
        )}
      </div>
    </button>
  )
}
