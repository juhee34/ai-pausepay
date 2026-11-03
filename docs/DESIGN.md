# 우니스 디자인 규칙

모든 화면은 이 문서를 따릅니다. 색·글꼴·모서리는 `web/src/app/globals.css`의 `@theme`에 이름으로 등록되어 있으니, 코드에서는 색 코드(#…) 대신 **이름**(`bg-brand`, `text-muted` 등)을 씁니다.
모양만 있는 공통 부품은 `web/src/components/ui`에 있고, 폰에서 `/design`을 열면 모두 모아 볼 수 있습니다.

## 색

| 쓰임 | 색 | Tailwind 이름 |
|---|---|---|
| 바탕 | `#F2F1F4` | `canvas` (`bg-canvas`) |
| 블록 | `#FFFFFF` | `surface` |
| 블록 안 구분선 | `#F0EEF2` | `divider` |
| 바깥 테두리 (탭바·입력칸에만) | `#EAE7EC` | `line` |
| 글자 | `#1C1A1E` | `ink` |
| 보조 글자 | `#6B6570` | `muted` |
| 포인트(버건디) | `#8C1D40` | `brand` |
| 옅은 포인트 | `#F8EEF1` | `brand-soft` |
| 진한 포인트 (누를 때) | `#6E1632` | `brand-strong` |

### 일정 종류

| 종류 | 글자 / 배경 | 점·테두리 | Tailwind 이름 |
|---|---|---|---|
| 과제 | `#2756A6` / `#E4EBF8` | 글자색과 같음 | `assignment`, `assignment-soft` |
| 퀴즈 | `#22553A` / `#E3F1E7` | 점 `#2F7A4C` | `quiz`, `quiz-soft`, `quiz-dot` |
| 시험 | 포인트색 / `#F8EEF1` | 포인트색 | `exam`, `exam-soft` |
| 확인 필요 | `#7A4300` / `#FFF6E8` | 테두리 `#F2C98A`, 점 `#C77A00` | `review`, `review-soft`, `review-line`, `review-dot` |

### 포인트색 아껴 쓰기
- 포인트색으로 **꽉 채운 블록은 화면당 하나**만.
- 그 밖의 포인트색은 **오늘 날짜, 현재 시각 선, D-day 숫자, 주요 버튼**에만.

### 다크 모드
이번 학기에는 만들지 않습니다. 새 화면은 밝은 화면만 만듭니다.

## 글꼴

- 본문: **IBM Plex Sans KR** (400·500·600·700) → `font-sans` (기본값이라 따로 안 써도 됨)
- 숫자·시간·날짜·D-day: **IBM Plex Mono** (500·600) → `font-mono`
- 둘 다 `web/src/app/layout.tsx`에서 `next/font/google`로 불러옵니다.

| 쓰임 | 크기 / 굵기 | Tailwind |
|---|---|---|
| 화면 제목 | 22px / 700 | `text-[22px] font-bold` |
| 섹션 제목 | 15px / 700 | `text-[15px] font-bold` |
| 본문 | 14~15px | `text-sm` 또는 `text-[15px]` |
| 보조 | 12px | `text-xs` |
| 작은 라벨 | 11px | `text-[11px]` |

## 모양

- **블록형**: 회색 바탕(`canvas`) 위에 흰 블록(`surface`).
  - 블록은 테두리·그림자 없이 모서리 18~20px (`rounded-block` 20px, `rounded-block-sm` 18px).
  - 블록 사이는 8~10px (`gap-2`~`gap-2.5`).
- 블록 안은 **가는 구분선(`divider`)으로만** 나눕니다.
- 블록 안 강조 블록(옅은 포인트, 모서리 16px `rounded-callout`)은 **하나만** 둡니다(AI 추천).
- 좌우 여백 16px (`px-4`), 블록 안쪽 여백 12~14px (`p-3`~`p-3.5`).
- **같은 정보·바로가기를 두 곳에 두지 않습니다.** 기능 사이 이동은 하단 탭바에서 합니다.
- 버튼 모서리 10~14px (`rounded-button` 12px).
- 누를 수 있는 것은 **최소 44px** (`min-h-11`).
- 아이콘은 `lucide-react`, 선 굵기 1.8 (`strokeWidth={1.8}`).

## 레이아웃

- 폰(폭 375~430px) 기준으로 만듭니다. PC에서는 가운데에 **최대 폭 480px**.
- **하단 탭바** (흰색, 위쪽 얇은 테두리 `line`), 5칸:
  - 홈 `/` · 일정 `/calendar` · **＋** · 시험 대비 `/exam` · 메일 `/mail`
  - 가운데 ＋는 48px 둥근 포인트색 버튼. 누르면 **더보기** 창(`BottomSheet`)이 올라옵니다. 지금은 집중 모드가 있고, 새 기능은 탭을 늘리지 않고 여기에 더합니다.
  - 계획서·캡쳐 올리기는 일정 탭에서 합니다.

## 공통 부품 (`web/src/components/ui`)

| 부품 | 하는 일 |
|---|---|
| `AppShell` | 회색 바탕, 최대 폭 480px, 좌우 여백 |
| `BottomTabBar` | 현재 탭 표시, 가운데 ＋ 더보기 메뉴. 모든 화면에 붙도록 `layout.tsx`가 그림 |
| `Block` | 흰 블록 |
| `Button` | `primary`(포인트색) / `secondary`(흰색·테두리) / `ghost`(글자만) |
| `Badge` | 일정 종류별 색 (과제·퀴즈·시험·확인 필요) |
| `CheckRow` | 왼쪽 시각 또는 체크박스 + 제목/보조 글 + 오른쪽 배지·버튼 자리 |
| `WeekStrip` | 월~일, 오늘은 포인트색 원, 일정 있는 날 아래 점 |
| `SegmentedTabs` | 목록 \| 달력 같은 두세 칸 전환 |
| `BottomSheet` | 아래에서 올라오는 창, 뒤 배경 어둡게, 손잡이 |

부품은 **모양만** 가집니다. 저장·AI 같은 기능은 각 화면에서 붙입니다.
