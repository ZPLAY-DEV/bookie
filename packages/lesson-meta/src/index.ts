// 일차 ↔ 과목 고정 매핑 (시트 규칙). 배열 인덱스 = 일차 - 1, 즉 1일차(월)=책톡.
//
// console·web이 반드시 같은 값을 봐야 하는 규칙이라 정의는 이 파일 하나뿐이다.
// 앱 쪽에 복사본을 두지 말고 여기서 import 할 것.
export const DAY_CATEGORY = ['책톡', '소리톡', '마음톡', '그림톡', '몸톡'] as const

export type DayCategory = (typeof DAY_CATEGORY)[number]
