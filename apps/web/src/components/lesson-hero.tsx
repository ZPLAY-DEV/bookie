import { HugeiconsIcon } from '@hugeicons/react'
import { FileDownloadIcon, File01Icon, PlayIcon } from '@hugeicons/core-free-icons'

import { TextAnimate } from '@/components/magicui/text-animate'
import { Link } from '@tanstack/react-router'

import type { Lesson } from '@/lib/queries'
import { CATEGORY_COLORS, CATEGORY_GRADIENTS, WEEKDAY_LABELS } from '@/lib/lesson-meta'

// 수업 흐름의 단계 뱃지 (도입/활동/마무리)
function StageBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-6 w-13 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold tracking-widest text-sidebar-primary-foreground">
      {label}
    </span>
  )
}

const ACTIVITY_NUMBERS = ['①', '②', '③', '④']

export function LessonHero({
  lesson,
  weekSubtitle,
}: {
  lesson: Lesson
  weekSubtitle: string | null
}) {
  const flow = lesson.flow
  const [gradientFrom, gradientTo] =
    CATEGORY_GRADIENTS[lesson.category] ?? CATEGORY_GRADIENTS['책놀이']

  return (
    <section className="flex gap-8 rounded-[32px] border bg-card shadow-sm">
      {lesson.image && (
        <img
          src={lesson.image}
          alt=""
          className="aspect-[578/525] w-[37%] shrink-0 rounded-[32px] object-cover"
        />
      )}
      <div className="flex flex-1 flex-col py-6.5 pr-8">
        <div className="flex items-center gap-5">
          <span
            className="rounded-full px-5 py-2.5 text-[18px] leading-none font-bold text-white"
            style={{ backgroundColor: CATEGORY_COLORS[lesson.category] ?? '#fbb93c' }}
          >
            {WEEKDAY_LABELS[lesson.dayIndex - 1]}요일 {lesson.category}
          </span>
          {weekSubtitle && (
            <span className="text-[15px] font-bold text-heading">{weekSubtitle}</span>
          )}
        </div>
        {/* 요일 전환 때마다(key) 단어 단위 slide-up 애니메이션으로 등장 */}
        <TextAnimate
          key={lesson.id}
          as="h2"
          animation="slideUp"
          by="word"
          className="mt-4.5 text-[44px] font-extrabold text-heading"
        >
          {lesson.title}
        </TextAnimate>
        {lesson.description && (
          <p className="mt-2 text-[15px] leading-relaxed">{lesson.description}</p>
        )}

        <div className="mt-6 grid flex-1 grid-cols-2">
          <div className="pr-9">
            <h3 className="text-[15px] font-bold text-heading">
              수업 흐름 {lesson.durationMin ?? 80}분
            </h3>
            <ol className="mt-4 space-y-2.5">
              {flow?.intro && (
                <li className="flex items-center gap-2.5 text-sm">
                  <StageBadge label="도입" />
                  <span className="flex-1">{flow.intro.title}</span>
                  <span className="text-muted-foreground">{flow.intro.durationMin}분</span>
                </li>
              )}
              {flow?.activities.map((step, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  {i === 0 ? <StageBadge label="활동" /> : <span className="w-13 shrink-0" />}
                  <span className="flex-1">
                    {ACTIVITY_NUMBERS[i] ?? `${i + 1}.`} {step.title}
                  </span>
                  <span className="text-muted-foreground">{step.durationMin}분</span>
                </li>
              ))}
              {flow?.wrapup && (
                <li className="flex items-center gap-2.5 text-sm">
                  <StageBadge label="마무리" />
                  <span className="flex-1">{flow.wrapup.title}</span>
                  <span className="text-muted-foreground">{flow.wrapup.durationMin}분</span>
                </li>
              )}
            </ol>
          </div>
          <div className="border-l pl-9">
            <h3 className="text-[15px] font-bold text-heading">수업 전 준비</h3>
            <ul className="mt-4 space-y-3">
              {lesson.preps.map((prep, i) => (
                <li key={i} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="flex-1">{prep.name}</span>
                  <span className="text-muted-foreground">{prep.quantity}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <Link
              to="/play/$lessonId"
              params={{ lessonId: String(lesson.id) }}
              className="flex h-13 items-center gap-2.5 rounded-full px-9 text-lg font-bold text-white transition hover:brightness-105 active:brightness-95"
              // 요일(과목) 색을 따라가는 입체감 그라데이션
              style={{
                background: `linear-gradient(to bottom, ${gradientFrom}, ${gradientTo})`,
                boxShadow: `0 8px 20px ${gradientTo}55`,
              }}
            >
              <HugeiconsIcon icon={PlayIcon} className="size-5" fill="currentColor" />
              수업 시작
            </Link>
            <img src="/images/book.png" alt="" className="size-16" />
          </div>
          <div className="flex items-center gap-7">
            {lesson.guideDownload && (
              <a
                href={lesson.guideDownload}
                className="flex items-center gap-1.5 text-sm font-semibold text-heading underline underline-offset-3"
              >
                <HugeiconsIcon icon={FileDownloadIcon} className="size-4.5" />
                지도안 다운받기
              </a>
            )}
            {lesson.lessonDownload && (
              <a
                href={lesson.lessonDownload}
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
