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
import { useActivities, type ActivityKind } from "@/lib/activity-store";
import { ALL_COMPETENCIES, SPEC_KINDS, SPEC_KIND_IDS, type SpecKind } from "@/lib/competencies";
import {
  MAX_COMPETENCIES,
  MAX_ONE_LINER,
  MAX_RECEIPT_ANSWER,
  MAX_RECEIPT_PERIOD,
  MAX_RECEIPT_TITLE,
  specKindOf,
  type ReceiptAnswers,
  type ReceiptStar,
  type SpecDetail,
} from "@/lib/receipt";
import { addReceipt, addSimpleRecord, updateReceipt, useReceipts } from "@/lib/receipt-store";
import { formatPeriod } from "../../activity-sheets";
import CompetencyPicker, { useJobGroups } from "../competency-picker";
import { receiptInputClass } from "../input-class";
import ReceiptEditor from "../receipt-editor";
import SpecFields, { cleanDetail } from "../spec-fields";

const QUESTIONS: { key: keyof ReceiptAnswers; label: string; placeholder: string }[] = [
  { key: "what", label: "무엇을 했나요?", placeholder: "어떤 상황이었고 목표가 무엇이었나요?" },
  { key: "role", label: "내 역할과 한 일", placeholder: "내가 맡은 역할과 실제로 한 일을 적어 주세요." },
  { key: "result", label: "결과", placeholder: "숫자가 있으면 숫자로 적어 주세요." },
  { key: "learned", label: "배운 점", placeholder: "무엇을 배웠나요?" },
];

const EMPTY_ANSWERS: ReceiptAnswers = { what: "", role: "", result: "", learned: "" };

// 대외활동 카드의 종류 → 기록 구분
const KIND_FROM_ACTIVITY: Record<ActivityKind, SpecKind> = {
  대외활동: "activity",
  동아리: "activity",
  공모전: "project",
  인턴: "work",
  자격증: "license",
  채용: "other",
};

type Step = "kind" | "simple" | "star";
type Draft = ReceiptStar & { inventedNumbers: string[] };

const backLinkClass = "-ml-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand";

