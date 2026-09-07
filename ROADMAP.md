# PAUSEPAY 개발 로드맵

> 보기 좋은 버전(체크리스트 포함): 팀 Claude 대화에 공유된 아티팩트 링크 참고.
> 이 파일은 저장소에 버전 관리되는 원본 텍스트입니다.

## 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| Frontend | Next.js + TypeScript + Tailwind | App Router 하나로 화면·API 관리, Tailwind 브레이크포인트로 모바일 반응형 |
| DB/Auth | Supabase | 서버 코드 없이 Postgres + Auth 사용 |
| AI | Claude API (Anthropic SDK) | 위험도 근거 문장, 기회비용 문구, 리포트 코멘트 생성. 이미지 입력으로 캡처 인식도 가능 |
| 배포 | Vercel | main push 시 자동 배포, PR마다 미리보기 URL |

## 기능 우선순위 (6개 중 최소 4개)

| # | 기능 | 우선순위 |
| --- | --- | --- |
| 1 | 구매 전 소비 등록 | 필수 |
| 2 | AI 3초 질문 (구매 이유 선택) | 필수 |
| 3 | AI 충동구매 위험도 분석 | 필수 |
| 4 | 가상 쿨다운 금고 (24h/3일/7일) | 필수 |
| 6 | 심리 태그 & 방어 리포트 | 강력 권장 (발표 임팩트) |
| 5 | AI 기회비용 시각화 | 여유될 때 (③ 응답에 문구 추가) |

## 역할 분담

- **김주희 (팀장)**: 저장소/배포/환경변수 관리, 소비 등록 화면(①), 쿨다운 금고(④), Android QA
- **정희경**: Claude API 프롬프트 설계, 위험도 분석(③), 방어 리포트(⑥), DB 스키마, iOS QA

각 라운드 종료 시 서로의 PR을 교차 리뷰하며 코드를 공유한다.

## 5라운드 일정 (2026-09-08 ~ 2026-11-16)

1. **09.08–09.21 기획 확정 & 개발환경 세팅** — 차별점 정리, 기능 확정, Next.js/Supabase 세팅,
   로컬↔GitHub 원격 연결, 와이어프레임, DB 스키마 초안
2. **09.22–10.05 소비 등록 & AI 3초 질문 (①②)** — 입력 화면, 이유 선택 UI, Supabase Auth,
   모바일 브레이크포인트 기준
3. **10.06–10.19 위험도 분석 & 쿨다운 금고 (③④)** — 규칙 기반 점수 + Claude API 프롬프트,
   타이머/가상 금고 UI, API 키 환경변수 분리
4. **10.20–11.02 기회비용 & 방어 리포트 (⑥, 여유시 ⑤)** — 월간 리포트, 실기기 반응형 점검,
   전체 흐름 통합 테스트
5. **11.03–11.16 QA, 배포 & 발표 준비** — 사용성 테스트, Vercel 배포, 시연 영상, README/발표자료

## Git 워크플로우

```bash
# 최초 1회: 로컬 저장소를 GitHub 원격에 연결
git remote add origin <저장소 URL>
git branch -M main
git push -u origin main

# 기능 작업마다 반복
git checkout main && git pull
git checkout -b feature/기능이름
# ... Claude Code로 코드 작성 ...
git add .
git status                      # 커밋될 파일 재확인
git commit -m "feat: 상품 등록 화면 구현"
git push -u origin feature/기능이름
# GitHub에서 PR 생성 → 팀원 리뷰/승인 → merge → 로컬 main 다시 pull
```

**커밋 컨벤션**: `feat`(기능) · `fix`(버그) · `style`(스타일) · `refactor`(구조 개선) ·
`docs`(문서) · `chore`(설정/기타)

**보안**: `ANTHROPIC_API_KEY`, Supabase 키는 `web/.env.local`에만 저장한다(`.gitignore`로
제외됨). 배포 시 Vercel 프로젝트 Settings → Environment Variables에 동일 값을 등록한다.

**충돌 발생 시**: `git pull`로 원격 변경을 먼저 받고, `<<<<<<<` 충돌 마커를 함께 확인해
어느 코드를 남길지 상의한 뒤 커밋한다. 확신 없이 `git push --force`를 쓰지 않는다.
