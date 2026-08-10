import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams, useRouter, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Clock01Icon,
  Door01Icon,
  PauseIcon,
  PlayIcon,
} from '@hugeicons/core-free-icons'

import { Button } from '@/components/ui/button'
import { lessonQuery } from '@/lib/queries'
import { cn } from '@/lib/utils'

// XD 스펙(1920×1080 캔버스) 실측값 — 좌표/크기는 전부 캔버스 절대 좌표다.
const BG_URL = 'https://cdn.bktk.kr/assets/bg.jpg'

// 유튜브 링크 → 영상 ID (watch?v= / youtu.be / shorts 지원)
function youtubeId(link: string): string | null {
  try {
    const url = new URL(link)
    return (
      url.searchParams.get('v') ??
      (url.hostname === 'youtu.be'
        ? url.pathname.slice(1)
        : url.pathname.startsWith('/shorts/')
          ? url.pathname.split('/')[2]
          : null)
    )
  } catch {
    return null
  }
}

/* ---- YouTube IFrame Player API — 영상 종료(ENDED) 감지용 ---- */

type YTPlayer = { destroy: () => void }
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      videoId: string
      playerVars?: Record<string, number>
      events?: { onStateChange?: (e: { data: number }) => void }
    },
  ) => YTPlayer
  PlayerState: { ENDED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let ytApiPromise: Promise<YTNamespace> | null = null
function loadYouTubeAPI(): Promise<YTNamespace> {
  if (ytApiPromise) return ytApiPromise
  ytApiPromise = new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT)
    window.onYouTubeIframeAPIReady = () => resolve(window.YT as YTNamespace)
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  })
  return ytApiPromise
}

