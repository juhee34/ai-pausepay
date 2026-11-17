"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

// 아래에서 올라오는 창. 뒤 배경을 어둡게 하고, 배경·손잡이를 누르거나 Esc를 누르면 닫힌다.
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    // 창이 열려 있는 동안 뒤 화면이 스크롤되지 않게
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
      const first = items[0];
      const last = items[items.length - 1];
      if (!first) { e.preventDefault(); dialog.focus(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === dialog)) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        aria-label="닫기"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/40"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "상세 보기"}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-[480px] animate-sheet-up overflow-y-auto rounded-t-block bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink"
      >
        <div aria-hidden="true" className="mx-auto mt-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 mt-2 flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-bold tracking-tight">{title ?? "상세 보기"}</h2>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-canvas text-muted"
        >
          <X size={19} strokeWidth={1.8} aria-hidden="true" />
        </button>
        </div>
        {children}
      </div>
    </div>
  );
}
