export const MAIL_SITUATIONS = [
  {
    id: "grade",
    label: "성적 문의",
    guide: "성적에 대해 정중히 확인을 요청하는 메일. 성적을 올려 달라고 조르지 않습니다.",
    attachmentHint: "보여 드릴 과제나 시험 자료가 있으면 첨부했는지 확인해요.",
  },
  {
    id: "absence",
    label: "결석 사유",
    guide: "결석 사유를 알리고 출석 인정이나 보강 방법을 여쭙는 메일.",
    attachmentHint: "진단서나 확인서 같은 증빙 서류를 첨부했는지 확인해요.",
  },
  {
    id: "recommendation",
    label: "추천서 부탁",
    guide: "추천서를 부탁하는 메일. 어디에 낼 추천서인지와 마감일을 적고, 거절해도 괜찮다는 뜻을 담습니다.",
    attachmentHint: "이력서, 성적표, 지원 공고를 첨부했는지 확인해요.",
  },
  {
    id: "meeting",
    label: "면담 요청",
    guide: "면담을 요청하는 메일. 면담 목적을 밝히고, 교수님 편한 시간에 맞추겠다는 뜻을 담습니다.",
    attachmentHint: "면담 때 볼 자료가 있으면 첨부했는지 확인해요.",
  },
  {
    id: "extension",
    label: "과제 연장",
    guide: "과제 제출 기한 연장을 부탁하는 메일. 어떤 과제인지, 이유, 얼마나 연장을 바라는지 적습니다.",
    attachmentHint: "사유를 보여 줄 서류나 지금까지 한 과제가 있으면 첨부했는지 확인해요.",
  },
] as const;

export type MailSituationId = (typeof MAIL_SITUATIONS)[number]["id"];

export const MAIL_SITUATION_IDS = MAIL_SITUATIONS.map((s) => s.id) as [
  MailSituationId,
  ...MailSituationId[],
];

export const MAX_COURSE_LENGTH = 50;
export const MAX_STUDENT_ID_LENGTH = 20;
export const MAX_MESSAGE_LENGTH = 500;

// AI는 실제 학번을 받지 않고 이 빈칸으로 초안을 쓴다. 브라우저가 실제 학번으로 바꾼다.
export const STUDENT_ID_PLACEHOLDER = "[학번]";
