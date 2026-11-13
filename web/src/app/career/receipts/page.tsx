"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import BackLink from "@/components/ui/back-link";
import { useState, useSyncExternalStore } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { SPEC_KINDS, type SpecKind } from "@/lib/competencies";
import { copyText } from "@/lib/copy-text";
import { formatReceiptText, formatSpecDetail, isSimpleStar, specKindOf } from "@/lib/receipt";
import { removeReceipt, updateReceipt, useReceipts, type Receipt } from "@/lib/receipt-store";
import ReceiptEditor from "./receipt-editor";

const emptySubscribe = () => () => {};

const STAR_LABELS = [
  ["상황", "situation"],
  ["과제", "task"],
  ["행동", "action"],
  ["결과", "result"],
] as const;

function CompetencyBadges({ names }: { names: string[] }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-1">
      {names.map((name) => (
        <span
          key={name}
          className="inline-flex h-[22px] items-center rounded-full bg-brand-soft px-2 text-[11px] font-bold text-brand"
        >
          {name}
        </span>
      ))}
    </span>
  );
}

function ReceiptSheet({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const spec = specKindOf(receipt.kind);
  const detail = formatSpecDetail(receipt.kind, receipt.detail);
  const simple = isSimpleStar(receipt);

  if (editing) {
    return (
      <BottomSheet open onClose={onClose} title="영수증 고치기">
        <ReceiptEditor
          initial={receipt}
          onSave={({ title, period, kind, detail, situation, task, action, result, oneLiner, competencies }) => {
            updateReceipt(receipt.id, {
              title,
              period,
              kind,
              detail,
              situation,
              task,
              action,
              result,
              oneLiner,
              competencies,
            });
            setEditing(false);
          }}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open onClose={onClose} title={receipt.title}>
      <p className="-mt-2 text-xs text-muted">
        {[spec?.label, receipt.period].filter(Boolean).join(" · ")}
      </p>
      {detail && <p className="mt-1 text-[13px]">{detail}</p>}
      {receipt.oneLiner && (
        <p className="mt-2 rounded-callout bg-brand-soft p-3 text-sm font-semibold">{receipt.oneLiner}</p>
      )}
      {simple ? (
        <Link
          href={`/career/receipts/new?from=${encodeURIComponent(receipt.id)}`}
          className="mt-3 flex min-h-11 items-center justify-center rounded-button border border-brand bg-surface px-4 text-sm font-semibold text-brand active:bg-brand-soft"
        >
          STAR로 자세히 정리하기 (AI)
        </Link>
      ) : (
        <dl className="mt-3 space-y-2.5">
          {STAR_LABELS.map(([label, key]) => (
            <div key={key}>
              <dt className="text-xs font-bold text-muted">{label}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{receipt[key]}</dd>
            </div>
          ))}
        </dl>
      )}
      <CompetencyBadges names={receipt.competencies} />

      <Button
        onClick={async () => {
          const copied = await copyText(formatReceiptText(receipt));
          setNotice(copied ? "복사했어요." : "복사하지 못했어요. 글을 직접 골라 복사해 주세요.");
        }}
        className="mt-4 w-full"
      >
        복사하기
      </Button>
      {notice && (
        <p role="status" className="mt-1.5 text-center text-xs text-muted">
          {notice}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <Button variant="secondary" onClick={() => setEditing(true)} className="flex-1">
          고치기
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            if (!confirm(`'${receipt.title}' 영수증을 지울까요?`)) return;
            removeReceipt(receipt.id);
            onClose();
          }}
          className="flex-1"
        >
          지우기
        </Button>
      </div>
    </BottomSheet>
  );
}

// 스펙 영수증 목록. 경험을 자소서 재료로 정리해 이 기기에만 모아 둔다.
export default function ReceiptsPage() {
  const receipts = useReceipts();
  // 저장된 영수증을 읽기 전에 빈 화면 안내가 잠깐 보이지 않게 한다.
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SpecKind | "all">("all");
  const opened = receipts.find((r) => r.id === openedId);
  // 기록이 있는 구분만 필터로 보여 준다.
  const kinds = SPEC_KINDS.filter((k) => receipts.some((r) => r.kind === k.id));
  // 고른 구분의 기록을 모두 지웠으면 전체로 돌아간다.
  const active = kinds.some((k) => k.id === filter) ? filter : "all";
  const shown = active === "all" ? receipts : receipts.filter((r) => r.kind === active);

  return (
    <AppShell>
      <BackLink href="/career" label="취업" />
      <header className="mt-1 flex items-center justify-between gap-3 px-1">
        <h1 className="text-[22px] font-bold">스펙 영수증</h1>
        <Link
          href="/career/receipts/new"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-button bg-brand px-3 text-sm font-semibold text-white active:bg-brand-strong"
        >
          <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          쓰기
        </Link>
      </header>
      <p className="mt-1 px-1 text-[13px] text-muted">
        활동·자격증·어학까지 잊기 전에 남기고, 어필할 역량을 골라 두세요.
      </p>

      {hydrated && kinds.length > 0 && (
        <div role="group" aria-label="기록 구분" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[{ id: "all" as const, label: "전체" }, ...kinds].map((k) => (
            <button
              key={k.id}
              type="button"
              aria-pressed={active === k.id}
              onClick={() => setFilter(k.id)}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-[13px] font-semibold ${
                active === k.id ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
              }`}
            >
              {k.label}
            </button>
          ))}
        </div>
      )}

      {hydrated && (
        <div className="mt-3 space-y-2">
          {shown.map((receipt) => (
            <button
              key={receipt.id}
              type="button"
              onClick={() => setOpenedId(receipt.id)}
              className="block min-h-11 w-full rounded-block bg-surface p-3.5 text-left active:bg-divider"
            >
              {receipt.kind && (
                <span className="block text-[11px] font-bold text-brand">
                  {specKindOf(receipt.kind)?.label}
                  {isSimpleStar(receipt) ? " · 간단 기록" : ""}
                </span>
              )}
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words text-[15px] font-bold">{receipt.title}</span>
                {receipt.period && (
                  <span className="shrink-0 font-mono text-xs text-muted">{receipt.period}</span>
                )}
              </span>
              {formatSpecDetail(receipt.kind, receipt.detail) && (
                <span className="mt-0.5 block break-words text-xs text-muted">
                  {formatSpecDetail(receipt.kind, receipt.detail)}
                </span>
              )}
              {receipt.oneLiner && (
                <span className="mt-1 block break-words text-[13px] leading-relaxed">{receipt.oneLiner}</span>
              )}
              <CompetencyBadges names={receipt.competencies} />
            </button>
          ))}
          {receipts.length === 0 && (
            <Block>
              <p className="text-sm text-muted">
                아직 기록이 없어요. &apos;쓰기&apos;를 눌러 대외활동·자격증·어학 같은 경험을 하나 남겨 보세요.
              </p>
            </Block>
          )}
        </div>
      )}

      {opened && <ReceiptSheet key={opened.id} receipt={opened} onClose={() => setOpenedId(null)} />}
    </AppShell>
  );
}
