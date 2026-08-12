export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'] as const

// 일차 ↔ 과목 매핑은 console과 공유하는 규칙이라 정의가 @bookie/lesson-meta 한 곳에만
// 있다. 기존 import 경로(@/lib/lesson-meta)를 유지하려고 여기서 재수출한다.
export { DAY_CATEGORY } from '@bookie/lesson-meta'

// 카테고리별 범례/뱃지 색 (디자인 팔레트 기준)
export const CATEGORY_COLORS: Record<string, string> = {
  책톡: '#ffc02d',
  소리톡: '#bc52cb',
  마음톡: '#f571a0',
  그림톡: '#f3505c',
  몸톡: '#2dbcb6',
}

// 흰 배경 위 라벨 텍스트용 색. 책톡 노랑(#ffc02d)만 그대로 쓰면 읽기 어려워
// 디자인이 진한 주황을 따로 지정했다. 나머지 과목은 강조색을 그대로 쓴다.
export const CATEGORY_LABEL_COLORS: Record<string, string> = {
  책톡: '#f5a031',
}

export function categoryLabelColor(category: string) {
  return (
    CATEGORY_LABEL_COLORS[category] ?? CATEGORY_COLORS[category] ?? '#878b94'
  )
}
