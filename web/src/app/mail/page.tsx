"use client";

import { useRef, useState } from "react";
import {
  MAIL_SITUATIONS,
  MAX_COURSE_LENGTH,
  MAX_MESSAGE_LENGTH,
  MAX_STUDENT_ID_LENGTH,
  STUDENT_ID_PLACEHOLDER,
  type MailSituationId,
} from "./situations";

type Submitted = {
  situation: MailSituationId;
  course: string;
  studentId: string;
  sendTimeHint: string;
};

// AI가 쓴 글을 메일 앱의 칸에 맞게 제목과 본문으로 나눈다.
function splitDraft(draft: string) {
  const match = draft.match(/^\s*제목:[ \t]*(.*)(?:\r?\n([\s\S]*))?$/);
  if (!match) return { subject: "", body: draft.trim() };
  return { subject: match[1].trim(), body: (match[2] ?? "").trim() };
}

function getSendTimeHint(now: Date) {
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0 || day === 6) {
    return "지금은 주말이에요. 급하지 않으면 평일 낮에 보내거나 예약 발송을 써요.";
  }
  if (hour < 9 || hour >= 18) {
    return `지금은 ${hour}시예요. 급하지 않으면 평일 낮에 보내거나 예약 발송을 써요.`;
  }
  return "지금은 평일 낮이라 보내기 좋은 시간이에요.";
}

// 폰에서 http 주소로 테스트할 때는 navigator.clipboard가 없어서 예전 방식도 함께 쓴다.
async function copyText(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 아래 예전 방식으로 다시 시도한다.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}

const inputClass =
  "mt-2 w-full rounded-xl border border-foreground/15 bg-transparent px-4 py-3 text-base outline-none focus:border-accent";

export default function MailPage() {
  const [situation, setSituation] = useState<MailSituationId>(MAIL_SITUATIONS[0].id);
  const [course, setCourse] = useState("");
  const [studentId, setStudentId] = useState("");
  const [message, setMessage] = useState("");

  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSubmit = course.trim() && studentId.trim() && message.trim();

  async function writeDraft(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setError(null);
    setDraft("");
    setChecked([]);
    setSubmitted({
      situation,
      course: course.trim(),
      studentId: studentId.trim(),
      sendTimeHint: getSendTimeHint(new Date()),
    });

    try {
      // 학번은 보내지 않는다. 화면에서 빈칸에 채워 넣는다.
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, course, message }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "초안을 쓰지 못했어요. 잠시 뒤에 다시 해 주세요.");
        setSubmitted(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setDraft((prev) => prev + chunk);
      }
    } catch {
      // 중간에 끊긴 초안을 완성본처럼 복사하지 않도록 지운다.
      setDraft("");
      setSubmitted(null);
      setError("초안을 끝까지 쓰지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  }

  async function handleCopy(text: string) {
    const copied = await copyText(text);
    showToast(copied ? "복사했어요" : "복사하지 못했어요. 글을 길게 눌러 복사해 주세요.");
  }

  function toggleChecked(id: string) {
    setChecked((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  const filled = submitted
    ? draft.replaceAll(STUDENT_ID_PLACEHOLDER, submitted.studentId)
    : "";
  const { subject, body } = splitDraft(filled);
  const done = Boolean(submitted && !loading && draft);

  const checklist = submitted
    ? [
        {
          id: "subject",
          label: "제목에 과목명·학번",
          hint:
            subject.includes(submitted.course) && subject.includes(submitted.studentId)
              ? "제목에 과목명과 학번이 모두 들어 있어요."
              : "제목에 과목명이나 학번이 빠졌어요. 직접 넣어 주세요.",
        },
        {
          id: "attachment",
          label: "첨부파일",
          hint: MAIL_SITUATIONS.find((s) => s.id === submitted.situation)?.attachmentHint,
        },
        { id: "time", label: "보내는 시간", hint: submitted.sendTimeHint },
      ]
    : [];

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-md px-5 pt-12 pb-20">
        <p className="text-accent text-xs font-semibold tracking-widest">
          교수님 메일 작성기
        </p>
        <h1 className="mt-3 text-2xl font-bold leading-snug">
          교수님께 보낼 메일,
          <br />
          초안부터 써 드릴게요
        </h1>
        <p className="mt-3 text-sm text-foreground/70">
          상황을 고르고 내용을 적으면 예의 바른 초안과 보내기 전 체크리스트가
          나와요.
        </p>

        <form onSubmit={writeDraft} className="mt-8 space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold">어떤 상황인가요?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {MAIL_SITUATIONS.map((s) => (
                <label
                  key={s.id}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                    situation === s.id
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-foreground/15 text-foreground/70"
                  }`}
                >
                  <input
                    type="radio"
                    name="situation"
                    value={s.id}
                    checked={situation === s.id}
                    onChange={() => setSituation(s.id)}
                    className="sr-only"
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block text-sm font-semibold">
            과목명
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={MAX_COURSE_LENGTH}
              placeholder="예: 재무관리"
              className={`${inputClass} font-normal`}
            />
          </label>

          <label className="block text-sm font-semibold">
            학번
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={MAX_STUDENT_ID_LENGTH}
              inputMode="numeric"
              autoComplete="off"
              placeholder="예: 2024123456"
              className={`${inputClass} font-normal`}
            />
            <span className="mt-1 block text-xs font-normal text-foreground/50">
              학번은 AI에게 보내지 않고, 이 화면에서 초안에 넣어요.
            </span>
          </label>

          <label className="block text-sm font-semibold">
            하고 싶은 말
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={4}
              placeholder="예: 11월 5일에 병원에 가느라 결석했어요. 진단서가 있어요."
              className={`${inputClass} resize-none font-normal`}
            />
            <span className="mt-1 block text-right text-xs font-normal text-foreground/50">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </span>
          </label>

          <button
            type="submit"
            disabled={!canSubmit || loading}
            className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "초안 쓰는 중…" : "초안 쓰기"}
          </button>
        </form>

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}

        {draft && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold">초안</h2>
            <p className="mt-1 text-xs text-foreground/50">
              AI가 쓴 초안이라 틀릴 수 있어요. 대괄호 [ ] 빈칸을 채우고 내용을
              꼭 확인한 뒤 보내 주세요.
            </p>

            <div className="mt-4 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
              <p className="text-xs font-semibold text-foreground/50">제목</p>
              <p className="mt-1 text-sm font-semibold break-words">{subject}</p>
              {done && subject && (
                <button
                  type="button"
                  onClick={() => handleCopy(subject)}
                  className="mt-3 w-full rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
                >
                  제목 복사
                </button>
              )}
            </div>

            <div className="mt-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
              <p className="text-xs font-semibold text-foreground/50">본문</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {body}
              </p>
              {done && body && (
                <button
                  type="button"
                  onClick={() => handleCopy(body)}
                  className="mt-3 w-full rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent"
                >
                  본문 복사
                </button>
              )}
            </div>
          </div>
        )}

        {done && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold">보내기 전 체크리스트</h2>
            <ul className="mt-3 space-y-3">
              {checklist.map((item) => (
                <li key={item.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-4">
                    <input
                      type="checkbox"
                      checked={checked.includes(item.id)}
                      onChange={() => toggleChecked(item.id)}
                      className="mt-0.5 size-5 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-foreground/60">
                        {item.hint}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {toast && (
        <div
          role="status"
          className="fixed inset-x-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-sm rounded-xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-background"
        >
          {toast}
        </div>
      )}
    </main>
  );
}
