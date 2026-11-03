"use client";

import { useRef, useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { Checkbox } from "@/components/ui/check-row";
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

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "mt-1.5 block min-h-11 w-full rounded-button border border-line bg-surface px-3.5 py-2.5 text-base font-normal text-ink outline-none placeholder:text-muted focus:border-brand";

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
    <AppShell>
      <header className="mb-4 px-1">
        <p className="text-xs font-medium text-muted">교수님 메일</p>
        <h1 className="text-[22px] font-bold">교수님께 보낼 메일 초안</h1>
        <p className="mt-1 text-sm text-muted">
          상황을 고르고 내용을 적으면 예의 바른 초안과 보내기 전 체크리스트가 나와요.
        </p>
      </header>

      <form onSubmit={writeDraft} className="space-y-2.5">
        <Block>
          <fieldset>
            <legend className="text-[15px] font-bold">어떤 상황인가요?</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {MAIL_SITUATIONS.map((s) => (
                <label
                  key={s.id}
                  className={`flex min-h-11 cursor-pointer items-center rounded-button px-3.5 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                    situation === s.id ? "bg-brand-soft text-brand" : "bg-canvas text-muted"
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
        </Block>

        <Block className="space-y-3.5">
          <label className="block text-sm font-semibold">
            과목명
            <input
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              maxLength={MAX_COURSE_LENGTH}
              placeholder="예: 재무관리"
              className={inputClass}
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
              className={`${inputClass} font-mono`}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
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
              className={`${inputClass} resize-none`}
            />
            <span className="mt-1 block text-right font-mono text-xs font-medium text-muted">
              {message.length} / {MAX_MESSAGE_LENGTH}
            </span>
          </label>
        </Block>

        <Button type="submit" disabled={!canSubmit || loading} className="w-full">
          {loading ? "초안 쓰는 중…" : "초안 만들기"}
        </Button>
      </form>

      {error && (
        <div
          role="alert"
          className="mt-2.5 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review"
        >
          {error}
        </div>
      )}

      {draft && (
        <section className="mt-5">
          <div className="mb-2 px-1">
            <h2 className="text-[15px] font-bold">초안</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              AI가 쓴 초안이라 틀릴 수 있어요. 대괄호 [ ] 빈칸을 채우고 내용을 꼭 확인한 뒤 보내
              주세요.
            </p>
          </div>

          <Block padded={false} className="divide-y divide-divider">
            <div className="p-3.5">
              <p className="text-xs font-medium text-muted">제목</p>
              <p className="mt-1 text-[15px] font-semibold break-words">{subject}</p>
              {done && subject && (
                <Button
                  variant="secondary"
                  onClick={() => handleCopy(subject)}
                  className="mt-3 w-full"
                >
                  제목 복사
                </Button>
              )}
            </div>

            <div className="p-3.5">
              <p className="text-xs font-medium text-muted">본문</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                {body}
              </p>
              {done && body && (
                <Button
                  variant="secondary"
                  onClick={() => handleCopy(body)}
                  className="mt-3 w-full"
                >
                  본문 복사
                </Button>
              )}
            </div>
          </Block>
        </section>
      )}

      {done && (
        <section className="mt-5">
          <h2 className="mb-2 px-1 text-[15px] font-bold">보내기 전 체크리스트</h2>
          <Block padded={false}>
            <ul className="divide-y divide-divider">
              {checklist.map((item) => (
                <li key={item.id} className="flex items-start gap-3 px-3.5 py-3">
                  <Checkbox
                    checked={checked.includes(item.id)}
                    onChange={() => toggleChecked(item.id)}
                    label={item.label}
                  />
                  {/* CheckRow는 긴 글을 잘라서, 안내가 다 보이도록 줄을 직접 만든다. 글자를 눌러도 체크된다. */}
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => toggleChecked(item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-[15px] font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {item.hint}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Block>
        </section>
      )}

      {toast && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-sm rounded-button bg-ink px-4 py-3 text-center text-sm font-semibold text-white"
        >
          {toast}
        </div>
      )}
    </AppShell>
  );
}
