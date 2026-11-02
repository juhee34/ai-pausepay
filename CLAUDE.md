# 우니스 (UNIS) — 대학생을 위한 AI 학업 비서

> 이름의 뜻: **UNIfied Student** — "흩어진 대학 생활을 하나로 잇는 학생 비서". UNI는 '하나'(unify), S는 학생(Student). 첫 사용자와 시범 운영 대상은 광운대생입니다.

## 이 프로젝트
- 모바일 우선 반응형 웹앱 프로토타입. 2인 팀이 2026년 10~11월에 만들고, 11/17~11/30 시범 운영(기말 대비) 후 발표합니다.
- **기능 범위와 완료 기준은 `docs/PRD.md`가 기준입니다.** 배경 자료는 `docs/소개서.md`, `docs/개발가이드.md`에 있고, 두 문서가 PRD와 다르면 PRD를 따릅니다.
- **코드는 `web/` 폴더**(Next.js 16, App Router, `web/src/app`)에 있습니다. `web/AGENTS.md`의 규칙(이 Next.js 버전의 문서를 먼저 확인)도 따릅니다. 실행은 `cd web` 후 `npm run dev`.
- 이 레포는 이전 주제 **PAUSEPAY(소비 쿨다운 가계부)**로 시작했습니다. `ROADMAP.md`, `web/src/app/api/risk-score`, `web/src/lib/risk-score.ts`, 홈 화면 문구는 PAUSEPAY 시절 것입니다. 우니스로 바꾸면서 필요 없는 코드는 **지우기 전에 팀에게 먼저 물어봅니다.** `web/src/lib/claude.ts`, `web/src/lib/supabase.ts`는 그대로 재사용합니다.

## 우리 팀에게 설명하는 법
- 두 사람 모두 코딩 초보입니다. 설명은 한국어로 쉽게, 전문 용어는 한 줄로 풀어 주세요.
- 코드를 바꾸기 전에 **무엇을, 어떤 파일에서, 왜** 바꾸는지 계획부터 보여 주세요.
- 한 번에 기능 하나씩. 끝나면 확인 방법(`web` 폴더에서 `npm run dev`, 폰에서 확인할 것)을 알려 주세요.
- 모르는 명령을 실행하기 전에 그 명령이 무엇을 하는지 먼저 설명해 주세요.

## 이번 학기에 만드는 것
**핵심 4개 (반드시)**
1. 강의계획서 → 캘린더 (대표 기능) — `web/src/app/calendar`. 강의계획서 PDF 또는 **KLAS 화면 캡쳐(이미지)**를 올리면 AI가 날짜를 인식
2. 오늘의 브리핑 (홈 화면) — `web/src/app/page.tsx`
3. 시험 대비 팩 — `web/src/app/exam`
4. 교수님 메일 작성기 — `web/src/app/mail`

**여건 되면** (핵심 4개가 폰에서 모두 돌아간 뒤에만): 우니스 리서치 `web/src/app/research`, 졸업요건 계산기 `web/src/app/graduation`, 집중 모드 `web/src/app/focus`, 스펙 영수증 `web/src/app/career`, 우니스 인사이트(사용 기록 분석)

**만들지 않음**: KLAS 직접 연동(로그인·자동 가져오기). KLAS 정보는 사용자가 캡쳐해서 올리는 방식으로만 받습니다.

요청받지 않은 '여건 되면' 기능을 먼저 만들거나 폴더를 미리 만들지 마세요.

## 기술
- Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 (+ 필요하면 shadcn/ui), 배포는 Vercel, 협업은 GitHub
- AI는 Claude API. **호출은 `web/src/app/api/` 안의 서버 코드에서만** 하고, Claude 연결은 `web/src/lib/claude.ts`의 `getAnthropic()`을 재사용합니다(지금은 파일 안에서만 쓰이니, 필요하면 export). 키는 `web/.env.local`의 `ANTHROPIC_API_KEY`, 배포 때는 Vercel 환경 변수에 넣습니다.
- 웹앱 AI 비용은 API 크레딧으로 나갑니다. 빠르고 가벼운 모델을 기본으로, 답변은 스트리밍으로 보여 줍니다.
- 개인 데이터(일정·성적·기록)는 브라우저 `localStorage`에만 저장합니다. 서버로는 보내지 않습니다.
- 이미 설치된 것: `@anthropic-ai/sdk`, `@supabase/supabase-js`. 필요할 때 추가할 부품: `zod`, `ics`, `unpdf`, `date-fns`, `lucide-react`, `sonner` (`docs/개발가이드.md`의 참고 자료 참고). 새 패키지는 설치 전에 이유를 설명합니다.

## 디자인
- 폰 화면(폭 375px) 먼저, 하단 탭바, 포인트 색 1개, 둥근 카드, 넓은 여백

## 꼭 지킬 것
- `web/.env.local`은 절대 커밋하지 않습니다. API 키를 코드나 채팅에 쓰지 않습니다.
- `main`에 직접 커밋하지 않습니다. `feature/기능이름` 브랜치 → PR로 합칩니다. 커밋 메시지는 `feat: …`, `fix: …`, `style: …`, `docs: …`
- `git push --force`는 쓰지 않습니다.
- AI가 뽑은 결과(특히 날짜)는 **사용자가 확인·수정한 뒤** 저장합니다.
- 올린 강의자료는 그 사람 학습에만 쓰고 서버에 저장·공유하지 않습니다(저작권). 화면에 안내 문구를 둡니다.
- PDF·이미지는 올리기 전에 크기를 확인하고, 4MB가 넘으면 안내합니다 (Vercel 요청 4.5MB 제한).
- AI 주소 보호: 기기당 하루 사용 횟수 제한, 입력·답변 길이 상한.
- 다른 레포 코드를 참고하면 출처를 주석으로 남깁니다. 라이선스 표시가 없는 레포는 구조만 참고하고 코드는 복사하지 않습니다.

## 완료 기준
- Vercel 주소를 **휴대폰으로 열어서** 동작해야 완료입니다.
- 각 기능은 `docs/PRD.md`의 '끝났다는 기준'을 만족해야 합니다.
