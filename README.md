# 우니스 (UNIS) — 대학생을 위한 AI 비서

수업 일정과 취업 준비를 한곳에서 챙기는 모바일 웹앱입니다. 강의계획서와 공고를 올리면 한 캘린더에 일정이 생기고, 오늘 할 일·기말 필요 점수·위험한 주를 알려 주며, 끝난 활동은 스펙 영수증으로 남깁니다.

- 팀명: 세이브브레이크 (김주희 팀장 · 정희경)
- 기능 범위·완료 기준: [docs/PRD.md](./docs/PRD.md)
- 서비스 소개: [docs/소개서.md](./docs/소개서.md) · 개발 가이드: [docs/개발가이드.md](./docs/개발가이드.md)
- Claude Code 작업 규칙: [CLAUDE.md](./CLAUDE.md)

> 이 레포는 2026학년도 AI·SW 티키타카 프로젝트의 이전 주제 **PAUSEPAY(대학생 소비 쿨다운 가계부)**로 시작했습니다. 그때의 코드와 로드맵은 Git 기록에 남아 있습니다.

## 저장소 구조

```
web/        Next.js 웹앱 (실제 코드) — web/README.md 참고
docs/       기획 문서 (PRD, 소개서, 개발 가이드)
CLAUDE.md   Claude Code가 읽는 프로젝트 설명서
*.hwp/docx  학교 제출용 행정 서류 (.gitignore로 저장소에서 제외)
```

## 빠른 시작

```bash
cd web
npm install
# web/.env.local 파일을 만들고 아래 값을 채우기 (이 파일은 절대 커밋하지 않음)
#   ANTHROPIC_API_KEY=...
#   AI_LIMIT_SECRET=...
npm run dev
```
