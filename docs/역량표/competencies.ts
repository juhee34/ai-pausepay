// 역량 목록 (2026-11-12 개정, A). 11/5 표를 넓혔다.
// - 자소서 역량 30개: 어떤 직무를 준비하든 쓰는 공통 역량. NCS 직업기초능력 하위능력과
//   직업공통능력(2026.4.28 개편)을 학생이 쓰는 말로 바꿨다. 6개씩 5묶음.
// - 직무 역량: 추천 직무 4개에만 있는 전문 역량 5개씩 (11/5 표 그대로).
// - 추천 직무 = 직무 역량 5개 + 그 직무에 잘 맞는 자소서 역량 3개 = 8칸.
// - 목록에 없는 직무는 학생이 '직무 만들기'에서 이 목록 중 6~10개를 골라 만든다 (custom-job-store.ts).
// 역량 이름은 다른 파일에 직접 쓰지 말고 여기서 가져다 쓴다.

export const SKILL_GROUPS = [
  { id: "attitude", label: "일하는 태도", names: ["책임감", "성실성", "도전정신", "주도성", "끈기", "꼼꼼함"] },
  { id: "people", label: "함께 일하기", names: ["협업", "리더십", "소통", "설득·발표", "갈등 조정", "고객 지향"] },
  { id: "thinking", label: "생각하는 힘", names: ["문제 해결", "분석력", "창의성", "기획력", "의사결정", "전략적 사고"] },
  { id: "doing", label: "실행과 관리", names: ["실행력", "일정 관리", "자원·예산 관리", "위기 대처", "변화 적응", "학습 능력"] },
  { id: "tools", label: "도구와 전문성", names: ["문서 작성", "외국어 활용", "데이터 활용", "디지털·AI 활용", "전공 지식 활용", "직업윤리"] },
] as const;

export type SkillName = (typeof SKILL_GROUPS)[number]["names"][number];
export const SKILLS = SKILL_GROUPS.flatMap((g) => g.names) as SkillName[];

export const JOB_SKILLS = {
  "마케팅 기획": ["시장·소비자 분석", "마케팅 전략 기획", "콘텐츠 기획·제작", "데이터 기반 분석", "제휴·대외 협업"],
  "데이터 분석": ["데이터 수집·정제", "통계 분석", "SQL·Python 활용", "시각화·대시보드", "인사이트 도출"],
  "서비스 기획": ["사용자 조사", "요구사항 정의·화면 기획", "데이터 기반 분석", "기획 문서 작성", "프로젝트 관리"],
  "재무·회계": ["전표·결산 처리", "재무제표 분석", "원가·예산 관리", "엑셀·ERP 활용", "검토·규정 준수"],
} as const;

export type PresetJob = keyof typeof JOB_SKILLS;
export const PRESET_JOBS = Object.keys(JOB_SKILLS) as PresetJob[];
export type JobSkillName = (typeof JOB_SKILLS)[PresetJob][number];
export type CompetencyName = SkillName | JobSkillName;

// 추천 직무의 8칸. 자소서 역량 3개는 직무마다 다르게 골랐다.
export const JOB_COMPETENCIES: Record<PresetJob, readonly CompetencyName[]> = {
  "마케팅 기획": [...JOB_SKILLS["마케팅 기획"], "창의성", "협업", "소통"],
  "데이터 분석": [...JOB_SKILLS["데이터 분석"], "문제 해결", "꼼꼼함", "소통"],
  "서비스 기획": [...JOB_SKILLS["서비스 기획"], "문제 해결", "협업", "소통"],
  "재무·회계": [...JOB_SKILLS["재무·회계"], "꼼꼼함", "책임감", "직업윤리"],
};

// 칩 목록과 AI에 보내는 목록: 자소서 역량 30개 → 직무 역량 순서
export const ALL_COMPETENCIES = [
  ...new Set<string>([...SKILLS, ...Object.values(JOB_SKILLS).flat()]),
] as CompetencyName[];

export const CUSTOM_JOB_MIN = 6;
export const CUSTOM_JOB_MAX = 10;

export type CompetencyInfo = { desc: string; source: string };