function NewReceipt() {
  const router = useRouter();
  const params = useSearchParams();
  const activities = useActivities();
  const receipts = useReceipts();

  // ?from=<영수증 id>: 간단 기록을 STAR로 자세히 정리한다. 저장하면 같은 영수증을 고친다.
  const upgrading = receipts.find((r) => r.id === params.get("from"));
  const activityParam = params.get("activity");
  const kindParam = params.get("kind");
  const skillParam = params.get("skill");

  // 건드리기 전(null)에는 주소·연결한 활동·고치는 영수증에서 값을 가져온다.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [pickedKind, setPickedKind] = useState<SpecKind | null>(null);
  const [typedStep, setTypedStep] = useState<Step | null>(null);
  const [typedTitle, setTypedTitle] = useState<string | null>(null);
  const [typedPeriod, setTypedPeriod] = useState<string | null>(null);
  const [typedDetail, setTypedDetail] = useState<SpecDetail | null>(null);
  const [memo, setMemo] = useState("");
  const [picked, setPicked] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<ReceiptAnswers | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const activityId = pickedId ?? upgrading?.activityId ?? activityParam ?? "";
  const activity = activities.find((a) => a.id === activityId);
  const kind: SpecKind | undefined =
    pickedKind ??
    upgrading?.kind ??
    ((SPEC_KIND_IDS as readonly string[]).includes(kindParam ?? "") ? (kindParam as SpecKind) : undefined) ??
    (activity ? KIND_FROM_ACTIVITY[activity.kind ?? "대외활동"] : undefined);
  const spec = specKindOf(kind);
  const step: Step = typedStep ?? (upgrading ? "star" : kind ? "simple" : "kind");
  const title = typedTitle ?? upgrading?.title ?? activity?.title ?? "";
  const period = typedPeriod ?? upgrading?.period ?? (activity ? formatPeriod(activity) : "");
  const detail = typedDetail ?? upgrading?.detail ?? {};
  const skill = (ALL_COMPETENCIES as readonly string[]).includes(skillParam ?? "") ? [skillParam as string] : [];
  const competencies = picked ?? upgrading?.competencies ?? skill;
  const currentAnswers = answers ?? (upgrading ? { ...EMPTY_ANSWERS, what: upgrading.oneLiner } : EMPTY_ANSWERS);
  const extraGroups = useJobGroups();

  const canSaveSimple = title.trim() !== "" && competencies.length >= 1 && memo.length <= MAX_ONE_LINER;
  const canSubmit =
    title.trim() !== "" && QUESTIONS.every(({ key }) => currentAnswers[key].trim() !== "") && !loading;

  function saveSimple(e: React.FormEvent) {
    e.preventDefault();
    if (!canSaveSimple) return;
    addSimpleRecord({
      title: title.trim(),
      period: period.trim() || undefined,
      kind,
      detail: cleanDetail(detail),
      activityId: activity?.id,
      competencies,
      memo,
    });
    router.push("/career/receipts");
  }

  function goStar() {
    if (answers === null && memo.trim()) setAnswers({ ...EMPTY_ANSWERS, what: memo.trim() });
    setTypedStep("star");
    window.scrollTo({ top: 0 });
  }

  async function organize(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await aiFetch("/api/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, period: period || undefined, kind, answers: currentAnswers }),
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
    // 학생이 먼저 고른 역량을 앞에 두고 AI가 고른 역량으로 채운다.
    const merged = [...new Set([...competencies, ...star.competencies])].slice(0, MAX_COMPETENCIES);
    return (
      <AppShell>
        <button type="button" onClick={() => setDraft(null)} className={backLinkClass}>
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
            initial={{
              ...star,
              competencies: merged,
              title,
              period: period || undefined,
              kind,
              detail: cleanDetail(detail),
            }}
            onSave={(fields) => {
              if (upgrading) updateReceipt(upgrading.id, { ...fields, answers: currentAnswers });
              else addReceipt({ ...fields, activityId: activity?.id, answers: currentAnswers });
              router.push("/career/receipts");
            }}
          />
        </Block>
      </AppShell>
    );
  }

  if (step === "kind") {
    return (
      <AppShell>
        <Link href="/career/receipts" className={backLinkClass}>
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          스펙 영수증
        </Link>
        <h1 className="mt-1 px-1 text-[22px] font-bold">어떤 기록인가요?</h1>
        <p className="mt-1 px-1 text-[13px] leading-relaxed text-muted">
          구분을 고르면 그에 맞는 칸만 나와요. 짧게 남기고, 필요할 때 STAR로 자세히 정리할 수 있어요.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2">
          {SPEC_KINDS.map((k) => (
            <li key={k.id}>
              <button
                type="button"
                onClick={() => {
                  setPickedKind(k.id);
                  setTypedStep("simple");
                }}
                className="block min-h-[72px] w-full rounded-block bg-surface p-3.5 text-left active:bg-divider"
              >
                <span className="block text-[15px] font-bold break-keep">{k.label}</span>
                <span className="mt-1 block text-[11px] leading-snug text-muted break-keep">
                  {k.fields.map((f) => f.label).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </AppShell>
    );
  }

  if (step === "simple") {
    return (
      <AppShell>
        <button type="button" onClick={() => setTypedStep("kind")} className={backLinkClass}>
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          구분 바꾸기
        </button>
        <h1 className="mt-1 px-1 text-[22px] font-bold">{spec?.label ?? "경험"} 기록</h1>
        <p className="mt-1 px-1 text-[13px] leading-relaxed text-muted">
          AI 없이 바로 저장해요. 이 기록으로 어필할 역량을 고르면 역량 공백 지도에 반영돼요.
        </p>

        <form onSubmit={saveSimple} className="mt-4">
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
              {spec?.title ?? "활동 이름"}
              <input
                value={title}
                maxLength={MAX_RECEIPT_TITLE}
                onChange={(e) => setTypedTitle(e.target.value)}
                placeholder={`예: ${spec?.example ?? "학생회 홍보팀"}`}
                className={receiptInputClass}
              />
            </label>
            <SpecFields
              kind={kind}
              period={period}
              detail={detail}
              onChange={(next) => {
                setTypedPeriod(next.period);
                setTypedDetail(next.detail);
              }}
            />
            <label className="block text-[13px] font-semibold">
              한 줄 메모 <span className="text-xs font-medium text-muted">(선택)</span>
              <textarea
                rows={2}
                value={memo}
                maxLength={MAX_ONE_LINER}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="자소서에 쓸 한 줄이나 기억해 둘 점"
                className={receiptInputClass}
              />
              <span className="mt-1 block text-right font-mono text-xs font-medium text-muted">
                {memo.length}/{MAX_ONE_LINER}
              </span>
            </label>
            <CompetencyPicker
              legend="이 기록으로 어필할 역량"
              value={competencies}
              onChange={setPicked}
              max={MAX_COMPETENCIES}
              suggest={spec?.suggest}
              extraGroups={extraGroups}
            />
          </Block>

          <Button type="submit" disabled={!canSaveSimple} className="mt-3 w-full">
            기록 저장
          </Button>
          <Button variant="secondary" onClick={goStar} disabled={title.trim() === ""} className="mt-2 w-full">
            STAR로 자세히 정리하기 (AI)
          </Button>
          <p className="mt-2 px-1 text-xs leading-relaxed text-muted">
            기록은 이 기기에만 저장돼요. 역량을 하나 이상 골라야 저장할 수 있어요.
          </p>
        </form>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {upgrading ? (
        <Link href="/career/receipts" className={backLinkClass}>
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          스펙 영수증
        </Link>
      ) : (
        <button type="button" onClick={() => setTypedStep(kind ? "simple" : "kind")} className={backLinkClass}>
          <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
          간단 기록으로
        </button>
      )}
      <h1 className="mt-1 px-1 text-[22px] font-bold">STAR로 정리하기</h1>
      <p className="mt-1 px-1 text-[13px] leading-relaxed text-muted">
        있었던 일만 적어 주세요. AI는 적은 내용으로만 정리해요. 다른 사람 이름은 빼고 적어 주세요.
      </p>

      <form onSubmit={organize} className="mt-4">
        <Block className="space-y-3.5">
          <label className="block text-[13px] font-semibold">
            {spec?.title ?? "활동 이름"}
            <input
              value={title}
              maxLength={MAX_RECEIPT_TITLE}
              onChange={(e) => setTypedTitle(e.target.value)}
              placeholder={`예: ${spec?.example ?? "학생회 홍보팀"}`}
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
                value={currentAnswers[key]}
                maxLength={MAX_RECEIPT_ANSWER}
                onChange={(e) => setAnswers({ ...currentAnswers, [key]: e.target.value })}
                placeholder={placeholder}
                className={receiptInputClass}
              />
              <span className="mt-1 block text-right font-mono text-xs font-medium text-muted">
                {currentAnswers[key].length}/{MAX_RECEIPT_ANSWER}
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
