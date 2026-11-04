"use client";

// 시험 대비 팩 채점 결과를 이 기기 브라우저에만 보관한다. 서버로는 보내지 않는다.
// 오늘의 한 가지가 과목별 예상 득점률로 쓴다 (getLatestAccuracy).

export type ExamResult = {
  course: string;
  correct: number;
  total: number;
  finishedAt: number;
};

export const EXAM_RESULTS_KEY = "unis.examResults.v1";

// 오래된 결과가 끝없이 쌓이지 않게 최근 것만 남긴다.
export const MAX_EXAM_RESULTS = 200;

export function isExamResult(value: unknown): value is ExamResult {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.course === "string" &&
    r.course.length > 0 &&
    Number.isInteger(r.correct) &&
    Number.isInteger(r.total) &&
    (r.total as number) > 0 &&
    (r.correct as number) >= 0 &&
    (r.correct as number) <= (r.total as number) &&
    typeof r.finishedAt === "number" &&
    Number.isFinite(r.finishedAt)
  );
}

export function readExamResults(): ExamResult[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(EXAM_RESULTS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isExamResult) : [];
  } catch {
    return [];
  }
}

export function saveExamResult(result: ExamResult) {
  try {
    const next = [...readExamResults(), result].slice(-MAX_EXAM_RESULTS);
    localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(next));
  } catch {
    // 저장 공간을 못 써도 채점 화면은 그대로 보여 준다.
  }
}

// 단답형을 '맞은 걸로 치기'로 고치면 방금 저장한 점수도 고친다. finishedAt으로 찾는다.
export function updateExamResultCorrect(finishedAt: number, correct: number) {
  try {
    const next = readExamResults().map((r) =>
      r.finishedAt === finishedAt ? { ...r, correct: Math.min(r.total, Math.max(0, correct)) } : r,
    );
    localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(next));
  } catch {
    // 저장 공간을 못 써도 채점 화면은 그대로 보여 준다.
  }
}

// 그 과목의 가장 최근 정답률(0~1). 결과가 없으면 null.
export function getLatestAccuracy(course: string) {
  const latest = readExamResults()
    .filter((r) => r.course === course)
    .sort((a, b) => b.finishedAt - a.finishedAt)[0];
  return latest ? latest.correct / latest.total : null;
}
