"use client";

// 오늘의 한 가지 화면과 로고 음성 안내가 같은 순위를 쓰도록, 할 일 점수 계산을 한곳에 둔다.
// 내 일정이 없으면 예시 일정으로 계산한다 (isExample).

import { useMemo } from "react";
import { useToday } from "./briefing";
import { useSavedDeadlines } from "./deadline-store";
import { getLatestAccuracy } from "./exam-results";
import { useGrades } from "./grades-store";
import { useGrading } from "./grading-store";
import { exampleTasks, scoreTasks, type PlanTask } from "./today-plan";

export function useScoredTasks() {
  const today = useToday();
  const saved = useSavedDeadlines();
  const grading = useGrading();
  const grades = useGrades();
  const isExample = saved.length === 0;

  const scored = useMemo(() => {
    if (!today) return [];
    const tasks: PlanTask[] = isExample
      ? exampleTasks(today)
      : saved
          .filter((d) => !d.done)
          .map((d) => ({
            id: d.id,
            course: d.course,
            title: d.title,
            date: d.date,
            kind: d.kind,
            hours: d.hours,
            startDate: d.startDate,
          }));
    const courses = [...new Set(tasks.map((t) => t.course))];
    const accuracy: Record<string, number> = {};
    for (const course of courses) {
      const value = isExample ? null : getLatestAccuracy(course);
      if (value !== null) accuracy[course] = value;
    }
    const targets: Record<string, number> = {};
    if (!isExample) for (const [course, g] of Object.entries(grades)) targets[course] = g.target;
    return scoreTasks(today, tasks, {
      grading: isExample ? {} : grading,
      targets,
      accuracy,
      allTasks: isExample ? [] : saved.map((d) => ({ course: d.course, kind: d.kind })),
    });
  }, [today, isExample, saved, grading, grades]);

  return { today, saved, isExample, scored };
}
