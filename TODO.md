# TODO — 콘텐츠 명세(입력 템플릿 v5) 반영 업그레이드

기준: [북키톡키 콘텐츠 입력 템플릿 v5 (구글 시트)](https://docs.google.com/spreadsheets/d/1GXfzT7GVdvHQSdQdl8HGHTUhF4jBGnIJ8ImhBk4U54w/) + 신규 대시보드 시안(2026-08-04).
목표: 시트의 5개 데이터 시트(주차정보·일차정보·수업단계·준비물·미디어)를 그대로 담을 수 있는 스키마/스토리지로 개편하고, 신규 시안 UI로 업데이트한다.

## 0. 시트 ↔ 테이블 매핑 현황

확정(2026-08-04): 콘텐츠 스키마는 **`weeks` + `lessons` 2테이블**. 수업단계/준비물/미디어는 lesson의 순수 구성요소(1:1 소유·주차 단위 통째 교체)라 `lessons`의 jsonb로 흡수하고, `weeks`는 1:N 부모(주차가 수업보다 먼저 존재, 사이드바 12주차)라 분리 유지.

| 시트 | 대응 (확정) | 변경 |
|---|---|---|
| 주차정보 | `weeks` (weekNo/theme/subtitle) | 없음 |
| 일차정보 | `lessons` 기본 컬럼 + `thumbnailFile`/`lessonPdfFile`/`guidePdfFile` | `materials` 폐기·흡수, `weekday`→`dayIndex` |
| 수업단계 | `lessons.flow` (jsonb) | `lesson_steps` 폐기 |
| 준비물 | `lessons.preps` (jsonb) | `lesson_preps` 폐기 |
| 미디어 | `lessons.media` (jsonb) | 별도 테이블 없음 |
| (파생) 슬라이드 | `lessons.slideCount` | 인제스트 시 파일 개수 산출 |

## 1. 스토리지(R2) 재구성 — 수업 자료는 `lessons/w{주차}d{일차}/` 폴더로

- [x] 키 구조 변경: 일차별 자료를 한 폴더에 모은다
  ```
  lessons/w1d1/w1d1.png            ← 썸네일 (일차별 메인 이미지)
  lessons/w1d1/w1d1_lesson.pdf     ← 수업자료 PDF (다운로드)
  lessons/w1d1/w1d1_guide.pdf      ← 지도안 PDF (다운로드)
  lessons/w1d1/w1d1_slide01.png…   ← 웹 재생용 슬라이드 (향후)
  lessons/w1d1/w1d1_audio1.mp3…    ← 음악 (향후)
  ```
- [x] 기존 오브젝트 마이그레이션: `images/lessons/w1-fri.png` → `lessons/w1d5/w1d5.png` (월~금 = d1~d5 대응, 5개 전부), `materials/w1/fri/guide.pdf` → `lessons/w1d5/w1d5_guide.pdf` 등 (로컬 + 원격 R2 모두)
- [x] `images/` 프리픽스는 그대로 유지 (아바타 등 앱 UI 자산용 — 수업 자료 아님)
- [x] `apps/api/scripts/seed-r2.sh`·시드 데이터의 키를 새 구조로 갱신
- [x] 소스 파일 보관 위치도 정리: `apps/api/scripts/assets/lessons/w1-fri.png` → `w1d5.png` 등 파일명 규칙 통일

## 2. DB 테이블 수정 — ✅ 완료 (2026-08-04, 마이그레이션 0006·0007)

- [x] `lessons` 개편: `weekday`→`dayIndex`, `thumbnailFile`/`lessonPdfFile`/`guidePdfFile`/`slideCount` 추가, **`flow`/`preps`/`media` jsonb** 추가
- [x] `lesson_steps`/`lesson_preps`/`materials` 테이블 삭제 + `/api/materials` 라우트 제거
- [x] jsonb 형태는 lessons 쓰기 라우트의 zod 스키마로 검증 (flow: intro/activities≤4/wrapup, media kind enum)
- [x] 로컬·원격 DB 적용 + 시드를 구글 시트 1주차 실데이터로 교체 (80분, 단계 유형, 준비물, 미디어 큐 2건)

## 3. 인제스트 (콘텐츠팀 전달물 → DB/R2)

- [ ] 구글 시트(또는 엑셀 export) → DB 반영 스크립트: 주차정보/일차정보/수업단계/준비물/미디어 5개 시트 파싱, **주차 단위 통째 교체**(부분 패치 금지 원칙)
- [ ] 구글 드라이브 폴더 → R2 이관 스크립트: 파일명 규칙 검증 후 `lessons/w{w}d{d}/` 키로 업로드
- [ ] 검수 자동화(시트 §검수 체크리스트): 필수 필드 채움, 단계 분 합계=시간, 미디어 시트 파일명/링크 형식, 파일명 규칙 일치, 참조 파일의 R2 존재 여부
- [ ] 실행 방법 문서화 (LOCALSTACK/REMOTESTACK에 시드 절차 갱신)

## 4. API

- [x] lesson 상세 응답에 `stage` 포함된 steps, `media`(신설), `thumbnailFile`/`lessonPdfFile`/`guidePdfFile` 기반 다운로드 URL 반영
- [x] `/api/files/*`는 그대로 사용 (키 구조만 변경) — 웹/콘솔의 URL 조합 헬퍼에 `lessons/w{w}d{d}/` 규칙 반영
- [x] `materials` 라우트 제거에 따른 hono 클라이언트 타입 영향 확인

## 5. 웹 UI — 신규 시안 반영 (2026-08-04 목업)

- [ ] **사이드바 상단에 로고**(`logo-title.svg` 가로형) 추가
- [x] 수업 흐름: 제목 "수업 흐름 {시간}분", **[도입]/[활동]/[마무리] 필 뱃지 + 활동 항목 ①②③④ 번호** 그룹 렌더링 (stage 기반), 분 우측 정렬 유지
- [x] 준비물: 라디오 체크 토글 → **번호 원형(1·2·3…) 리스트**로 변경
- [x] 하단 카드: 제목 아래 **"{요일}요일 {과목}" 카테고리 라벨** (카테고리 색 적용)
- [ ] 카테고리 색 팔레트 재조정 (신규 시안 기준: 월 책톡=노랑, 화 그림톡=보라, 수 소리톡=핑크레드, 목 몸톡=청록, 금 마음톡=핑크 — 확정 hex는 시안 파일에서 추출 필요)
- [ ] 수업 시작 버튼 톤·옆 장식(책 아이콘) 등 히어로 디테일 시안 맞춤
- [ ] 헤더 아바타를 사용자 프로필(카카오 프로필 이미지 `users.profileImageUrl`)로 교체
- [ ] (다음 단계) "수업 시작" 웹 플레이어: 슬라이드 전체화면 + `lesson_media` 큐로 유튜브 iframe/오디오 오버레이 — PRD §5

## 6. 콘솔

- [x] lessons 폼/상세: dayIndex·stage·thumbnailFile·PDF 파일명·slideCount·media 반영, materials 표시부 제거
- [ ] (선택) media 인라인 편집 또는 read-only 표시

## 7. 결정 필요 (작업 전 확인)

- [ ] `materials` 테이블 폐기 vs 유지 — 본 TODO는 **폐기(lessons 컬럼 흡수)** 를 전제로 작성 (시트=스키마 1:1 원칙). 유지 사유가 있으면 §2·§4·§6 조정
- [ ] 슬라이드 장수: `slideCount` 컬럼안 확정 여부 (대안: R2 list 실시간 조회)
- [ ] PPT→슬라이드 이미지 변환: 교육팀 수동 export vs 자동 파이프라인 (명세 §10 — 미결)
- [ ] 신규 시안 카테고리 색·마스코트 이미지 원본 파일 전달 방식
