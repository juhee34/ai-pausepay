// AI가 날짜를 못 찾은 일정("8주차 중간고사", "11월 둘째 주 조별 발표")의 날짜 후보를 고른다.
// 그 주를 찾고, 그 주에 그 과목 수업이 있는 요일을 먼저 낸다(시간표가 있을 때). 고르는 건 사용자다.

import { addDays } from "./briefing";
import { mondayOf, weekdayOf } from "./day-plan";
import { WEEKDAYS, type ClassSlot } from "./timetable";

// 2026년 2학기 개강일. 이 날이 든 주(월요일 시작)가 1주차다. 학기가 바뀌면 여기만 고친다.
export const SEMESTER_START = "2026-09-01";

const ORDINALS: Record<string, number> = { 첫: 1, 둘: 2, 셋: 3, 넷: 4, 다섯: 5 };

// 원문에서 그 주의 월요일을 찾는다. 못 찾으면 null.
export function weekMondayFromText(text: string) {
  const week = text.match(/(\d{1,2})\s*주\s*차/);
  if (week) {
    const n = Number(week[1]);
    if (n >= 1 && n <= 20) return addDays(mondayOf(SEMESTER_START), (n - 1) * 7);
  }

  const monthWeek = text.match(/(\d{1,2})\s*월\s*(첫|둘|셋|넷|다섯|마지막)\s*째?\s*주/);
  if (monthWeek) {
    const month = Number(monthWeek[1]);
    if (month < 1 || month > 12) return null;
    const startYear = Number(SEMESTER_START.slice(0, 4));
    // 2학기 계획서의 1·2월은 다음 해
    const year = month < Number(SEMESTER_START.slice(5, 7)) - 6 ? startYear + 1 : startYear;
    const first = `${year}-${String(month).padStart(2, "0")}-01`;
    if (monthWeek[2] === "마지막") {
      const last = addDays(`${month === 12 ? year + 1 : year}-${String((month % 12) + 1).padStart(2, "0")}-01`, -1);
      return mondayOf(last);
    }
    // 1일이 금·토·일이면 그 주는 앞 달 주로 보고, 다음 월요일부터 첫째 주로 센다.
    const firstWeek = ["금", "토", "일"].includes(weekdayOf(first))
      ? addDays(mondayOf(first), 7)
      : mondayOf(first);
    return addDays(firstWeek, (ORDINALS[monthWeek[2]] - 1) * 7);
  }
  return null;
}

function sameCourse(a: string, b: string) {
  const norm = (s: string) => s.replace(/\s/g, "");
  const x = norm(a);
  const y = norm(b);
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
}

// 날짜 후보 최대 3개 (날짜순). 그 과목 수업 요일 → 나머지 평일 순으로 채운다.
export function dateCandidates(text: string, course: string, timetable: ClassSlot[]) {
  const monday = weekMondayFromText(text);
  if (!monday) return [];

  const classDays = new Set(timetable.filter((s) => sameCourse(s.course, course)).map((s) => s.day));
  const weekdays = WEEKDAYS.slice(0, 5);
  const ordered = [...weekdays.filter((d) => classDays.has(d)), ...weekdays.filter((d) => !classDays.has(d))];

  return ordered
    .slice(0, 3)
    .map((day) => {
      const date = addDays(monday, WEEKDAYS.indexOf(day));
      return { date, weekday: weekdayOf(date), hasClass: classDays.has(day) };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
