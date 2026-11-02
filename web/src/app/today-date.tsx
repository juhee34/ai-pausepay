"use client";

import { useToday } from "@/lib/briefing";
import { formatDate } from "@/lib/syllabus";

export default function TodayDate() {
  const today = useToday();
  return (
    <h1 className="mt-3 min-h-8 text-2xl font-bold leading-snug">
      {today ? formatDate(today) : ""}
    </h1>
  );
}
