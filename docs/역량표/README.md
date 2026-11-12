# 직무별 필요 역량 표 (확정 초안)

> **11/12 개정:** 공통 역량 3개를 '자소서 역량 30개'로 넓히고, 기록 구분 9개와 직무 만들기를 더했어요. 지금 기준은 `스펙기록-직무만들기.md`와 개정된 `competencies.ts`예요. 아래 11/5 내용 중 직무 전문 역량 표는 그대로 유효해요.

2026-11-05 · A(juhee34) 정리 · 같은 폴더(`docs/역량표/`)의 `competencies.ts`가 `web/src/lib/competencies.ts`에 들어갈 내용입니다.

## 원칙

- **직무마다 8칸 = 직무 역량 5개 + 공통 역량 3개.** 공통 역량은 NCS 직업공통능력(2026.4.28 개편)의 의사소통·문제해결·대인관계에서 가져왔습니다.
- **영수증으로 증명할 수 있는 행동 이름**만 씁니다. 성격('정확성')이나 지식('회계 지식')은 행동으로 바꿨습니다.
- **태그는 22개.** AI가 헷갈리지 않게 줄였고, 마케팅·서비스 기획은 '데이터 기반 분석'을 같이 씁니다.
- 직무 이름 4개는 그대로라 목표 직무 저장·백업은 바뀌지 않습니다.

## 표

| 직무 | 직무 역량 5개 |
|---|---|
| 마케팅 기획 | 시장·소비자 분석 · 마케팅 전략 기획 · 콘텐츠 기획·제작 · 데이터 기반 분석 · 제휴·대외 협업 |
| 데이터 분석 | 데이터 수집·정제 · 통계 분석 · SQL·Python 활용 · 시각화·대시보드 · 인사이트 도출 |
| 서비스 기획 | 사용자 조사 · 요구사항 정의·화면 기획 · 데이터 기반 분석 · 기획 문서 작성 · 프로젝트 관리 |
| 재무·회계 | 전표·결산 처리 · 재무제표 분석 · 원가·예산 관리 · 엑셀·ERP 활용 · 검토·규정 준수 |
| 공통 (4개 직무 모두) | 문제 해결 · 협업·리더십 · 소통 |

역량마다 뜻·영수증 예·근거는 `competencies.ts`의 `COMPETENCY_INFO`에 있습니다.

## 옛 이름 → 새 이름

이미 저장된 영수증은 읽을 때 자동으로 바꿉니다 (`normalizeCompetencies`). 표에 없는 이름은 지우지 않습니다.

| 옛 이름 | 새 이름 |
|---|---|
| 시장 분석 | 시장·소비자 분석 |
| 기획력 | 마케팅 전략 기획 (뜻이 애매함, 영수증에서 직접 고칠 수 있음) |
| 콘텐츠 제작 | 콘텐츠 기획·제작 |
| 데이터 분석 | 데이터 기반 분석 |
| 발표·설득, 커뮤니케이션 | 소통 |
| 협업 | 협업·리더십 |
| 문제 정의 | 문제 해결 |
| 통계 | 통계 분석 |
| 도구 활용(SQL·엑셀) | SQL·Python 활용 |
| 시각화 | 시각화·대시보드 |
| 문서 작성 | 기획 문서 작성 |
| 회계 지식, 재무 분석 | 재무제표 분석 |
| 도구 활용(엑셀) | 엑셀·ERP 활용 |
| 정확성 | 검토·규정 준수 |

`사용자 조사`는 이름이 같아 그대로입니다.

### 주의: 직무에 따라 공백 지도에서 안 잡히는 옛 영수증

이름은 직무와 상관없이 하나로만 바꿉니다. 그래서 아래 세 경우는 바뀐 이름이 **그 직무의 8칸에 없어서** 공백 지도 칸에 잡히지 않습니다. 영수증 자체는 그대로 남고, 영수증 화면에서 역량을 다시 고르면 잡힙니다.

| 목표 직무 | 옛 이름 → 새 이름 | 그 직무에서 고르면 좋은 이름 |
|---|---|---|
| 데이터 분석 | 데이터 분석 → 데이터 기반 분석 | 통계 분석, 인사이트 도출 |
| 서비스 기획 | 기획력 → 마케팅 전략 기획 | 요구사항 정의·화면 기획 |
| 재무·회계 | 문서 작성 → 기획 문서 작성 | 검토·규정 준수 |

시범 운영(11/21) 전에 바꾸면 옛 영수증이 거의 없어서 영향이 작습니다. 팀 테스트용 영수증만 다시 고르면 됩니다.

## Claude Code 프롬프트

브랜치 `feature/competency-table` · 계획 모드로 붙여 넣기 · `competencies.ts`·영수증·공백 지도는 B 파일이라 PR은 B가 확인합니다.

