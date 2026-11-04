"use client";

import { useState } from "react";
import Button from "@/components/ui/button";
import {
  MAX_BACKUP_BYTES,
  describeImport,
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

      const result = importBackup(data);
      const keptNote = result.timetableKept ? " 시간표는 이 폰에 있는 것을 그대로 뒀어요." : "";
      if (!result.changed) {
        setNotice({ kind: "ok", text: `파일의 내용이 이미 모두 들어 있어요.${keptNote}` });
        setBusy(false);
        return;
      }

      setNotice({
        kind: "ok",
        text: `${describeImport(result)} 가져왔어요.${keptNote} 화면을 새로 고칠게요.`,
      });
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    } catch {
      setNotice({ kind: "error", text: "가져오지 못했어요. 기록은 그대로예요." });
      setBusy(false);
    }
  }

  return (
    <section className="mt-5">
      <h3 className="text-[15px] font-bold">내 일정 옮기기</h3>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        일정, 대외활동, 시간표, 공부 기록, 시험 결과, 점수, 영수증을 파일로 받아 두면 다른 폰에서 되살릴 수 있어요. 가져오면 지금 기록에 더해져요.
      </p>

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={handleExport} disabled={busy} className="flex-1">
          내보내기
        </Button>
        <label
          className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-button bg-canvas px-4 text-[15px] font-semibold text-ink active:bg-divider has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
            busy ? "opacity-40" : "cursor-pointer"
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
          className={`mt-2.5 text-xs leading-relaxed ${
            notice.kind === "error"
              ? "rounded-button border border-review-line bg-review-soft px-3 py-2 text-review"
              : "text-muted"
          }`}
        >
          {notice.text}
        </p>
      )}

      <p className="mt-2.5 text-xs leading-relaxed text-muted">
        파일에 내 일정과 시간표, 공부 기록, 점수, 영수증이 들어 있어요. 서버로 보내지 않으니, 단톡방에 올리지 말고 나만 볼 수 있는 곳에 두세요.
      </p>
    </section>
  );
}
