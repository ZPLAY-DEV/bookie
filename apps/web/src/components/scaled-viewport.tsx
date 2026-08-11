import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

// 디자인 기준 해상도 — 모든 페이지는 이 1920×1080 캔버스 안에서 픽셀이 보장된다.
// 뷰포트가 더 작으면 캔버스를 통째로 축소해 화면 안에 다 들어오게 하고(레이아웃은 그대로),
// 더 크면 확대하지 않고 원본 크기로 가운데 정렬한다.
const DESIGN_W = 1920
const DESIGN_H = 1080

function fitScale() {
  return Math.min(
    window.innerWidth / DESIGN_W,
    window.innerHeight / DESIGN_H,
    1,
  )
}

export function ScaledViewport({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(fitScale)

  useEffect(() => {
    const onResize = () => setScale(fitScale())
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return (
    // 캔버스 밖 여백은 캔버스(#f7f7f5)보다 한 톤 어둡게 두어 1920×1080 경계가 보이게 한다
    <div className="fixed inset-0 overflow-hidden bg-muted">
      {/* transform 은 레이아웃 크기를 바꾸지 않으므로 flex 로는 중앙 정렬이 안 된다
          (축소해도 1920×1080 자리를 차지해 auto 마진이 0이 된다).
          top/left 50% + translate(-50%,-50%) 로 배율과 무관하게 가운데 고정한다. */}
      <div
        className="absolute top-1/2 left-1/2 bg-background"
        style={{
          width: DESIGN_W,
          height: DESIGN_H,
          transform: `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {children}
        {/* 외곽선은 오버레이로 그린다.
            - 캔버스에 직접 border 를 주면 콘텐츠 박스가 1918×1078 로 줄어 본문이 넘치고 스크롤바가 생긴다
            - inset 그림자는 부모 배경 레이어라 흰 사이드바(304×1080)가 좌변·상하단 좌측을 덮어버린다 */}
        <div className="pointer-events-none absolute inset-0 border border-[#dcdcd5]" />
      </div>
    </div>
  )
}
