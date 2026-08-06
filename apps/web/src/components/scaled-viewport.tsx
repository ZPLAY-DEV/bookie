import type { ReactNode } from 'react'

// 디자인 기준 해상도 — 모든 페이지는 이 1920×1080 캔버스 안에서 픽셀이 보장된다.
// 캔버스는 축소/확대 없이 원본 크기 그대로 표시하고, 뷰포트가 더 크면 가운데 정렬,
// 더 작으면 우측/하단부터 잘려서 가려진다 (XD 스펙 뷰와 같은 방식).
// m-auto: 공간이 남으면 중앙, 모자라면 auto 마진이 0이 되어 좌상단 기준으로 클리핑된다.
const DESIGN_W = 1920
const DESIGN_H = 1080

export function ScaledViewport({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <div className="m-auto" style={{ width: DESIGN_W, height: DESIGN_H, flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}
