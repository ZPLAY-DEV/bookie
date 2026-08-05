export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금'];
export function weekdayLabel(weekday) {
    return WEEKDAY_LABELS[weekday - 1] ?? '';
}