const NCS = "NCS 직업기초능력";
export const COMPETENCY_INFO: Record<CompetencyName, CompetencyInfo> = {
  // 일하는 태도
  책임감: { desc: "맡은 일을 끝까지 해내고 결과에 책임을 짐", source: `${NCS} 직업윤리(근로윤리)` },
  성실성: { desc: "약속과 규칙을 지키며 꾸준히 해냄", source: `${NCS} 직업윤리(근로윤리)` },
  도전정신: { desc: "해 보지 않은 일이나 높은 목표에 먼저 나섬", source: "기업 인재상 공통 키워드" },
  주도성: { desc: "시키기 전에 할 일을 찾아 먼저 움직임", source: `${NCS} 자기개발(자기관리)` },
  끈기: { desc: "어려움이 있어도 포기하지 않고 계속함", source: `${NCS} 자기개발(자기관리)` },
  꼼꼼함: { desc: "숫자와 사실을 확인해 실수를 줄임", source: `${NCS} 문제해결(문제처리) · 직업윤리(근로윤리)` },
  // 함께 일하기
  협업: { desc: "역할을 나눠 맡고 팀과 함께 완수함", source: `${NCS} 대인관계(팀워크)` },
  리더십: { desc: "목표를 세우고 팀을 이끌어 움직이게 함", source: `${NCS} 대인관계(리더십)` },
  소통: { desc: "상대의 말을 듣고 내 생각을 알기 쉽게 전함", source: `${NCS} 의사소통(경청·의사표현)` },
  "설득·발표": { desc: "근거를 들어 발표하거나 상대를 설득함", source: `${NCS} 의사소통(의사표현) · 대인관계(협상)` },
  "갈등 조정": { desc: "의견이 부딪힐 때 원인을 찾아 조율함", source: `${NCS} 대인관계(갈등관리)` },
  "고객 지향": { desc: "고객·사용자의 불편을 듣고 해결함", source: `${NCS} 대인관계(고객서비스)` },
  // 생각하는 힘
  "문제 해결": { desc: "막힌 원인을 찾아 대안을 비교하고 골라 해결함", source: `${NCS} 문제해결(문제처리)` },
  분석력: { desc: "자료를 나눠 보고 원인과 흐름을 찾아냄", source: `${NCS} 문제해결(사고력) · 수리` },
  창의성: { desc: "새로운 방식이나 아이디어를 내서 적용함", source: `${NCS} 문제해결(사고력)` },
  기획력: { desc: "목표와 순서를 정해 실행 계획을 세움", source: `${NCS} 조직이해(경영이해) · 자원관리` },
  의사결정: { desc: "기준을 세워 여러 선택지 중 하나를 고름", source: "직업공통능력 문제해결(의사결정)" },
  "전략적 사고": { desc: "전체 상황과 길게 보는 목표를 함께 생각함", source: `${NCS} 조직이해(경영이해)` },
  // 실행과 관리
  실행력: { desc: "계획을 실제 행동으로 옮겨 결과를 냄", source: "기업 인재상 공통 키워드" },
  "일정 관리": { desc: "마감과 우선순위를 정해 시간을 나눠 씀", source: `${NCS} 자원관리(시간관리)` },
  "자원·예산 관리": { desc: "돈·물건·사람을 아껴 효율적으로 씀", source: `${NCS} 자원관리(예산·물적·인적자원)` },
  "위기 대처": { desc: "예상 못 한 문제가 생겼을 때 빠르게 수습함", source: `${NCS} 문제해결(문제처리)` },
  "변화 적응": { desc: "새 환경이나 규칙에 빠르게 맞춰 일함", source: `${NCS} 자기개발 · 조직이해` },
  "학습 능력": { desc: "필요한 지식을 스스로 찾아 배우고 써먹음", source: `${NCS} 자기개발(경력개발)` },
  // 도구와 전문성
  "문서 작성": { desc: "보고서·기획서처럼 읽는 사람이 쓰기 좋은 글을 씀", source: `${NCS} 의사소통(문서작성)` },
  "외국어 활용": { desc: "외국어로 읽고 쓰고 대화해 일을 처리함", source: `${NCS} 의사소통(기초외국어)` },
  "데이터 활용": { desc: "숫자·자료를 모아 정리하고 판단에 씀", source: `${NCS} 정보(정보처리) · 수리(도표분석)` },
  "디지털·AI 활용": { desc: "프로그램·AI 도구로 일을 더 빠르고 정확하게 함", source: "직업공통능력 AI활용능력(2026 개편) · 정보(컴퓨터활용)" },
  "전공 지식 활용": { desc: "전공에서 배운 이론을 실제 문제에 적용함", source: `${NCS} 기술(기술적용)` },
  직업윤리: { desc: "정직하게 규칙을 지키고 공동체를 생각함", source: `${NCS} 직업윤리(공동체윤리)` },
  // 직무 역량 (11/5 표)
  "시장·소비자 분석": { desc: "설문·트렌드·경쟁 조사로 시장과 타깃 고객을 정의함", source: "NCS 마케팅전략기획: 마케팅시장 환경분석" },
  "마케팅 전략 기획": { desc: "목표를 세우고 상품·가격·유통·홍보 계획을 설계함", source: "NCS 마케팅전략기획: 마케팅전략계획수립" },
  "콘텐츠 기획·제작": { desc: "채널과 대상에 맞는 콘텐츠를 기획하고 직접 만듦", source: "마케터 채용 공고" },
  "데이터 기반 분석": { desc: "성과·사용 지표를 보고 원인을 찾아 개선함", source: "NCS 마케팅 성과관리 + 채용 공고" },
  "제휴·대외 협업": { desc: "외부 기관·기업과 협업을 제안하고 성사시킴", source: "NCS 마케팅전략기획: 전략적 제휴" },
  "데이터 수집·정제": { desc: "분석할 데이터를 모으고 결측·오류를 정리함", source: "NCS 빅데이터 분석: 분석용 데이터 구축" },
  "통계 분석": { desc: "가설을 세우고 통계 기법으로 검정하거나 비교함", source: "NCS 빅데이터 분석: 통계기반 데이터 분석" },
  "SQL·Python 활용": { desc: "SQL·Python으로 데이터를 조회·처리·분석함", source: "데이터 분석 채용 공고" },
  "시각화·대시보드": { desc: "분석 결과를 차트·대시보드로 보이게 만듦", source: "NCS 빅데이터 분석: 분석 결과 시각화" },
  "인사이트 도출": { desc: "분석 결과에서 이유를 설명하고 실행할 제안을 만듦", source: "NCS 빅데이터 분석: 탐색적 데이터 분석" },
  "사용자 조사": { desc: "인터뷰·사용성 테스트·VOC로 사용자의 불편을 찾음", source: "서비스 기획 채용 공고" },
  "요구사항 정의·화면 기획": { desc: "필요한 기능과 흐름을 정의하고 화면을 설계함", source: "서비스 기획 채용 공고" },
  "기획 문서 작성": { desc: "기획서·정책서처럼 다른 사람이 보고 일할 문서를 씀", source: "서비스 기획 채용 공고" },
  "프로젝트 관리": { desc: "일정과 우선순위를 정하고 끝까지 완수함", source: "서비스 기획 채용 공고" },
  "전표·결산 처리": { desc: "거래를 기록하고 장부를 맞춰 결산함", source: "NCS 회계·감사: 전표관리, 결산처리" },
  "재무제표 분석": { desc: "재무제표를 읽고 비율 분석으로 상태를 판단함", source: "NCS 회계·감사: 재무비율분석" },
  "원가·예산 관리": { desc: "예산을 짜고 집행 실적을 비교하거나 원가를 계산함", source: "NCS 회계·감사: 원가계산 + NCS 예산" },
  "엑셀·ERP 활용": { desc: "엑셀 함수·회계 프로그램·ERP로 회계 업무를 처리함", source: "NCS 회계·감사: 회계정보시스템운용" },
  "검토·규정 준수": { desc: "증빙과 숫자를 대조해 오류를 찾고 규정대로 처리함", source: "NCS 회계·감사: 회계감사" },
};

