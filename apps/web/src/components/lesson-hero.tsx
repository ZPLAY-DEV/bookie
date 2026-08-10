import { HugeiconsIcon } from '@hugeicons/react'
import { Book02Icon, FileDownloadIcon, File01Icon, PlayIcon } from '@hugeicons/core-free-icons'

import { TextAnimate } from '@/components/magicui/text-animate'
import { Link } from '@tanstack/react-router'

import { cn } from '@/lib/utils'
import type { Lesson } from '@/lib/queries'
import { CATEGORY_COLORS, WEEKDAY_LABELS } from '@/lib/lesson-meta'

// 수업 흐름의 단계 뱃지 (도입/활동/마무리)
function StageBadge({ label }: { label: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-15 shrink-0 items-center justify-center rounded-lg bg-muted text-sm text-heading',
        // 두 글자 라벨(도입/활동)은 디자인처럼 자간을 벌려 세 글자와 폭을 맞춘다
        label.length === 2 && 'tracking-[0.5em] [text-indent:0.5em]',
      )}
    >
      {label}
    </span>
  )
}

const ACTIVITY_NUMBERS = ['①', '②', '③', '④']

export function LessonHero({ lesson }: { lesson: Lesson }) {
  const flow = lesson.flow
  const accent = CATEGORY_COLORS[lesson.category] ?? CATEGORY_COLORS['책놀이']

  return (
    <section className="flex h-135 gap-8 rounded-[32px] bg-card">
      {lesson.image && (
        // 요일 색 테두리(6px)를 두른 대표 이미지
        <div
          className="w-[578px] shrink-0 rounded-[32px] p-1.5"
          style={{ backgroundColor: accent }}
        >
          <img
            src={lesson.image}
            alt=""
            className="size-full rounded-[26px] object-cover"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col py-8 pr-16">
        <span
          className="inline-flex h-[34px] w-fit items-center rounded-full px-4 text-[16px] text-white"
          style={{ backgroundColor: accent }}
        >
          {WEEKDAY_LABELS[lesson.dayIndex - 1]}요일 {lesson.category}
        </span>
        {/* 요일 전환 때마다(key) 단어 단위 slide-up 애니메이션으로 등장 */}
        <TextAnimate
          key={lesson.id}
          as="h2"
          animation="slideUp"
          by="word"
          className="mt-4 text-[36px] leading-10 font-extrabold text-heading"
        >
          {lesson.title}
        </TextAnimate>
        {lesson.description && (
          <p className="mt-3 text-[16px] leading-6">{lesson.description}</p>
        )}

        <div className="mt-6 grid flex-1 grid-cols-2">
          <div className="pr-10">
            <h3 className="text-[18px] leading-5 font-bold text-heading">
              수업 흐름 {lesson.durationMin ?? 80}분
            </h3>
            <ol className="mt-4 flex flex-col">
              {flow?.intro && <FlowRow badge="도입" {...flow.intro} />}
              {flow?.activities && flow.activities.length > 0 && (
                <li className="mt-2">
                  <ol>
                    {flow.activities.map((step, i) => (
                      <FlowRow
                        key={i}
                        badge={i === 0 ? '활동' : undefined}
                        title={`${ACTIVITY_NUMBERS[i] ?? `${i + 1}.`} ${step.title}`}
                        durationMin={step.durationMin}
                      />
                    ))}
                  </ol>
                </li>
              )}
              {flow?.wrapup && (
                <FlowRow className="mt-4" badge="마무리" {...flow.wrapup} />
              )}
            </ol>
          </div>
          <div className="border-l pl-10">
            <h3 className="text-[18px] leading-5 font-bold text-heading">수업 전 준비</h3>
            <ul className="mt-4 flex flex-col gap-2">
              {lesson.preps.map((prep, i) => (
                <li key={i} className="flex h-6 items-center gap-2 text-sm text-heading">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted">
                    {i + 1}
                  </span>
                  <span className="flex-1">{prep.name}</span>
                  <span className="text-muted-foreground">{prep.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link
              to="/play/$lessonId"
              params={{ lessonId: String(lesson.id) }}
              className="flex h-16 w-59 items-center justify-center gap-4 rounded-full text-[22px] font-extrabold text-white transition hover:brightness-105 active:brightness-95"
              style={{ backgroundColor: accent }}
            >
              <HugeiconsIcon icon={PlayIcon} className="size-6" fill="currentColor" />
              수업 시작
            </Link>
            <span className="flex h-16 w-[138px] items-center justify-center gap-2.5 rounded-full border border-muted-foreground text-[22px] font-extrabold text-heading">
              <HugeiconsIcon icon={Book02Icon} className="size-6" fill="currentColor" />
              그림책
            </span>
          </div>
          <div className="flex items-center gap-8">
            {lesson.guideDownload && (
              <a
                href={lesson.guideDownload}
                className="flex items-center gap-2 text-[16px] text-heading underline underline-offset-3"
              >
                <HugeiconsIcon icon={FileDownloadIcon} className="size-4.5" />
                지도안 다운받기
              </a>
            )}
            {lesson.lessonDownload && (
              <a
                href={lesson.lessonDownload}
                className="flex items-center gap-2 text-[16px] text-heading underline underline-offset-3"
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

// 수업 흐름 한 줄 — 뱃지(없으면 자리만) · 제목 · 소요 시간
function FlowRow({
  badge,
  title,
  durationMin,
  className,
}: {
  badge?: string
  title: string
  durationMin: number
  className?: string
}) {
  return (
    <li className={cn('flex h-6 items-center gap-2 text-sm text-heading', className)}>
      {badge ? <StageBadge label={badge} /> : <span className="w-15 shrink-0" />}
      <span className="flex-1">{title}</span>
      <span className="text-muted-foreground">{durationMin}분</span>
    </li>
  )
}
