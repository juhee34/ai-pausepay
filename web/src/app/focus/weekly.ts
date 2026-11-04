// 주차별 집중 시간 계산. 화면 코드 없이 함수만 둔다. 주는 월요일에 시작한다.
//
// 확인용 예시 (오늘 2026-11-04 수요일, 최근 6주 = 9/28, 10/5, ... 11/2 주)
// 11/2 25분 + 11/4 50분 → 11/2 주 75분. 11/1(일) 25분 → 10/26 주. 9/27 25분 → 6주 밖이라 합계에서 빠진다.

export type WeekBar = {
  start: string; // 그 주 월요일 YYYY-MM-DD
  minutes: number;
  isExam: boolean;
  isCurrent: boolean;
};

function toYmd(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

function mondayOf(date: Date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

// 오래된 주부터 차례로 돌려준다. examDates(YYYY-MM-DD)가 든 주는 시험 주다.
export function weeklyMinutes(
  records: { minutes: number; finishedAt: number }[],
  now: number,
  examDates: string[],
  count = 6,
): WeekBar[] {
  const thisMonday = mondayOf(new Date(now));
  const bars: WeekBar[] = [];
  const byStart = new Map<string, WeekBar>();
  for (let i = count - 1; i >= 0; i--) {
    const monday = new Date(thisMonday);
    monday.setDate(monday.getDate() - i * 7);
    const bar = { start: toYmd(monday), minutes: 0, isExam: false, isCurrent: i === 0 };
    bars.push(bar);
    byStart.set(bar.start, bar);
  }

  for (const record of records) {
    const bar = byStart.get(toYmd(mondayOf(new Date(record.finishedAt))));
    if (bar) bar.minutes += record.minutes;
  }
  for (const date of examDates) {
    const [y, m, d] = date.split("-").map(Number);
    const bar = byStart.get(toYmd(mondayOf(new Date(y, m - 1, d))));
    if (bar) bar.isExam = true;
  }
  return bars;
}