// 기록 구분. 학생이 고르는 첫 화면. 구분마다 짧은 칸 1~3개와 처음에 보여 줄 추천 역량 3개.
// 칸 key가 "period"면 영수증의 period(기간)에 저장하고, 나머지는 detail에 저장한다.
export type SpecField = { key: string; label: string; placeholder: string };
// title·example은 이름 칸의 제목과 예시
type SpecKindDef = {
  id: string;
  label: string;
  title: string;
  example: string;
  fields: readonly SpecField[];
  suggest: readonly SkillName[];
};

export const SPEC_KINDS = [
  {
    id: "activity", label: "대외활동·동아리", title: "활동 이름", example: "대학생 마케팅 서포터즈",
    fields: [{ key: "role", label: "맡은 역할", placeholder: "기획팀장" }, { key: "period", label: "기간", placeholder: "2026.3 – 6" }],
    suggest: ["협업", "리더십", "주도성"],
  },
  {
    id: "work", label: "인턴·아르바이트", title: "이름", example: "카페 아르바이트",
    fields: [{ key: "org", label: "회사·가게", placeholder: "OO카페" }, { key: "role", label: "맡은 일", placeholder: "주말 마감 근무" }, { key: "period", label: "기간", placeholder: "2025.7 – 12" }],
    suggest: ["책임감", "고객 지향", "성실성"],
  },
  {
    id: "project", label: "프로젝트·공모전", title: "프로젝트·대회 이름", example: "교내 창업 아이디어 공모전",
    fields: [{ key: "role", label: "맡은 역할", placeholder: "데이터 분석 담당" }, { key: "outcome", label: "결과", placeholder: "본선 진출" }],
    suggest: ["문제 해결", "기획력", "협업"],
  },
  {
    id: "class", label: "수업·과제", title: "과제 이름", example: "기업 분석 팀 보고서",
    fields: [{ key: "course", label: "과목", placeholder: "경영통계" }, { key: "period", label: "학기", placeholder: "2026-1" }],
    suggest: ["분석력", "문서 작성", "협업"],
  },
  {
    id: "education", label: "교육·부트캠프", title: "과정 이름", example: "데이터 분석 입문 과정",
    fields: [{ key: "org", label: "기관", placeholder: "OO 아카데미" }, { key: "hours", label: "기간·시간", placeholder: "8주 · 64시간" }],
    suggest: ["학습 능력", "디지털·AI 활용", "전공 지식 활용"],
  },
  {
    id: "license", label: "자격증", title: "자격증 이름", example: "ADsP",
    fields: [{ key: "date", label: "취득일", placeholder: "2026.6" }, { key: "issuer", label: "발급 기관", placeholder: "한국데이터산업진흥원" }],
    suggest: ["학습 능력", "끈기", "전공 지식 활용"],
  },
  {
    id: "language", label: "어학", title: "시험·과정 이름", example: "TOEIC",
    fields: [{ key: "score", label: "점수·등급", placeholder: "TOEIC 870" }, { key: "date", label: "응시일", placeholder: "2026.5" }],
    suggest: ["외국어 활용", "학습 능력", "끈기"],
  },
  {
    id: "award", label: "수상", title: "대회 이름", example: "교내 마케팅 공모전",
    fields: [{ key: "prize", label: "상 이름", placeholder: "우수상" }, { key: "date", label: "날짜", placeholder: "2026.9" }],
    suggest: ["도전정신", "창의성", "실행력"],
  },
  {
    id: "other", label: "봉사·기타", title: "활동 이름", example: "지역 아동센터 학습 봉사",
    fields: [{ key: "period", label: "기간", placeholder: "2025.1 – 2" }],
    suggest: ["책임감", "직업윤리", "소통"],
  },
] as const satisfies readonly SpecKindDef[];

