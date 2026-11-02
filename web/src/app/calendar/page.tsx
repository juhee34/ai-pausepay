"use client";

import { useState } from "react";

// Vercel은 요청 하나를 4.5MB까지만 받으므로, 여유를 두고 4MB에서 막는다.
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg";
const ACCEPT_TYPES = ACCEPT.split(",");

type Kind = "과제" | "퀴즈" | "중간" | "기말" | "기타";

type Deadline = {
  course: string;
  title: string;
  date: string; // YYYY-MM-DD
  kind: Kind;
};

// 1단계: AI 없이 화면 흐름만 확인하는 가짜 결과. 다음 단계에서 AI 결과로 바꾼다.
const FAKE_DEADLINES: Deadline[] = [
  { course: "경영학원론", title: "1차 보고서 제출", date: "2026-11-10", kind: "과제" },
  { course: "경영학원론", title: "7~9주차 퀴즈", date: "2026-11-20", kind: "퀴즈" },
  { course: "경영학원론", title: "기말고사", date: "2026-12-10", kind: "기말" },
];

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export default function CalendarPage() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[] | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    // 같은 파일을 다시 골라도 반응하도록 선택 칸을 비운다.
    e.target.value = "";
    if (!picked) return;

    setDeadlines(null);
    if (!ACCEPT_TYPES.includes(picked.type)) {
      setFile(null);
      setError("PDF나 PNG·JPG 이미지만 올릴 수 있어요.");
      return;
    }
    if (picked.size > MAX_BYTES) {
      setFile(null);
      setError(
        `파일이 너무 커요 (${formatSize(picked.size)}). 4MB 이하로 줄이거나, 필요한 쪽만 저장해서 올려 주세요.`,
      );
      return;
    }
    setError(null);
    setFile(picked);
  }

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-md px-5 pt-12 pb-20">
        <p className="text-accent text-xs font-semibold tracking-widest">
          강의계획서 → 캘린더
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-snug">
          강의계획서 한 장으로
          <br />
          한 학기 일정 만들기
        </h1>
        <p className="mt-3 text-sm text-foreground/70">
          강의계획서 PDF나 KLAS 화면 캡쳐를 올리면 과제·퀴즈·시험 날짜를
          찾아 드려요.
        </p>

        <label className="mt-8 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft/40 px-5 py-8 text-center">
          <span className="text-sm font-semibold">파일 고르기</span>
          <span className="mt-1 text-xs text-foreground/60">
            PDF · PNG · JPG, 4MB까지
          </span>
          <input
            type="file"
            accept={ACCEPT}
            onChange={handleFile}
            className="sr-only"
          />
        </label>

        <p className="mt-3 text-xs leading-relaxed text-foreground/50">
          올린 파일은 서버에 저장하지 않고, 내 일정을 찾는 데만 써요.
        </p>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {file && (
          <div className="mt-6 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
            <p className="truncate text-sm font-semibold">{file.name}</p>
            <p className="mt-1 text-xs text-foreground/50">
              {formatSize(file.size)}
            </p>
            <button
              type="button"
              onClick={() => setDeadlines(FAKE_DEADLINES)}
              className="mt-4 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white"
            >
              일정 찾기
            </button>
          </div>
        )}

        {deadlines && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold">찾은 일정 {deadlines.length}개</h2>
            <p className="mt-1 text-xs text-foreground/50">
              지금은 연습용 가짜 일정이에요. AI는 다음 단계에서 연결해요.
            </p>
            <ul className="mt-4 space-y-3">
              {deadlines.map((d) => (
                <li
                  key={`${d.date}-${d.title}`}
                  className="flex items-center gap-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4"
                >
                  <span className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                    {d.kind}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="mt-0.5 text-xs text-foreground/60">
                      {d.course} · {formatDate(d.date)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}
