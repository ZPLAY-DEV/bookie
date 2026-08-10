import type { ReactNode } from 'react'

// 디자인 기준 해상도 — 모든 페이지는 이 1920×1080 캔버스 안에서 픽셀이 보장된다.
// 캔버스는 축소/확대 없이 원본 크기 그대로 표시하고, 뷰포트가 더 크면 가운데 정렬,
// 더 작으면 우측/하단부터 잘려서 가려진다 (XD 스펙 뷰와 같은 방식).
// m-auto: 공간이 남으면 중앙, 모자라면 auto 마진이 0이 되어 좌상단 기준으로 클리핑된다.
const DESIGN_W = 1920
const DESIGN_H = 1080

export function ScaledViewport({ children }: { children: ReactNode }) {
  return (
    // 캔버스 밖 여백은 캔버스(#f7f7f5)보다 한 톤 어둡게 두어 1920×1080 경계가 보이게 한다
    <div className="fixed inset-0 flex overflow-hidden bg-muted">
      <div
        className="relative m-auto bg-background"
        style={{ width: DESIGN_W, height: DESIGN_H, flexShrink: 0 }}
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
