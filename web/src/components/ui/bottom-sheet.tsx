"use client";

import { useEffect, type ReactNode } from "react";

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
  useEffect(() => {
    if (!open) return;
    // 창이 열려 있는 동안 뒤 화면이 스크롤되지 않게
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-30">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[85dvh] max-w-[480px] animate-sheet-up overflow-y-auto rounded-t-block bg-surface px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink"
      >
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-11 w-full items-center justify-center"
        >
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-line" />
        </button>
        {title && <h2 className="mb-3 text-[17px] font-bold">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
