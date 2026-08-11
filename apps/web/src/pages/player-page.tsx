import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearch } from '@tanstack/react-router'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  ArrowLeft02Icon,
  ArrowRight02Icon,
  Clock01Icon,
  Door01Icon,
  Loading03Icon,
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

  // 자동 넘김이 실제로 돌고 있는 구간에서만 타이머 테두리를 카운트다운시킨다
  const autoAdvancing = current?.type === 'image' && canNext

  const videoId = current?.type === 'youtube' ? youtubeId(current.value) : null
  const audioUrl = current?.type === 'music' ? current.value : null

  // 유튜브 종료/닫기 → 다음 index로 재개
  const goNext = () => setSlideIdx((i) => Math.min(i + 1, Math.max(total - 1, 0)))

  // 멈추면 덱이 올라오고, 다시 재생하면 내려간다
  function togglePause() {
    const next = !paused
    setPaused(next)
    setListHidden(!next)
  }

  // 덱 카드 선택 — 그 카드부터 재생을 재개하고 덱은 닫는다
  function playFrom(idx: number) {
    setSlideIdx(idx)
    setPaused(false)
    setListHidden(true)
  }

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
      {/* 로고 208×40 @ (80,58) — 전용 트리거가 없어 로고 클릭으로 타임라인을 여닫는다 */}
      <button
        type="button"
        onClick={() => setListHidden((h) => !h)}
        title={listHidden ? '타임라인 열기' : '타임라인 닫기'}
        className="absolute top-[58px] left-20 cursor-pointer"
      >
        <img src="/logo-horizontal.svg" alt="북키톡키" className="h-10 w-52" />
      </button>

      {/* 제목 알약 880×92 @ (522,32) — #323843 / radius 48. 화면 클릭과 같은 동작(멈춤 ⇄ 재생) */}
      <button
        type="button"
        onClick={togglePause}
        title={paused ? '다시 재생' : '잠깐 멈춤'}
        className="absolute top-8 left-[522px] flex h-23 w-220 cursor-pointer items-center justify-center rounded-[48px] bg-heading px-12"
      >
        <h1 className="truncate text-[36px] leading-10 font-extrabold text-white">
          {lesson?.title ?? ''}
        </h1>
      </button>

      {/* 경과 시간 146×56 @ (1504,50) — 클릭하면 전환 간격 조정 */}
      <button
        type="button"
        onClick={() => setShowInterval(true)}
        title={`슬라이드 전환 간격 ${intervalSec}초 — 눌러서 조정`}
        className="absolute top-[50px] left-[1504px] flex h-14 w-[146px] cursor-pointer items-center justify-center gap-2 rounded-[32px] bg-background text-heading"
      >
        {/* 테두리는 SVG 로 그려서, 전환 간격 동안 한 바퀴 지워지는 카운트다운으로 쓴다.
            pathLength=100 이라 둘레 길이 계산 없이 0→100 으로 애니메이션한다. */}
        <svg
          viewBox="0 0 146 56"
          fill="none"
          className="pointer-events-none absolute inset-0 size-full"
        >
          <rect
            // 멈췄다 다시 재생하면 자동 넘김 타이머가 처음부터 다시 시작하므로
            // (setTimeout 이 재생성된다) 테두리도 paused 가 바뀔 때마다 리셋한다
            key={`${slideIdx}-${intervalSec}-${paused}`}
            x="1"
            y="1"
            width="144"
            height="54"
            rx="27"
            pathLength={100}
            stroke="#878b94"
            strokeWidth="2"
            strokeDasharray="100"
            style={
              autoAdvancing
                ? {
                    animation: `timer-ring ${intervalSec}s linear forwards`,
                    animationPlayState: paused ? 'paused' : 'running',
                  }
                : undefined
            }
          />
        </svg>
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
            <div className="flex size-full items-center justify-center gap-3 text-muted-foreground">
              <HugeiconsIcon icon={Loading03Icon} className="size-6 animate-spin" />
              준비중입니다.
            </div>
          ) : current.type === 'image' ? (
            // 본문 클릭으로 자동 진행 일시정지 ⇄ 재생 토글
            <img
              src={current.value}
              alt={`슬라이드 ${slideIdx + 1}`}
              onClick={togglePause}
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
                ⏸ 잠깐 멈춤 — 화면이나 썸네일을 클릭하면 다시 재생돼요
              </span>
            </>
          )}

          {/* 몇 장 중 몇 번째인지 — 잠깐 멈춤 배지와 같은 모양으로 우측 하단에 */}
          {total > 0 && (
            <span className="absolute right-4 bottom-4 rounded-full bg-black/40 px-3 py-1 text-sm font-bold text-white tabular-nums">
              {slideIdx + 1}/{total}
            </span>
          )}
        </div>
      </div>

        {total > 0 && (
          <Timeline
            playlist={playlist}
            activeIdx={slideIdx}
            onSelect={playFrom}
            hidden={listHidden}
          />
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
  hidden,
}: {
  playlist: { type: 'image' | 'youtube' | 'music' | 'video'; value: string }[]
  activeIdx: number
  onSelect: (idx: number) => void
  hidden: boolean
}) {
  const stripRef = useRef<HTMLDivElement | null>(null)

  // 활성 타일을 스트립 가운데로. scrollIntoView 는 overflow-hidden 인 캔버스까지 끌어올려
  // 타임라인이 올라오는 순간 화면이 튀므로, 스트립 자체의 scrollLeft 만 움직인다.
  useEffect(() => {
    if (hidden) return
    const strip = stripRef.current
    const tile = strip?.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`)
    if (!strip || !tile) return
    strip.scrollTo({
      left: tile.offsetLeft - (strip.clientWidth - tile.clientWidth) / 2,
      behavior: 'smooth',
    })
  }, [activeIdx, hidden])

  return (
    // 스펙 화면에는 없는 보조 UI — 맥 Dock 처럼 화면 아래에서 올라왔다 내려간다
    <footer
      className={cn(
        // Tailwind v4 의 translate-y-* 는 transform 이 아니라 translate 프로퍼티를 쓴다.
        // transition 대상도 translate 로 잡아야 실제로 밀려 올라온다 (아니면 위치가 즉시 점프)
        // 위 슬라이드 카드와 같은 폭·좌표(1446 @ x=237)로 두고, 아래는 캔버스 경계선에 딱 붙인다.
        // 높이 72 = 카드 하단(1008) ~ 캔버스 하단(1080) — 덱 윗선이 카드 밑선과 만난다.
        'absolute bottom-0 left-[237px] z-20 h-18 w-[1446px] transition-[translate,opacity] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]',
        hidden
          ? 'pointer-events-none translate-y-full opacity-0'
          : 'translate-y-0 opacity-100',
      )}
    >
      <div
        ref={stripRef}
        className="flex size-full items-center justify-center-safe gap-2.5 overflow-x-auto rounded-t-2xl bg-card/85 px-2 backdrop-blur-sm"
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
                // 덱 높이가 72px 로 고정돼 확대하면 잘리므로, 확대 대신 불투명도로만 반응한다
                'relative aspect-video w-24 shrink-0 cursor-pointer overflow-hidden rounded-lg border bg-muted transition-opacity duration-200',
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

// 두 팝업(전환 간격 / 수업 마치기)이 공유하는 알약 버튼 —
// 가운데에 살짝 엇갈려 겹쳐 있다가 0.5초 뒤 좌우로 펼쳐진다
const POPUP_BTN =
  'absolute top-0 left-1/2 h-13 w-52 cursor-pointer rounded-full font-bold shadow-lg transition-[translate,rotate,scale] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] hover:scale-105'
const POPUP_BTN_STACK_L = '-rotate-6 -translate-x-[57%]'
const POPUP_BTN_STACK_R = 'z-10 rotate-6 -translate-x-[43%]'
const POPUP_BTN_SPREAD_L = '-translate-x-[104%] rotate-0'
const POPUP_BTN_SPREAD_R = 'translate-x-[4%] rotate-0'

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
  // 야옹이 팝업과 같은 연출 — 뜬 뒤 0.5초에 겹쳐 있던 버튼이 좌우로 펼쳐진다
  const [spread, setSpread] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setSpread(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-heading/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[32px] border bg-card p-12 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 야옹이 팝업과 같은 머리 구성 — 아바타 + 말풍선(22px ExtraBold) + 보조 문구 */}
        <div className="flex flex-col items-center">
          <img
            src="/images/avatar.png"
            alt=""
            className="size-20 rounded-full object-cover"
          />
          <div className="relative mt-4 rounded-2xl bg-secondary px-6 py-3">
            <span className="absolute -top-2 left-1/2 size-4 -translate-x-1/2 rotate-45 bg-secondary" />
            <p className="text-[22px] font-extrabold text-heading">
              야옹... 몇 초마다 넘길까요? 🐾
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            슬라이드 전환시간 간격을 조정합니다.
          </p>
        </div>
        <div className="mt-9 flex items-center justify-center gap-8">
          <button
            type="button"
            onClick={() => setValue((v) => Math.max(1, v - 1))}
            className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-secondary text-3xl font-bold text-heading transition hover:bg-secondary/70"
          >
            −
          </button>
          <span className="w-32 text-6xl font-extrabold text-heading tabular-nums">
            {value}
            <span className="ml-1 text-xl font-bold">초</span>
          </span>
          <button
            type="button"
            onClick={() => setValue((v) => Math.min(60, v + 1))}
            className="flex size-14 cursor-pointer items-center justify-center rounded-full bg-secondary text-3xl font-bold text-heading transition hover:bg-secondary/70"
          >
            +
          </button>
        </div>
        <div className="relative mt-10 h-13">
          <Button
            onClick={() => onConfirm(value)}
            className={cn(POPUP_BTN, spread ? POPUP_BTN_SPREAD_L : POPUP_BTN_STACK_L)}
          >
            확인
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className={cn(
              POPUP_BTN,
              'bg-card',
              spread ? POPUP_BTN_SPREAD_R : POPUP_BTN_STACK_R,
            )}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}

type ExitAction = 'exit' | 'continue'

// 야옹이 메뉴 — 확인(수업 종료) / 취소.
// 카드 2장이 겹쳐 있다가 팝업이 뜨고 0.5초 뒤 좌우로 펼쳐진다.
function ExitConfirm({
  onAction,
  onClose,
}: {
  onAction: (action: ExitAction) => void
  onClose: () => void
}) {
  const [spread, setSpread] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSpread(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-heading/40 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-[32px] border bg-card p-12 text-center shadow-2xl"
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
              야옹... 수업을 마칠까요? 🐾
            </p>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">닝겐, 원하는 걸 고르시라.</p>
        </div>

        <div className="relative mt-10 h-13">
          <Button
            onClick={() => onAction('exit')}
            className={cn(POPUP_BTN, spread ? POPUP_BTN_SPREAD_L : POPUP_BTN_STACK_L)}
          >
            확인
          </Button>
          <Button
            variant="outline"
            onClick={() => onAction('continue')}
            className={cn(
              POPUP_BTN,
              'bg-card',
              spread ? POPUP_BTN_SPREAD_R : POPUP_BTN_STACK_R,
            )}
          >
            취소
          </Button>
        </div>
      </div>
    </div>
  )
}
