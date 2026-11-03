// 대외활동 종류. 서버(공고 AI)와 화면이 같이 쓰므로 "use client" 파일과 나눠 둔다.
export const ACTIVITY_KINDS = ["대외활동", "공모전", "인턴", "자격증", "채용", "동아리"] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];
