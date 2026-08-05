import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  PauseIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { lessonQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

// 유튜브 링크 → 임베드 URL (watch?v= / youtu.be / shorts 지원)
function youtubeEmbedUrl(link: string): string | null {
  try {
    const url = new URL(link)
    const id =
      url.searchParams.get('v') ??
      (url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : url.pathname.startsWith('/shorts/')
          ? url.pathname.split('/')[2]
          : null)
    return id ? `https://www.youtube.com/embed/${id}` : null
  } catch {
    return null
  }
}

function formatElapsed(seconds: number) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

// 수업 재생 플레이어 — 슬라이드 이미지 순차 렌더 + 미디어 큐 오버레이 (PRD §5)
export function PlayerPage() {
  const { lessonId } = useParams({ from: '/play/$lessonId' })
  const { start } = useSearch({ from: '/play/$lessonId' })
  const router = useRouter()
  const { data: lesson } = useQuery(lessonQuery(Number(lessonId)))

  const [slideIdx, setSlideIdx] = useState(() => Math.max((start ?? 1) - 1, 0))
  // 수업 이탈 확인 팝업 — '수업 마치기'에서만 사유를 묻고 이동
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 재생목록: media가 있으면 그것이 곧 슬라이드쇼. 없으면 slideCount 이미지 폴백.
  // 폴백 슬라이드 URL은 썸네일 full URL(…/w1d1/w1d1.png)에서 폴더/접두어를 유도한다.
  const thumbUrl = lesson?.thumbnailFile ?? null
  const folderUrl = thumbUrl?.slice(0, thumbUrl.lastIndexOf('/')) ?? null
  const prefix = thumbUrl?.split('/').pop()?.split('.')[0] ?? null
  const playlist: { type: 'image' | 'youtube' | 'music'; value: string; duration: number | null }[] =
    lesson == null
      ? []
      : lesson.media.length > 0
        ? lesson.media
        : Array.from({ length: lesson.slideCount ?? 0 }, (_, i) => ({
            type: 'image' as const,
            value:
              folderUrl && prefix
                ? `${folderUrl}/${prefix}_slide${String(i + 1).padStart(2, '0')}.png`
                : '',
            duration: null,
          }))
  const total = playlist.length
  const current = playlist[slideIdx]

  const canPrev = slideIdx > 0
  const canNext = slideIdx < total - 1

  // 경과 타이머
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // 키보드 좌우 이동
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') setSlideIdx((i) => Math.min(i + 1, Math.max(total - 1, 0)))
      if (e.key === 'ArrowLeft') setSlideIdx((i) => Math.max(i - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  // 슬라이드 전환 시 오디오 정지
  useEffect(() => {
    audioRef.current?.pause()
    setAudioPlaying(false)
  }, [slideIdx])

  // 이미지 항목은 duration(초) 후 자동으로 다음 항목으로
  useEffect(() => {
    if (current?.type !== 'image' || current.duration == null || !canNext) return
    const t = setTimeout(
      () => setSlideIdx((i) => Math.min(i + 1, total - 1)),
      current.duration * 1000,
    )
    return () => clearTimeout(t)
  }, [slideIdx, current?.type, current?.duration, canNext, total])

  const embedUrl = current?.type === 'youtube' ? youtubeEmbedUrl(current.value) : null
  const audioUrl = current?.type === 'music' ? current.value : null

  function toggleAudio() {
    const el = audioRef.current
    if (!el) return
    if (el.paused) {
      el.play()
      setAudioPlaying(true)
    } else {
      el.pause()
      setAudioPlaying(false)
    }
  }

  return (
    <div className="min-h-svh p-7">
      <div className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-[1880px] flex-col overflow-hidden rounded-3xl border bg-card shadow-sm">
        {/* 로고는 대시보드 사이드바와 동일 좌표(left 28px/top 36px/w 220px)에 고정 — 페이지 전환 시 점핑 방지 */}
        <header className="relative flex h-28 items-center justify-center">
          <Link
            to="/weeks/$weekNo"
            params={{ weekNo: '1' }}
            title="홈으로"
            className="absolute top-9 left-7"
          >
            <img src="/images/title.png" alt="북키톡키" className="w-55" />
          </Link>
          <h1 className="max-w-[55%] truncate text-center text-[28px] font-extrabold text-[#f5a031]">
            {lesson?.title ?? ''}
          </h1>
          <div className="absolute top-1/2 right-10 flex -translate-y-1/2 items-center gap-5">
            <span className="text-2xl font-extrabold text-heading tabular-nums">
              {formatElapsed(elapsed)}
            </span>
            <Button
              variant="outline"
              onClick={() => setShowExitConfirm(true)}
              className="h-11 rounded-full bg-card px-6 text-[15px] font-bold text-heading"
            >
              수업 마치기
            </Button>
          </div>
        </header>

      <main className="flex flex-1 items-center justify-center gap-6 px-6 pb-8">
        <button
          type="button"
          onClick={() => setSlideIdx((i) => Math.max(i - 1, 0))}
          disabled={!canPrev}
          title="이전 슬라이드"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-heading transition hover:bg-secondary/70 disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-7" />
        </button>

        <div className="relative aspect-video w-full max-w-[1400px] overflow-hidden rounded-lg border bg-muted">
          {current == null ? (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              재생목록이 아직 준비되지 않았어요
            </div>
          ) : current.type === 'image' ? (
            <img
              src={current.value}
              alt={`슬라이드 ${slideIdx + 1}`}
              className="size-full object-contain"
            />
          ) : current.type === 'youtube' && embedUrl ? (
            // 유튜브 스텝 — 강사가 재생 후 화살표로 직접 진행
            <div className="flex size-full items-center justify-center bg-heading/95">
              <iframe
                src={embedUrl}
                title="수업 영상"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-[86%] rounded-xl shadow-2xl"
              />
            </div>
          ) : (
            // 음악 스텝 — 재생/일시정지 후 직접 진행
            <div className="flex size-full flex-col items-center justify-center gap-6 bg-heading/95">
              {audioUrl && (
                <audio ref={audioRef} src={audioUrl} onEnded={() => setAudioPlaying(false)} />
              )}
              <span className="text-6xl">🎵</span>
              <button
                type="button"
                onClick={toggleAudio}
                title={audioPlaying ? '일시정지' : '음악 재생'}
                className={cn(
                  'flex size-20 cursor-pointer items-center justify-center rounded-full text-white shadow-xl transition',
                  audioPlaying ? 'bg-accent' : 'bg-[#f5a031] hover:brightness-105',
                )}
              >
                <HugeiconsIcon
                  icon={audioPlaying ? PauseIcon : PlayIcon}
                  className="size-9"
                  fill="currentColor"
                />
              </button>
              <p className="text-sm font-semibold text-white/80">
                재생이 끝나면 화살표로 다음으로 넘어가세요
              </p>
            </div>
          )}

          {total > 0 && (
            <span className="absolute right-4 bottom-4 rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-white tabular-nums">
              {slideIdx + 1} / {total}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSlideIdx((i) => Math.min(i + 1, Math.max(total - 1, 0)))}
          disabled={!canNext}
          title="다음 슬라이드"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-heading transition hover:bg-secondary/70 disabled:opacity-40"
        >
          <HugeiconsIcon icon={ArrowRight01Icon} className="size-7" />
        </button>
      </main>

        {showExitConfirm && (
          <ExitConfirm
            onClose={() => setShowExitConfirm(false)}
            onSelect={() => router.history.back()}
          />
        )}

        {/* 다음 이미지 사전 캐싱 */}
        {canNext && playlist[slideIdx + 1]?.type === 'image' && (
          <img src={playlist[slideIdx + 1].value} alt="" className="hidden" />
        )}
      </div>
    </div>
  )
}

const EXIT_REASONS = [
  { emoji: '😫', label: '겁나 재미없음' },
  { emoji: '🥺', label: '그만할래' },
  { emoji: '🥱', label: '흥미를 잃음' },
] as const

// 수업 이탈 확인 — 야옹이가 이유를 묻는다. 카드 3장이 겹쳐 있다가
// hover 시 부채꼴로 펼쳐진다 (magicui feature-card 스타일 연출)
function ExitConfirm({
  onSelect,
  onClose,
}: {
  onSelect: () => void
  onClose: () => void
}) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-heading/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-3xl border bg-card p-10 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center">
          <img
            src="/images/avatar.png"
            alt=""
            className="size-20 rounded-full object-cover"
          />
          <div className="relative mt-4 rounded-2xl bg-secondary px-6 py-3">
            <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-secondary" />
            <p className="text-[22px] font-extrabold text-heading">
              야옹...? 왜 그러시죠? 🐾
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            이유를 하나 골라주면 보내드릴게요 (마우스를 올려보세요)
          </p>
        </div>

        <div className="group relative mx-auto mt-8 h-44 max-w-2xl">
          {EXIT_REASONS.map((reason, i) => (
            <button
              key={reason.label}
              type="button"
              onClick={onSelect}
              className={cn(
                'absolute top-0 left-1/2 flex h-40 w-52 -translate-x-1/2 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border bg-card shadow-lg transition-all duration-250 ease-out hover:!scale-105 hover:border-accent hover:shadow-xl',
                // 기본: 살짝 어긋나게 겹친 카드 더미
                i === 0 && '-rotate-8 -translate-x-[62%]',
                i === 1 && 'z-10 -translate-y-1',
                i === 2 && 'rotate-8 -translate-x-[38%]',
                // hover: 동등한 3개 옵션으로 펼침
                i === 0 && 'group-hover:-translate-x-[160%] group-hover:rotate-0',
                i === 1 && 'group-hover:-translate-y-0',
                i === 2 && 'group-hover:translate-x-[60%] group-hover:rotate-0',
              )}
            >
              <span className="text-4xl">{reason.emoji}</span>
              <span className="text-[16px] font-bold text-heading">{reason.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 cursor-pointer text-sm font-semibold text-muted-foreground underline underline-offset-3 hover:text-heading"
        >
          아냐, 계속 수업할래
        </button>
      </div>
    </div>
  )
}
