export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'] as const

// 일차 ↔ 과목 고정 (시트 규칙: 1일차 책놀이 … 5일차 사회정서)
export const DAY_CATEGORY = ['책놀이', '미술', '음악', '신체', '사회정서'] as const

// 카테고리별 범례/뱃지 색 (디자인 팔레트 기준)
export const CATEGORY_COLORS: Record<string, string> = {
  책놀이: '#fbb93c',
  미술: '#bc52cb',
  음악: '#f3505c',
  신체: '#2dbcb6',
  사회정서: '#f2709f',
}

// 수업 시작 버튼 그라데이션 (밝은 톤 → 기본 톤, 위→아래) — 요일 과목 색을 따라간다
export const CATEGORY_GRADIENTS: Record<string, [string, string]> = {
  책놀이: ['#fbb93c', '#f28c2b'],
  미술: ['#d06edd', '#bc52cb'],
  음악: ['#f97b84', '#f3505c'],
  신체: ['#45cfc7', '#2dbcb6'],
  사회정서: ['#f791b4', '#f2709f'],
}
