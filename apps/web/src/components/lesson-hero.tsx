import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { FileDownloadIcon, File01Icon, PlayIcon } from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { mediaUrl } from '@/lib/api'
import { cn } from '@/lib/utils'
import { lessonDetailQuery, type Lesson, type LessonDetail } from '@/lib/queries'
import { WEEKDAY_LABELS } from '@/lib/lesson-meta'

export function LessonHero({
  lesson,
  weekSubtitle,
}: {
  lesson: Lesson
  weekSubtitle: string | null
}) {
  const { data: detail } = useQuery(lessonDetailQuery(lesson.id))
  const guide = detail?.materials.find((m) => m.kind === 'guide')
  const resource = detail?.materials.find((m) => m.kind === 'resource')

  return (
    <section className="flex gap-8 rounded-3xl border bg-card p-4 shadow-sm">
      {lesson.imageUrl && (
        <img
          src={mediaUrl(lesson.imageUrl)}
          alt=""
          className="w-[37%] shrink-0 self-stretch rounded-2xl object-cover"
        />
      )}
      <div className="flex flex-1 flex-col py-2 pr-6">
        <div className="flex items-center gap-5">
          <span className="rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-accent-foreground">
            {WEEKDAY_LABELS[lesson.weekday - 1]}요일 {lesson.category}
          </span>
          {weekSubtitle && (
            <span className="text-[15px] font-bold text-heading">{weekSubtitle}</span>
          )}
        </div>
        <h2 className="mt-3.5 text-[32px] font-extrabold text-heading">{lesson.title}</h2>
        {lesson.description && (
          <p className="mt-2 text-[15px] leading-relaxed">{lesson.description}</p>
        )}

        <div className="mt-6 grid flex-1 grid-cols-2">
          <div className="pr-9">
            <h3 className="text-[15px] font-bold text-heading">
              수업 흐름({lesson.durationMin ?? 40}분)
            </h3>
            <ol className="mt-4 space-y-3">
              {detail?.steps.map((step, i) => (
                <li key={step.id} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1">{step.title}</span>
                  <span className="text-muted-foreground">{step.durationMin}분</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="border-l pl-9">
            <h3 className="text-[15px] font-bold text-heading">수업 전 준비</h3>
            {detail && <PrepList key={lesson.id} preps={detail.preps} />}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <Button className="h-13 gap-2.5 rounded-full px-9 text-lg font-bold shadow-lg shadow-primary/30 hover:bg-primary/90">
            <HugeiconsIcon icon={PlayIcon} className="size-5" fill="currentColor" />
            수업 시작
          </Button>
          <div className="flex items-center gap-7">
            {guide && (
              <a
                href={mediaUrl(guide.storagePath, guide.fileName)}
                className="flex items-center gap-1.5 text-sm font-semibold text-heading underline underline-offset-3"
              >
                <HugeiconsIcon icon={FileDownloadIcon} className="size-4.5" />
                지도안 다운받기
              </a>
            )}
            {resource && (
              <a
                href={mediaUrl(resource.storagePath, resource.fileName)}
                className="flex items-center gap-1.5 text-sm font-semibold text-heading underline underline-offset-3"
              >
                <HugeiconsIcon icon={File01Icon} className="size-4.5" />
                수업자료 다운받기
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// 준비물 체크리스트 — 체크하면 준비 완료(취소선) 표시
function PrepList({ preps }: { preps: LessonDetail['preps'] }) {
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(preps.length > 0 ? [preps[0].id] : []),
  )

  function toggle(id: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ul className="mt-4 space-y-3">
      {preps.map((prep) => {
        const isChecked = checked.has(prep.id)
        return (
          <li key={prep.id}>
            <button
              type="button"
              onClick={() => toggle(prep.id)}
              className="flex w-full items-center gap-2.5 text-left text-sm"
            >
              <span
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full border-2',
                  isChecked ? 'border-sidebar-primary' : 'border-muted-foreground/50',
                )}
              >
                {isChecked && <span className="size-2 rounded-full bg-sidebar-primary" />}
              </span>
              <span className={cn('flex-1', isChecked && 'line-through')}>
                {prep.name}
              </span>
              <span className="text-muted-foreground">{prep.quantity}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
