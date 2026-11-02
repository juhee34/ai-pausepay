import { createEvents, type EventAttributes } from "ics";
import type { SavedDeadline } from "./deadline-store";

// 저장한 일정을 캘린더 파일(.ics)로 만든다. 하루 종일 일정 + 전날 오전 9시 알림.
// 아이폰 캘린더는 이 알림을 쓰고, 구글 캘린더는 계정의 기본 알림을 쓴다.
export function buildCalendarFile(deadlines: SavedDeadline[]) {
  const events: EventAttributes[] = deadlines.map((d) => {
    const [y, m, day] = d.date.split("-").map(Number);
    const next = new Date(y, m - 1, day + 1);
    return {
      uid: `${d.id}@unis`,
      title: `[${d.kind}] ${d.title}`,
      description: [d.course, d.when, "우니스에서 추가한 일정"].filter(Boolean).join("\n"),
      start: [y, m, day],
      end: [next.getFullYear(), next.getMonth() + 1, next.getDate()],
      alarms: [
        {
          action: "display",
          description: `내일: ${d.title}`,
          // 하루 종일 일정은 0시에 시작하므로 15시간 전 = 전날 오전 9시
          trigger: { hours: 15, before: true },
        },
      ],
    };
  });

  const { error, value } = createEvents(events, {
    productId: "unis",
    calName: "우니스 학사 일정",
  });
  if (error || !value) throw error ?? new Error("캘린더 파일을 만들지 못했어요.");
  return value;
}

export function downloadCalendarFile(deadlines: SavedDeadline[]) {
  const blob = new Blob([buildCalendarFile(deadlines)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "unis-schedule.ics";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
