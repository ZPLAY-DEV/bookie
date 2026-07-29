export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'] as const

export function weekdayLabel(weekday: number) {
  return WEEKDAY_LABELS[weekday - 1] ?? ''
}
