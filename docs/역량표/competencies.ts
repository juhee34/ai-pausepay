// 직무별 필요 역량 표 (2026-11 확정본). 이 파일을 web/src/lib/competencies.ts에 그대로 넣는다.
// 근거와 옛 이름 바꾸기는 docs/역량표/README.md. 역량 이름은 다른 파일에 직접 쓰지 말고 여기서 가져다 쓴다.
// 직무 이름 4개는 바꾸지 않는다: 목표 직무 저장(unis.targetJob.v1)과 백업이 이 이름을 쓴다.

// NCS 직업공통능력의 의사소통·문제해결·대인관계에서 가져온 공통 역량. 4개 직무 모두에 들어간다.
export const COMMON_COMPETENCIES = ["문제 해결", "협업·리더십", "소통"] as const;

// 직무마다 8칸 = 직무 역량 5개 + 공통 역량 3개
export const JOB_COMPETENCIES = {
  "마케팅 기획": ["시장·소비자 분석", "마케팅 전략 기획", "콘텐츠 기획·제작", "데이터 기반 분석", "제휴·대외 협업", ...COMMON_COMPETENCIES],
  "데이터 분석": ["데이터 수집·정제", "통계 분석", "SQL·Python 활용", "시각화·대시보드", "인사이트 도출", ...COMMON_COMPETENCIES],
  "서비스 기획": ["사용자 조사", "요구사항 정의·화면 기획", "데이터 기반 분석", "기획 문서 작성", "프로젝트 관리", ...COMMON_COMPETENCIES],
  "재무·회계": ["전표·결산 처리", "재무제표 분석", "원가·예산 관리", "엑셀·ERP 활용", "검토·규정 준수", ...COMMON_COMPETENCIES],
} as const;

// 영수증 편집 화면의 칩 순서: 공통 역량 먼저, 그다음 직무 순서대로. 겹치는 이름(데이터 기반 분석)은 한 번만. 모두 22개.
export const ALL_COMPETENCIES = [
  ...new Set([...COMMON_COMPETENCIES, ...Object.values(JOB_COMPETENCIES).flat()]),
] as string[];

