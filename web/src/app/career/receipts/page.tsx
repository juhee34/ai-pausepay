"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import BackLink from "@/components/ui/back-link";
import { useState, useSyncExternalStore } from "react";
import AppShell from "@/components/ui/app-shell";
import Block from "@/components/ui/block";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import { formatReceiptText } from "@/lib/receipt";
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

  if (editing) {
    return (
      <BottomSheet open onClose={onClose} title="영수증 고치기">
        <ReceiptEditor
          initial={receipt}
          onSave={({ title, period, situation, task, action, result, oneLiner, competencies }) => {
            updateReceipt(receipt.id, { title, period, situation, task, action, result, oneLiner, competencies });
            setEditing(false);
          }}
        />
      </BottomSheet>
    );
  }

  return (
    <BottomSheet open onClose={onClose} title={receipt.title}>
      {receipt.period && <p className="-mt-2 font-mono text-xs text-muted">{receipt.period}</p>}
      <p className="mt-2 rounded-callout bg-brand-soft p-3 text-sm font-semibold">{receipt.oneLiner}</p>
      <dl className="mt-3 space-y-2.5">
        {STAR_LABELS.map(([label, key]) => (
          <div key={key}>
            <dt className="text-xs font-bold text-muted">{label}</dt>
            <dd className="mt-0.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{receipt[key]}</dd>
          </div>
        ))}
      </dl>
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
  const opened = receipts.find((r) => r.id === openedId);

  return (
    <AppShell>
      <BackLink href="/career" label="취업" />
      <header className="flex items-center justify-between gap-3 px-1">
        <h1 className="text-[22px] font-bold">스펙 영수증</h1>
        <Link
          href="/career/receipts/new"
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-button bg-brand px-3 text-sm font-semibold text-white active:bg-brand-strong"
        >
          <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
          쓰기
        </Link>
      </header>
      <p className="mt-1 px-1 text-[13px] text-muted">끝난 경험을 잊기 전에 자소서 재료로 남겨요.</p>

      {hydrated && (
        <div className="mt-4 space-y-2">
          {receipts.map((receipt) => (
            <button
              key={receipt.id}
              type="button"
              onClick={() => setOpenedId(receipt.id)}
              className="block min-h-11 w-full rounded-block bg-surface p-3.5 text-left active:bg-divider"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 break-words text-[15px] font-bold">{receipt.title}</span>
                {receipt.period && (
                  <span className="shrink-0 font-mono text-xs text-muted">{receipt.period}</span>
                )}
              </span>
              <span className="mt-1 block break-words text-[13px] leading-relaxed">{receipt.oneLiner}</span>
              <CompetencyBadges names={receipt.competencies} />
            </button>
          ))}
          {receipts.length === 0 && (
            <Block>
              <p className="text-sm text-muted">
                아직 영수증이 없어요. &apos;쓰기&apos;를 눌러 경험을 하나 남겨 보세요.
              </p>
            </Block>
          )}
        </div>
      )}

      {opened && <ReceiptSheet key={opened.id} receipt={opened} onClose={() => setOpenedId(null)} />}
    </AppShell>
  );
}
