"use client";

import { useEffect, useMemo, useState } from "react";
import { useActivities } from "@/lib/activity-store";
import { addDays, ruleBasedPick, useToday, type BriefingItem } from "@/lib/briefing";
import { useSavedDeadlines } from "@/lib/deadline-store";

// AI 추천은 일정이 바뀌었을 때만, 하루 최대 3번 부른다. 같은 일정이면 저장해 둔 문장을 다시 쓴다.
// 3번을 다 쓴 뒤 일정이 또 바뀌면 그날은 정해진 문장(ruleBasedPick)을 보여 준다.
const CACHE_KEY = "unis.todayPick.v2";
const MAX_CALLS_PER_DAY = 3;
const LOOKAHEAD_DAYS = 14;

type Cache = { date: string; calls: number; signature: string; text: string };

function readCache(): Cache | null {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "null") as Cache | null;
  } catch {
    return null;
  }
}

function writeCache(cache: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 저장 공간이 없어도 화면은 그대로 보여 준다.
  }
}

export default function TodayPick() {
  const today = useToday();
  const deadlines = useSavedDeadlines();
  const activities = useActivities();
  const [aiText, setAiText] = useState<{ signature: string; text: string } | null>(null);

  const items = useMemo<BriefingItem[]>(() => {
    if (!today) return [];
    const until = addDays(today, LOOKAHEAD_DAYS);
    const inRange = (date: string) => date >= today && date <= until;
    return [
      ...deadlines
        .filter((d) => inRange(d.date))
        .map((d) => ({ type: "일정" as const, title: d.title, course: d.course, date: d.date, kind: d.kind })),
      ...activities
        .filter((a) => inRange(a.date))
        .map((a) => ({ type: "대외활동" as const, title: a.title, course: "", date: a.date, kind: "대외활동" as const })),
    ]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 15);
  }, [today, deadlines, activities]);

  const signature = today ? `${today}|${JSON.stringify(items)}` : "";

  useEffect(() => {
    if (!today || !signature || items.length === 0) return;
    let cancelled = false;

    async function load() {
      const cache = readCache();
      const callsToday = cache?.date === today ? cache.calls : 0;
      if (cache?.signature === signature) {
        if (!cancelled) setAiText({ signature, text: cache.text });
        return;
      }
      if (callsToday >= MAX_CALLS_PER_DAY) return; // 규칙 문장을 그대로 둔다
      try {
        const res = await fetch("/api/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || typeof data?.text !== "string") return; // 규칙 문장을 그대로 둔다
        writeCache({ date: today!, calls: callsToday + 1, signature, text: data.text });
        if (!cancelled) setAiText({ signature, text: data.text });
      } catch {
        // 인터넷이 안 되면 규칙 문장을 그대로 둔다.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [today, signature, items]);

  if (!today) return <div className="h-24" />;

  const fallback = ruleBasedPick(today, items);
  const text = aiText?.signature === signature ? aiText.text : fallback;

  return (
    <div className="rounded-2xl bg-accent px-5 py-5 text-white">
      <p className="text-xs font-semibold opacity-80">지금 시작할 일</p>
      <p className="mt-2 text-base font-bold leading-snug">
        {text ?? "2주 안에 다가오는 일정이 없어요. 강의계획서를 올려 일정을 채워 보세요."}
      </p>
    </div>
  );
}
