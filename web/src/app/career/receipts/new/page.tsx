"use client";

import { aiFetch } from "@/lib/ai-fetch";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import CookieNote from "@/components/ui/cookie-note";
import { useActivities } from "@/lib/activity-store";
import {
  MAX_RECEIPT_ANSWER,
  MAX_RECEIPT_PERIOD,
  MAX_RECEIPT_TITLE,
  type ReceiptAnswers,
  type ReceiptStar,
} from "@/lib/receipt";
import { addReceipt } from "@/lib/receipt-store";
import { formatPeriod } from "../../activity-sheets";
import ReceiptEditor, { receiptInputClass } from "../receipt-editor";

const QUESTIONS: { key: keyof ReceiptAnswers; label: string; placeholder: string }[] = [
  { key: "what", label: "무엇을 했나요?", placeholder: "어떤 상황이었고 목표가 무엇이었나요?" },
  { key: "role", label: "내 역할과 한 일", placeholder: "내가 맡은 역할과 실제로 한 일을 적어 주세요." },
  { key: "result", label: "결과", placeholder: "숫자가 있으면 숫자로 적어 주세요." },
  { key: "learned", label: "배운 점", placeholder: "무엇을 배웠나요?" },
];

const EMPTY_ANSWERS: ReceiptAnswers = { what: "", role: "", result: "", learned: "" };

type Draft = ReceiptStar & { inventedNumbers: string[] };

function NewReceipt() {
  const router = useRouter();
  const activityParam = useSearchParams().get("activity");
  const activities = useActivities();

  // 건드리기 전(null)에는 연결한 활동의 이름·기간을 보여 준다.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [typedTitle, setTypedTitle] = useState<string | null>(null);
  const [typedPeriod, setTypedPeriod] = useState<string | null>(null);
  const [answers, setAnswers] = useState(EMPTY_ANSWERS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const activityId = pickedId ?? activityParam ?? "";
  const activity = activities.find((a) => a.id === activityId);
  const title = typedTitle ?? activity?.title ?? "";
  const period = typedPeriod ?? (activity ? formatPeriod(activity) : "");

  const canSubmit =
    title.trim() !== "" && QUESTIONS.every(({ key }) => answers[key].trim() !== "") && !loading;

  async function organize(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiFetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, period: period || undefined, answers }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "정리하지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      setDraft(data as Draft);
      window.scrollTo({ top: 0 });
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  if (draft) {
    const { inventedNumbers, ...star } = draft;
    return (
      <AppShell>
        <button
          type="button"
          onClick={() => setDraft(null)}
          className="-ml-1 flex min-h-11 items-center gap-0.5 pr-2 text-xs font-semibold text-brand"
        >
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          답 고치기
        </button>
        <h1 className="mt-1 px-1 text-[22px] font-bold">확인하고 저장해요</h1>
        <p className="mt-1 px-1 text-[13px] leading-relaxed text-muted">
          AI가 정리한 글이라 틀릴 수 있어요. 내가 하지 않은 일이 있으면 고쳐 주세요.
        </p>
        {inventedNumbers.length > 0 && (
          <p
            role="alert"
            className="mt-3 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review"
          >
            내가 적지 않은 숫자가 있어요: <span className="font-mono">{inventedNumbers.join(", ")}</span>. 사실이
            아니면 지워 주세요.
          </p>
        )}
        <Block className="mt-3">
          <ReceiptEditor
            initial={{ ...star, title, period: period || undefined }}
            onSave={(fields) => {
              addReceipt({ ...fields, activityId: activity?.id, answers });
              router.push("/career/receipts");
            }}
          />
        </Block>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        href="/career/receipts"
        className="-ml-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand"
      >
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        스펙 영수증
      </Link>
      <h1 className="mt-1 px-1 text-[22px] font-bold">영수증 쓰기</h1>
      <p className="mt-1 px-1 text-[13px] leading-relaxed text-muted">
        있었던 일만 적어 주세요. AI는 적은 내용으로만 정리해요. 다른 사람 이름은 빼고 적어 주세요.
      </p>

      <form onSubmit={organize} className="mt-4">
        <Block className="space-y-3.5">
          {activities.length > 0 && (
            <label className="block text-[13px] font-semibold">
              연결할 활동 <span className="text-xs font-medium text-muted">(선택)</span>
              <select
                value={activity?.id ?? ""}
                onChange={(e) => {
                  setPickedId(e.target.value);
                  setTypedTitle(null);
                  setTypedPeriod(null);
                }}
                className={receiptInputClass}
              >
                <option value="">연결 안 함</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-[13px] font-semibold">
            활동 이름
            <input
              value={title}
              maxLength={MAX_RECEIPT_TITLE}
              onChange={(e) => setTypedTitle(e.target.value)}
              placeholder="예: 학생회 홍보팀"
              className={receiptInputClass}
            />
          </label>
          <label className="block text-[13px] font-semibold">
            기간 <span className="text-xs font-medium text-muted">(선택)</span>
            <input
              value={period}
              maxLength={MAX_RECEIPT_PERIOD}
              onChange={(e) => setTypedPeriod(e.target.value)}
              placeholder="예: 2026년 3월 ~ 6월"
              className={receiptInputClass}
            />
          </label>
          {QUESTIONS.map(({ key, label, placeholder }) => (
            <label key={key} className="block text-[13px] font-semibold">
              {label}
              <textarea
                rows={3}
                value={answers[key]}
                maxLength={MAX_RECEIPT_ANSWER}
                onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })}
                placeholder={placeholder}
                className={receiptInputClass}
              />
              <span className="mt-1 block text-right font-mono text-xs font-medium text-muted">
                {answers[key].length}/{MAX_RECEIPT_ANSWER}
              </span>
            </label>
          ))}
        </Block>

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review"
          >
            {error}
          </p>
        )}
        <Button type="submit" disabled={!canSubmit} className="mt-3 w-full">
          {loading ? "정리하는 중… (10~30초)" : "AI로 정리하기"}
        </Button>
        <CookieNote />
        <p className="mt-2 px-1 text-xs leading-relaxed text-muted">
          적은 글은 정리할 때만 AI에 보내고 서버에 저장하지 않아요. 영수증은 이 기기에만 저장돼요.
        </p>
      </form>
    </AppShell>
  );
}

export default function NewReceiptPage() {
  // useSearchParams를 쓰는 화면은 Suspense로 감싸야 빌드된다.
  return (
    <Suspense fallback={null}>
      <NewReceipt />
    </Suspense>
  );
}