```
main을 최신으로 받고 feature/competency-table 브랜치를 새로 만든 다음 시작해 줘.

docs/역량표/README.md와 docs/역량표/competencies.ts를 읽고 직무별 필요 역량 표를 확정본으로 바꿔 줘. 먼저 계획만 보여 줘.
competencies.ts, receipt-store.ts, api/receipt, career/** 는 B 파일이라 PR은 B가 확인해. 바꾸는 파일과 줄을 계획에 정확히 적어 줘.

1) web/src/lib/competencies.ts를 docs/역량표/competencies.ts 내용으로 바꾸기.
   직무 이름 4개(마케팅 기획·데이터 분석·서비스 기획·재무·회계)는 그대로라 목표 직무 저장·파일 백업·계정 백업은 바뀌지 않아야 해.
2) 옛 이름 바꾸기: web/src/lib/receipt-store.ts의 read()에서 영수증마다 competencies를 normalizeCompetencies()로 바꿔 읽기.
   저장 키(unis.receipts.v1)와 형식은 그대로 두고, 다음에 저장할 때 새 이름으로 써지게.
   파일 가져오기와 계정 백업 받기 뒤에도 같은 read()를 거치는지 확인해서 계획에 적어 줘.
3) web/src/app/api/receipt/route.ts:
   - user 메시지의 "고를 수 있는 역량" 줄을 competencyGuide()로 바꿔 이름과 뜻을 함께 보내기
   - 시스템 프롬프트 예시 답의 역량을 "콘텐츠 기획·제작, 협업·리더십"으로
   - zod enum은 지금처럼 ALL_COMPETENCIES
4) web/src/app/career/skills/page.tsx:
   - 예시 데이터(EXAMPLE_RECEIPTS)의 역량 이름을 새 이름으로 바꾸되, 마케팅 기획 기준으로 시안(docs/design-ref/04-역량공백지도.png)처럼 채움 4개쯤이 나오게
   - 각주의 "직무별 필요 역량은 임시 표예요." 문장을 COMPETENCY_SOURCE_NOTE로
5) 영수증 편집 화면(career/receipts/receipt-editor.tsx)의 역량 칩은 ALL_COMPETENCIES 순서(공통 먼저)를 그대로 쓰기. 칩이 22개라 폰 375px에서 줄바꿈이 깔끔한지 확인.
6) 저장소 전체에서 옛 역량 이름(위 표의 왼쪽 열)이 글자로 남은 곳을 찾아 계획에 적어 줘. web/src/lib/skill-gap.ts 맨 위 확인용 예시 주석, web/tests/skill-gap.test.mjs도 포함.
   docs/PRD.md의 직무별 역량 표(201~208줄)와 '나중에 할 일'의 역량 표 채우기, CLAUDE.md의 "직무별 필요 역량 표는 임시" 줄도 새 표 기준으로 바꾸고 '임시' 표시를 지워 줘.
7) 옛 이름 바꾸기 테스트를 web/tests/에 새로 만들어 줘: normalizeCompetencies, ALL_COMPETENCIES가 22개이고 공통 3개가 먼저인지, 직무마다 8칸인지.

끝나면 확인:
- 옛 이름('협업', '시장 분석')으로 저장된 영수증이 있을 때 공백 지도의 새 칸(협업·리더십, 시장·소비자 분석)에 잡히는지
- 옛 이름 영수증을 파일로 가져오거나 계정 백업에서 받은 뒤에도 새 이름으로 보이는지
- 새 영수증을 만들면 AI가 목록 안의 이름만 고르는지 (실제 경험 3개)
- next build · ESLint 통과
```

## 근거

- NCS 마케팅전략기획 능력단위 — [한국산업인력공단 웹진](https://webzine.hrdkorea.or.kr/section/webzine/view?id=7109), [공공기관 NCS 직무설명자료](https://c.incru.it/newjobpost/2020/05_airport0529/[%EA%B3%B5%EA%B3%A0%EB%AC%B8%20%EB%B6%99%EC%9E%84]%20%EC%A7%81%EB%AC%B4%EA%B8%B0%EC%88%A0%EC%84%9C.pdf)
- NCS 빅데이터 분석 능력단위 — [이태원 외(2020), 정보시스템연구](https://koreascience.kr/article/JAKO202009252092414.pdf)
- NCS 회계·감사·예산 — [예술경영지원센터 직무기술서(경영지원팀)](https://www.gokams.or.kr:443/DATA/GO/NCS%20직무기술서_정규직_6급_경영지원팀.pdf)
- 직업공통능력 7개 영역 — [고용노동부 보도자료(2026.4.28)](https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=19314), [아주경제](https://www.ajunews.com/view/20260428105725136)
- 서비스 기획 공고 — [서비스 기획 채용공고 뜯어보기](https://brunch.co.kr/@@RrV/13)
- 데이터 분석 공고 — [NielsenIQ 신입](https://jobs.smartrecruiters.com/NielsenIQ/744000053907596--), [쿠팡 CX Product Analytics](https://refresh.cv/jobs/coupang/087edbba-d04a-470c-b707-45f019b5fc59?lang=ko)
- 마케터 공고 — [i-boss 주니어 마케터](https://www.i-boss.co.kr/ab-2795-6435), [고려대 CDC 에코마케팅](https://biz.korea.ac.kr/cdc/recruitment/recruitment_view?no=12010)
- 회계 현직자 답변 — [코멘토](https://www.comento.kr/job-questions/모든회사/회계/현직자가_보시기에%20취준생%20스펙%20중%20가장%20눈여겨보는%20요소는%20무엇인가요-629881)