export type SpecKind = (typeof SPEC_KINDS)[number]["id"];
export const SPEC_KIND_IDS = SPEC_KINDS.map((k) => k.id) as SpecKind[];
export const MAX_SPEC_FIELD = 40;

// 옛 이름 → 새 이름. 하나가 둘로 나뉘는 이름도 있다 (협업·리더십 → 협업, 리더십).
// 새 목록에 그대로 있는 이름(협업, 기획력, 문서 작성, 소통, 문제 해결)은 바꾸지 않는다.
export const LEGACY_COMPETENCY_NAMES: Record<string, readonly CompetencyName[]> = {
  "시장 분석": ["시장·소비자 분석"],
  "콘텐츠 제작": ["콘텐츠 기획·제작"],
  "데이터 분석": ["데이터 기반 분석"],
  "발표·설득": ["설득·발표"],
  커뮤니케이션: ["소통"],
  "협업·리더십": ["협업", "리더십"],
  "문제 정의": ["문제 해결"],
  통계: ["통계 분석"],
  "도구 활용(SQL·엑셀)": ["SQL·Python 활용"],
  시각화: ["시각화·대시보드"],
  "회계 지식": ["재무제표 분석"],
  "재무 분석": ["재무제표 분석"],
  "도구 활용(엑셀)": ["엑셀·ERP 활용"],
  정확성: ["꼼꼼함"],
};

// 옛 이름을 새 이름으로 바꾸고 겹치면 하나로 합친다. 목록에 없는 이름은 지우지 않는다.
export function normalizeCompetencies(names: readonly string[]): string[] {
  return [...new Set(names.flatMap((name) => LEGACY_COMPETENCY_NAMES[name] ?? [name]))];
}

// 영수증 AI에 보내는 목록: "이름: 뜻" 한 줄씩
export function competencyGuide(): string {
  return ALL_COMPETENCIES.map((name) => `- ${name}: ${COMPETENCY_INFO[name].desc}`).join("\n");
}

export const COMPETENCY_SOURCE_NOTE =
  "자소서 역량 30개는 NCS 직업기초능력을, 추천 직무의 전문 역량은 NCS 능력단위와 실제 채용 공고를 바탕으로 팀이 정리했어요. 회사마다 다를 수 있어요.";