// 역량마다 뜻(AI에게도 보냄), 영수증 예, 근거. 근거는 README '근거'의 자료 이름이다.
export const COMPETENCY_INFO: Record<string, { meaning: string; example: string; source: string }> = {
  "문제 해결": { meaning: "문제의 원인을 찾고 해결 방법을 정해 실행한 경험", example: "참여율이 낮은 이유를 설문으로 찾아 운영 방식을 바꿈", source: "NCS 직업공통능력 문제해결" },
  "협업·리더십": { meaning: "팀에서 역할을 나누고 갈등을 조율하거나 팀을 이끈 경험", example: "4인 팀장으로 일정을 나누고 마감을 맞춤", source: "NCS 직업공통능력 대인관계" },
  "소통": { meaning: "생각을 글·말·발표로 전달하거나 상대를 설득한 경험", example: "결과를 발표해 다음 학기 예산을 받음", source: "NCS 직업공통능력 의사소통" },

  "시장·소비자 분석": { meaning: "시장 규모·경쟁사·소비자를 조사해 기회를 찾은 경험", example: "경쟁 앱 5개와 사용자 리뷰를 비교해 차별점을 정리함", source: "NCS 마케팅전략기획 · 마케터 채용 공고" },
  "마케팅 전략 기획": { meaning: "목표 고객과 메시지·채널을 정해 마케팅 계획을 세운 경험", example: "신입생 대상 홍보 계획을 세우고 채널별 예산을 나눔", source: "NCS 마케팅전략기획 · 마케터 채용 공고" },
  "콘텐츠 기획·제작": { meaning: "SNS·영상·카드뉴스 등 콘텐츠를 기획하고 만든 경험", example: "동아리 인스타그램 카드뉴스 10편을 기획·제작함", source: "마케터 채용 공고" },
  "데이터 기반 분석": { meaning: "숫자·지표를 보고 판단하거나 결과를 개선한 경험", example: "게시물별 도달 수를 비교해 올리는 시간을 바꿈", source: "마케터·서비스 기획 채용 공고" },
  "제휴·대외 협업": { meaning: "외부 기관·기업·다른 단체와 함께 일을 추진한 경험", example: "교내 카페와 제휴해 할인 행사를 엶", source: "마케터 채용 공고" },

  "데이터 수집·정제": { meaning: "필요한 데이터를 모으고 오류·빈칸을 정리한 경험", example: "공공데이터 3종을 합쳐 빠진 값을 정리함", source: "NCS 빅데이터 분석 · 데이터 분석 채용 공고" },
  "통계 분석": { meaning: "통계 방법으로 차이·관계를 확인한 경험", example: "설문 결과로 집단 간 차이를 검정함", source: "NCS 빅데이터 분석 · 데이터 분석 채용 공고" },
  "SQL·Python 활용": { meaning: "SQL·Python 같은 도구로 데이터를 직접 다룬 경험", example: "Python으로 매출 데이터를 월별로 집계함", source: "데이터 분석 채용 공고" },
  "시각화·대시보드": { meaning: "그래프·대시보드로 결과를 한눈에 보이게 만든 경험", example: "동아리 회원 현황 대시보드를 만들어 공유함", source: "NCS 빅데이터 분석 · 데이터 분석 채용 공고" },
  "인사이트 도출": { meaning: "분석 결과에서 결론과 제안을 끌어낸 경험", example: "이탈 사용자 특징을 찾아 개선안 2개를 제안함", source: "데이터 분석 채용 공고" },

  "사용자 조사": { meaning: "인터뷰·설문·관찰로 사용자의 불편을 찾은 경험", example: "학생 10명을 인터뷰해 불편 3가지를 정리함", source: "서비스 기획 채용 공고" },
  "요구사항 정의·화면 기획": { meaning: "필요한 기능을 정하고 화면 흐름·와이어프레임을 그린 경험", example: "예약 기능의 화면 5개를 와이어프레임으로 그림", source: "서비스 기획 채용 공고" },
  "기획 문서 작성": { meaning: "기획서·정책서·보고서를 써서 내용을 정리한 경험", example: "행사 기획서를 써서 학과 승인을 받음", source: "서비스 기획 채용 공고" },
  "프로젝트 관리": { meaning: "일정·할 일·사람을 관리해 프로젝트를 끝까지 이끈 경험", example: "8주 프로젝트 일정표를 만들고 주마다 점검함", source: "서비스 기획 채용 공고" },

  "전표·결산 처리": { meaning: "거래를 기록하고 기간을 마감해 정리한 경험", example: "학생회 회계로 영수증을 정리해 학기 결산을 함", source: "NCS 회계·감사 직무기술서" },
  "재무제표 분석": { meaning: "재무제표를 읽고 회사·조직의 상태를 해석한 경험", example: "기업 3곳의 재무제표로 수익성을 비교함", source: "NCS 회계·감사 직무기술서 · 회계 현직자 답변" },
  "원가·예산 관리": { meaning: "비용을 계산하고 예산을 세우거나 관리한 경험", example: "행사 예산 200만 원을 항목별로 나눠 관리함", source: "NCS 예산 직무기술서" },
  "엑셀·ERP 활용": { meaning: "엑셀 함수·피벗이나 ERP로 업무를 처리한 경험", example: "엑셀 피벗으로 지출 내역을 월별로 정리함", source: "NCS 회계·감사 직무기술서 · 회계 현직자 답변" },
  "검토·규정 준수": { meaning: "숫자·서류를 꼼꼼히 확인하고 규정에 맞게 처리한 경험", example: "지출 증빙을 규정과 대조해 누락 3건을 찾음", source: "NCS 회계·감사 직무기술서" },
};

// 옛 임시 표의 이름 → 새 이름. 옛 영수증을 읽을 때 바꾼다 (receipt-store.ts의 read).
// '사용자 조사'는 이름이 같아 표에 없다.
export const LEGACY_COMPETENCY_NAMES: Record<string, string> = {
  "시장 분석": "시장·소비자 분석",
  "기획력": "마케팅 전략 기획",
  "콘텐츠 제작": "콘텐츠 기획·제작",
  "데이터 분석": "데이터 기반 분석",
  "발표·설득": "소통",
  "커뮤니케이션": "소통",
  "협업": "협업·리더십",
  "문제 정의": "문제 해결",
  "통계": "통계 분석",
  "도구 활용(SQL·엑셀)": "SQL·Python 활용",
  "시각화": "시각화·대시보드",
  "문서 작성": "기획 문서 작성",
  "회계 지식": "재무제표 분석",
  "재무 분석": "재무제표 분석",
  "도구 활용(엑셀)": "엑셀·ERP 활용",
  "정확성": "검토·규정 준수",
};

// 옛 이름을 새 이름으로 바꾸고 겹친 이름은 하나로. 표에 없는 이름은 지우지 않는다.
export function normalizeCompetencies(names: readonly string[]): string[] {
  return [...new Set(names.map((name) => LEGACY_COMPETENCY_NAMES[name] ?? name))];
}

// 영수증 AI에게 보내는 목록: 한 줄에 '이름: 뜻'
export function competencyGuide(): string {
  return ALL_COMPETENCIES.map((name) => `- ${name}: ${COMPETENCY_INFO[name]?.meaning ?? ""}`).join("\n");
}

// 공백 지도 각주에 쓰는 출처 문장
export const COMPETENCY_SOURCE_NOTE =
  "직무별 필요 역량은 NCS 능력단위·직업공통능력과 실제 채용 공고를 보고 팀이 정리한 표예요(2026년 11월). 회사마다 다를 수 있어요.";