// 유튜브 스텝 — 자동 재생하고, 영상이 끝나거나(ENDED) '유튜브 닫기'를 누르면 다음으로
function YoutubeStep({ videoId, onDone }: { videoId: string; onDone: () => void }) {
  const holderRef = useRef<HTMLDivElement | null>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  useEffect(() => {
    let player: YTPlayer | null = null
    let cancelled = false
    loadYouTubeAPI().then((yt) => {
      if (cancelled || !holderRef.current) return
      player = new yt.Player(holderRef.current, {
        videoId,
        playerVars: { autoplay: 1, rel: 0 },
        events: {
          onStateChange: (e) => {
            if (e.data === yt.PlayerState.ENDED) onDoneRef.current()
          },
        },
      })
    })
    return () => {
      cancelled = true
      player?.destroy()
    }
  }, [videoId])

  return (
    <div className="relative flex size-full items-center justify-center bg-heading/95">
      {/* YT.Player가 이 div를 iframe으로 치환한다 */}
      <div className="aspect-video w-[86%] overflow-hidden rounded-xl shadow-2xl [&>iframe]:size-full">
        <div ref={holderRef} className="size-full" />
      </div>
      <button
        type="button"
        onClick={() => onDoneRef.current()}
        className="absolute top-5 right-5 cursor-pointer rounded-full bg-black/50 px-4 py-2 text-sm font-bold text-white transition hover:bg-black/70"
      >
        ✕ 유튜브 닫기
      </button>
    </div>
  )
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
  // 야옹이 메뉴 — '수업 마치기'에서 열리고 타임라인 숨김/나가기/타임라인 공개를 고른다
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  // 타임라인 — XD 스펙 화면에는 없으므로 기본은 숨김. '수업 마치기' 메뉴에서 공개할 수 있다.
  const [listHidden, setListHidden] = useState(true)
  // 잠깐 멈춤 — 슬라이드 자동 진행을 멈춘다 (화살표/타임라인 수동 이동은 그대로)
  const [paused, setPaused] = useState(false)
  // 슬라이드 전환 간격(초) — 팝업에서 조정하면 모든 슬라이드에 일괄 적용
  const [intervalSec, setIntervalSec] = useState(5)
  const [showInterval, setShowInterval] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 재생목록: media가 있으면 그것이 곧 슬라이드쇼. 없으면 slideCount 이미지 폴백.
  // 폴백 슬라이드 URL은 썸네일 full URL(…/w1d1/w1d1.png)에서 폴더/접두어를 유도한다.
  const thumbUrl = lesson?.image ?? null
  const folderUrl = thumbUrl?.slice(0, thumbUrl.lastIndexOf('/')) ?? null
  const prefix = thumbUrl?.split('/').pop()?.split('.')[0] ?? null
  const playlist: { type: 'image' | 'youtube' | 'music' | 'video'; value: string }[] =
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

  // 이미지 항목은 전환 간격(초) 후 자동으로 다음 항목으로 (잠깐 멈춤 중엔 정지)
  useEffect(() => {
    if (paused || current?.type !== 'image' || !canNext) return
    const t = setTimeout(
      () => setSlideIdx((i) => Math.min(i + 1, total - 1)),
      intervalSec * 1000,
    )
    return () => clearTimeout(t)
  }, [slideIdx, current?.type, canNext, total, paused, intervalSec])

  const videoId = current?.type === 'youtube' ? youtubeId(current.value) : null
  const audioUrl = current?.type === 'music' ? current.value : null

  // 유튜브 종료/닫기 → 다음 index로 재개
  const goNext = () => setSlideIdx((i) => Math.min(i + 1, Math.max(total - 1, 0)))

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
    <div
      className="relative h-full overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: `url(${BG_URL})` }}
    >
      {/* 로고 208×40 @ (80,58) */}
      <Link
        to="/weeks/$weekNo"
        params={{ weekNo: '1' }}
        title="홈으로"
        className="absolute top-[58px] left-20"
      >
        <img src="/logo-horizontal.svg" alt="북키톡키" className="h-10 w-52" />
      </Link>

      {/* 제목 알약 880×92 @ (522,32) — #323843 / radius 48 */}
      <div className="absolute top-8 left-[522px] flex h-23 w-220 items-center justify-center rounded-[48px] bg-heading px-12">
        <h1 className="truncate text-[36px] leading-10 font-extrabold text-white">
          {lesson?.title ?? ''}
        </h1>
      </div>

      {/* 경과 시간 146×56 @ (1504,50) — 클릭하면 전환 간격 조정 */}
      <button
        type="button"
        onClick={() => setShowInterval(true)}
        title={`슬라이드 전환 간격 ${intervalSec}초 — 눌러서 조정`}
        className="absolute top-[50px] left-[1504px] flex h-14 w-[146px] cursor-pointer items-center justify-center gap-2 rounded-[32px] border-2 border-muted-foreground bg-background text-heading"
      >
        <HugeiconsIcon icon={Clock01Icon} className="size-5.5" />
        <span className="text-[16px] leading-[18px] font-extrabold tabular-nums">
          {formatElapsed(elapsed)}
        </span>
      </button>

      {/* 수업 마치기 174×56 @ (1666,50) */}
      <button
        type="button"
        onClick={() => setShowExitConfirm(true)}
        className="absolute top-[50px] left-[1666px] flex h-14 w-[174px] cursor-pointer items-center justify-center gap-2 rounded-[32px] border-2 border-muted-foreground bg-background text-heading"
      >
        <HugeiconsIcon icon={Door01Icon} className="size-5.5" />
        <span className="text-[16px] leading-[18px] font-bold">수업 마치기</span>
      </button>

      {/* 좌우 이동 버튼 — 지름 88 원 @ (89,547) / (1743,547) */}
      <button
        type="button"
        onClick={() => setSlideIdx((i) => Math.max(i - 1, 0))}
        disabled={!canPrev}
        title="이전 슬라이드"
        className="absolute top-[547px] left-[89px] flex size-22 cursor-pointer items-center justify-center rounded-full border border-muted-foreground bg-background text-heading transition disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowLeft02Icon} className="size-12" />
      </button>
      <button
        type="button"
        onClick={() => setSlideIdx((i) => Math.min(i + 1, Math.max(total - 1, 0)))}
        disabled={!canNext}
        title="다음 슬라이드"
        className="absolute top-[547px] left-[1743px] flex size-22 cursor-pointer items-center justify-center rounded-full border border-muted-foreground bg-background text-heading transition disabled:opacity-40"
      >
        <HugeiconsIcon icon={ArrowRight02Icon} className="size-12" />
      </button>

      {/* 슬라이드 카드 1446×834 @ (237,174) — 안쪽 여백 24, 슬라이드 1398×786 */}
      <div className="absolute top-[174px] left-[237px] h-[834px] w-[1446px] rounded-[40px] bg-card p-6 shadow-[0_8px_20px_#aa937566]">
        <div className="relative size-full overflow-hidden rounded-3xl border border-[#e8e8f3] bg-muted">
          {current == null ? (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              재생목록이 아직 준비되지 않았어요
            </div>
          ) : current.type === 'image' ? (
            // 본문 클릭으로 자동 진행 일시정지 ⇄ 재생 토글
            <img
              src={current.value}
              alt={`슬라이드 ${slideIdx + 1}`}
              onClick={() => setPaused((p) => !p)}
              className="size-full cursor-pointer object-contain"
            />
          ) : current.type === 'youtube' && videoId ? (
            <YoutubeStep key={slideIdx} videoId={videoId} onDone={goNext} />
          ) : current.type === 'video' ? (
            // 영상 스텝 — 자동 재생, 끝나면 다음 항목으로
            <div className="flex size-full items-center justify-center bg-heading/95">
              <video
                key={slideIdx}
                src={current.value}
                autoPlay
                controls
                onEnded={goNext}
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

          {paused && (
            <>
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex size-24 items-center justify-center rounded-full bg-black/50 text-white">
                  <HugeiconsIcon icon={PauseIcon} className="size-12" fill="currentColor" />
                </span>
              </span>
              <span className="absolute bottom-4 left-4 rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-white">
                ⏸ 잠깐 멈춤 — 화면을 클릭하면 다시 재생돼요
              </span>
            </>
          )}
        </div>
      </div>

        {total > 0 && !listHidden && (
          <Timeline playlist={playlist} activeIdx={slideIdx} onSelect={setSlideIdx} />
        )}

        {showInterval && (
          <IntervalPopup
            initial={intervalSec}
            onConfirm={(v) => {
              setIntervalSec(v)
              setShowInterval(false)
            }}
            onClose={() => setShowInterval(false)}
          />
        )}

        {showExitConfirm && (
          <ExitConfirm
            onClose={() => setShowExitConfirm(false)}
            onAction={(action) => {
              if (action === 'exit') {
                router.history.back()
                return
              }
              setListHidden(action === 'hideList')
              setShowExitConfirm(false)
            }}
          />
        )}

        {/* 다음 이미지 사전 캐싱 */}
        {canNext && playlist[slideIdx + 1]?.type === 'image' && (
          <img src={playlist[slideIdx + 1].value} alt="" className="hidden" />
        )}
    </div>
  )
}

// 하단 타임라인 — 재생목록을 슬라이드별 썸네일로 배치. 클릭하면 해당 순서로 점프.
function Timeline({
  playlist,
  activeIdx,
  onSelect,
}: {
  playlist: { type: 'image' | 'youtube' | 'music' | 'video'; value: string }[]
  activeIdx: number
  onSelect: (idx: number) => void
}) {
  const stripRef = useRef<HTMLDivElement | null>(null)

  // 활성 타일을 항상 시야 중앙 근처로
  useEffect(() => {
    stripRef.current
      ?.querySelector(`[data-idx="${activeIdx}"]`)
      ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeIdx])

  return (
    // 스펙 화면에는 없는 보조 UI — 공개했을 때만 카드 하단에 떠 있게 둔다
    <footer className="absolute inset-x-0 bottom-4 z-20 px-6">
      <div
        ref={stripRef}
        className="mx-auto flex max-w-[1400px] justify-center-safe gap-2.5 overflow-x-auto rounded-2xl bg-card/85 p-2 backdrop-blur-sm"
      >
        {playlist.map((item, i) => {
          const ytId = item.type === 'youtube' ? youtubeId(item.value) : null
          return (
            <button
              key={i}
              type="button"
              data-idx={i}
              onClick={() => onSelect(i)}
              title={`${i + 1}번째 슬라이드`}
              className={cn(
                'relative aspect-video w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-muted transition',
                i === activeIdx
                  ? 'ring-2 ring-[#f5a031] ring-offset-1'
                  : 'opacity-55 hover:opacity-100',
              )}
            >
              {item.type === 'image' ? (
                <img src={item.value} alt="" className="size-full object-cover" />
              ) : item.type === 'youtube' ? (
                <>
                  {ytId && (
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                      alt=""
                      className="size-full object-cover"
                    />
                  )}
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-5 w-7 items-center justify-center rounded-md bg-[#f03] text-[10px] text-white">
                      ▶
                    </span>
                  </span>
                </>
              ) : item.type === 'video' ? (
                <span className="flex size-full items-center justify-center bg-heading/90 text-xl">
                  🎬
                </span>
              ) : (
                <span className="flex size-full items-center justify-center bg-heading/90 text-xl">
                  🎵
                </span>
              )}
              <span className="absolute bottom-0.5 left-1 text-[10px] font-bold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.8)]">
                {i + 1}
              </span>
            </button>
          )
        })}
      </div>
    </footer>
  )
}

// 슬라이드 전환 간격 조정 팝업 — 초 단위 스테퍼(1~60), 확인해야 적용된다
function IntervalPopup({
  initial,
  onConfirm,
  onClose,
}: {
  initial: number
  onConfirm: (value: number) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-heading/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl border bg-card p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-xl font-extrabold text-heading">슬라이드 전환 간격</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          slideshow 전환시간 간격을 조정합니다
        </p>
        <div className="mt-7 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setValue((v) => Math.max(1, v - 1))}
            className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-secondary text-2xl font-bold text-heading transition hover:bg-secondary/70"
          >
            −
          </button>
          <span className="w-24 text-5xl font-extrabold text-heading tabular-nums">
            {value}
            <span className="ml-1 text-lg font-bold">초</span>
          </span>
          <button
            type="button"
            onClick={() => setValue((v) => Math.min(60, v + 1))}
            className="flex size-12 cursor-pointer items-center justify-center rounded-full bg-secondary text-2xl font-bold text-heading transition hover:bg-secondary/70"
          >
            +
          </button>
        </div>
        <div className="mt-8 flex gap-3">
          <Button
            onClick={() => onConfirm(value)}
            className="h-11 flex-1 rounded-full font-bold"
          >
            확인
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="h-11 flex-1 rounded-full font-bold"
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}

type ExitAction = 'hideList' | 'exit' | 'showList'

const EXIT_REASONS: { emoji: string; label: string; action: ExitAction }[] = [
  { emoji: '🫣', label: '타임라인 숨김', action: 'hideList' },
  { emoji: '🥺', label: '그만할래', action: 'exit' },
  { emoji: '😎', label: '타임라인 공개', action: 'showList' },
]

// 야옹이 메뉴 — 타임라인 숨김(슬라이드 확대) / 그만할래(나가기) / 타임라인 공개.
// 카드 3장이 겹쳐 있다가 hover 시 부채꼴로 펼쳐진다 (magicui feature-card 스타일 연출)
function ExitConfirm({
  onAction,
  onClose,
}: {
  onAction: (action: ExitAction) => void
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
            원하는 걸 하나 골라주세요 (마우스를 올려보세요)
          </p>
        </div>

        <div className="group relative mx-auto mt-8 h-44 max-w-2xl">
          {EXIT_REASONS.map((reason, i) => (
            <button
              key={reason.label}
              type="button"
              onClick={() => onAction(reason.action)}
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
          취소
        </button>
      </div>
    </div>
  )
}
