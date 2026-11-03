"use client";

import { useState } from "react";
import {
  MAX_BACKUP_BYTES,
  exportBackup,
  hasBackupData,
  importBackup,
  parseBackup,
} from "@/lib/backup";

type Notice = { kind: "ok" | "error"; text: string };

// 새로 고침 전에 결과 문구를 읽을 시간을 준다.
const RELOAD_DELAY_MS = 1500;

// 다른 폰으로 옮기거나 지워진 일정을 되살리는 카드. 홈 화면에 넣어 쓴다.
export default function DataBackup() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  function handleExport() {
    if (!hasBackupData()) {
      setNotice({ kind: "error", text: "아직 내보낼 기록이 없어요." });
      return;
    }
    try {
      exportBackup();
      setNotice({ kind: "ok", text: "파일을 내려받았어요. 다운로드 폴더를 확인해 주세요." });
    } catch {
      setNotice({ kind: "error", text: "파일을 만들지 못했어요. 다시 해 주세요." });
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 반응하도록 선택 칸을 비운다.
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_BACKUP_BYTES) {
      setNotice({ kind: "error", text: "우니스에서 내보낸 파일이 아니에요. 기록은 그대로예요." });
      return;
    }

    setBusy(true);
    try {
      const data = parseBackup(await file.text());
      if (!data) {
        setNotice({ kind: "error", text: "우니스에서 내보낸 파일이 아니에요. 기록은 그대로예요." });
        setBusy(false);
        return;
      }

      const { addedDeadlines, addedActivities, addedFocusRecords, changed } = importBackup(data);
      if (!changed) {
        setNotice({ kind: "ok", text: "파일의 내용이 이미 모두 들어 있어요." });
        setBusy(false);
        return;
      }

      setNotice({
        kind: "ok",
        text: `일정 ${addedDeadlines}개, 대외활동 ${addedActivities}개, 공부 기록 ${addedFocusRecords}개를 가져왔어요. 화면을 새로 고칠게요.`,
      });
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    } catch {
      setNotice({ kind: "error", text: "가져오지 못했어요. 기록은 그대로예요." });
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5">
      <h2 className="text-sm font-semibold">내 일정 옮기기</h2>
      <p className="mt-1 text-xs leading-relaxed text-foreground/60">
        일정, 대외활동, 공부 기록을 파일로 받아 두면 다른 폰에서 되살릴 수 있어요. 가져오면 지금 기록에 더해져요.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={busy}
          className="flex-1 rounded-xl bg-accent-soft px-4 py-2.5 text-sm font-semibold text-accent disabled:opacity-60"
        >
          내보내기
        </button>
        <label
          className={`flex-1 rounded-xl bg-accent-soft px-4 py-2.5 text-center text-sm font-semibold text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
            busy ? "opacity-60" : "cursor-pointer"
          }`}
        >
          가져오기
          {/* 폰에 따라 .json 파일을 고르지 못하게 막기도 해서 종류를 제한하지 않고 내용을 검사한다. */}
          <input type="file" disabled={busy} onChange={handleImport} className="sr-only" />
        </label>
      </div>

      {notice && (
        <p
          role={notice.kind === "error" ? "alert" : "status"}
          className={`mt-3 text-xs leading-relaxed ${
            notice.kind === "error" ? "text-red-700 dark:text-red-300" : "text-foreground/70"
          }`}
        >
          {notice.text}
        </p>
      )}

      <p className="mt-3 text-xs leading-relaxed text-foreground/50">
        파일에 내 일정과 공부 기록이 들어 있어요. 서버로 보내지 않으니, 단톡방에 올리지 말고 나만 볼 수 있는 곳에 두세요.
      </p>
    </section>
  );
}
