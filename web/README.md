# 우니스 (web)

대학생을 위한 AI 학업 비서 우니스의 웹앱입니다. Next.js(App Router) + Tailwind CSS로 만든
모바일 반응형 웹앱이며, Claude API를 사용합니다.

## 시작하기

```bash
npm install
# .env.local 파일을 만들고 아래 환경변수 값을 채우기
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 환경변수

`.env.local`을 만들고 아래 값을 채워야 합니다. 이 파일은 `.gitignore`에 포함되어 있어
커밋되지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 ([console.anthropic.com](https://console.anthropic.com)) |
| `AI_LIMIT_SECRET` | 하루 AI 사용 횟수 쿠키의 서명값. 긴 무작위 문자열 |

`AI_LIMIT_SECRET` 값은 아래 명령으로 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

배포 시에는 Vercel 프로젝트 Settings → Environment Variables에 같은 이름으로 등록하고,
Save 후 Redeploy까지 해야 적용됩니다.

## 폴더 구조

```
src/
  app/
    page.tsx              # 오늘의 브리핑 (홈)
    calendar/             # 강의계획서 → 캘린더
    exam/                 # 시험 대비 팩
    mail/                 # 교수님 메일 작성기
    api/                  # AI를 부르는 서버 코드 (briefing, exam, mail, syllabus)
  lib/
    claude.ts             # Claude API 클라이언트 (getAnthropic())
    ai-limit.ts           # 하루 AI 사용 횟수 제한
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint 검사
```

기능 범위는 저장소 루트의 [docs/PRD.md](../docs/PRD.md), 역할과 Git 협업 규칙은
[docs/역할분담.md](../docs/역할분담.md)를 참고하세요.
