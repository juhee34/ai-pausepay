# PAUSEPAY (web)

세이브브레이크 팀의 AI 소비 쿨다운 서비스 PAUSEPAY 웹앱입니다. Next.js(App Router) +
Tailwind CSS로 만든 모바일 반응형 웹앱이며, Supabase(DB/Auth)와 Claude API를 사용합니다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 이후 실제 키 값으로 채우기
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 환경변수

`.env.local.example`을 복사해 `.env.local`을 만들고 아래 값을 채워야 합니다. 이 파일은
`.gitignore`에 포함되어 있어 커밋되지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 ([console.anthropic.com](https://console.anthropic.com)) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

배포 시에는 Vercel 프로젝트 Settings → Environment Variables에 동일한 값을 등록합니다.

## 폴더 구조

```
src/
  app/
    page.tsx              # 랜딩 화면
    api/risk-score/       # 위험도 계산 + Claude 피드백 API
  lib/
    supabase.ts           # Supabase 클라이언트 (getSupabase())
    claude.ts             # Claude API 클라이언트 + 피드백 생성
    risk-score.ts          # 규칙 기반 충동구매 위험도 계산
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint 검사
```

전체 개발 로드맵과 Git 협업 가이드는 저장소 루트의 [ROADMAP.md](../ROADMAP.md)를 참고하세요.
