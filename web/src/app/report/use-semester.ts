"use client";

// 결산서와 시간 흐름 화면이 같이 쓰는 값. 기록이 짧으면 두 화면 모두 예시 데이터를 쓴다.

import { useSyncExternalStore } from "react";
import { getData, getServerData, subscribeData } from "@/app/focus/store";
import { useToday } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { EXAMPLE_FLOW, buildSemesterFlow } from "@/lib/semester-flow";
import {
  EXAMPLE_COURSES,
  MIN_REPORT_WEEKS,
  buildCourseReport,
  collectCourseInputs,
  isSemesterOver,
  recordedWeeks,
  reportWeek,
  semesterRecords,
} from "@/lib/semester-report";
import { useSemesterData } from "@/lib/semester-store";
import { useTimetable } from "@/lib/timetable-store";

export function useSemesterSnapshot() {
  const today = useToday();
  const deadlines = useSavedDeadlines();
  const timetable = useTimetable();
  const settings = useSemesterData();
  const focus = useSyncExternalStore(subscribeData, getData, getServerData);

  const records = semesterRecords(focus.records, deadlines);
  const weeks = recordedWeeks(records);
  const isExample = weeks < MIN_REPORT_WEEKS;
  const report = buildCourseReport(
    isExample ? EXAMPLE_COURSES : collectCourseInputs(timetable, deadlines, records, settings),
  );
  const flow = isExample ? EXAMPLE_FLOW : buildSemesterFlow(records, deadlines);

  return {
    today,
    settings,
    weeks,
    isExample,
    report,
    flow,
    // 학기가 끝났거나 예시면 "얻었어요", 학기 중이면 "듣고 있어요"
    over: isExample || (today !== null && isSemesterOver(today)),
    lastWeek: isExample || !today ? 16 : reportWeek(today),
  };
}
