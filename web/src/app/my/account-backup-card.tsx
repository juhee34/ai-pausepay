"use client";

import { CloudDownload, CloudUpload } from "lucide-react";
import { useEffect, useState } from "react";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import {
  accountBackupErrorMessage,
  describeBackup,
  isBackupEmpty,
  readAccountBackup,
  removeAccountBackup,
  uploadAccountBackup,
  type AccountBackup,
} from "@/lib/account-backup";
import { describeImport, importBackup, readBackupData } from "@/lib/backup";

// 새로 고침 전에 결과 문구를 읽을 시간을 준다.
const RELOAD_DELAY_MS = 1500;

function formatTime(date: Date | null) {
  if (!date) return "시간 확인 중";
  return date.toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// uid가 바뀌면 부모의 key로 초기화한다. 로그인한 사용자가 버튼을 눌렀을 때만 올리고 받는다.
export default function AccountBackupCard({ uid }: { uid: string }) {
  const [backup, setBackup] = useState<AccountBackup | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    readAccountBackup(uid)
      .then((saved) => {
        if (cancelled) return;
        setBackup(saved);
        setLoadFailed(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadFailed(true);
        setNotice({ kind: "error", text: accountBackupErrorMessage(error) });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  async function upload() {
    const local = readBackupData();
    if (isBackupEmpty(local)) {
      setNotice({ kind: "error", text: "이 기기에 백업할 기록이 없어요. 다른 폰의 기록을 받으려면 '이 기기로 받기'를 눌러 주세요." });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      // 다른 폰에서 올린 백업을 덮어쓰지 않도록 저장 직전의 계정 백업으로 다시 묻는다.
      const saved = await readAccountBackup(uid);
      if (
        saved &&
        !confirm(
          `계정 백업을 이 기기 기록으로 바꿀까요?\n\n지금 계정 백업 (${formatTime(saved.updatedAt)})\n${describeBackup(saved.data)}\n\n이 기기 기록\n${describeBackup(local)}\n\n계정에만 있는 기록은 사라져요. 먼저 '이 기기로 받기'를 하면 합칠 수 있어요.`,
        )
      ) {
        setBackup(saved);
        return;
      }
      await uploadAccountBackup(uid);
      setBackup(await readAccountBackup(uid));
      setNotice({ kind: "ok", text: "계정에 백업했어요." });
    } catch (error) {
      setNotice({ kind: "error", text: accountBackupErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setNotice(null);
    try {
      const saved = await readAccountBackup(uid);
      setBackup(saved);
      if (!saved) {
        setNotice({ kind: "error", text: "계정에 저장한 백업이 없어요." });
        setBusy(false);
        return;
      }
      const result = importBackup(saved.data);
      const keptNote = result.timetableKept ? " 시간표는 이 기기에 있는 것을 그대로 뒀어요." : "";
      if (!result.changed) {
        setNotice({ kind: "ok", text: `계정 백업의 내용이 이미 모두 들어 있어요.${keptNote}` });
        setBusy(false);
        return;
      }
      setNotice({ kind: "ok", text: `${describeImport(result)} 받았어요.${keptNote} 화면을 새로 고칠게요.` });
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    } catch (error) {
      setNotice({ kind: "error", text: accountBackupErrorMessage(error) });
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("계정에 저장한 백업을 지울까요? 이 기기의 기록은 그대로예요.")) return;
    setBusy(true);
    setNotice(null);
    try {
      await removeAccountBackup(uid);
      setBackup(null);
      setNotice({ kind: "ok", text: "계정 백업을 지웠어요. 이 기기의 기록은 그대로예요." });
    } catch (error) {
      setNotice({ kind: "error", text: accountBackupErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Block className="mt-2.5">
      <div className="flex items-center gap-2">
        <CloudUpload size={19} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
        <h2 className="text-[15px] font-bold">계정 백업</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        버튼을 누를 때만 내 계정에 저장해요. 다른 폰에서 같은 계정으로 로그인하면 받을 수 있어요.
      </p>

      <div className="mt-3 rounded-callout bg-canvas p-3 text-xs leading-relaxed">
        {loading ? (
          <p role="status" className="text-muted">계정 백업 확인 중…</p>
        ) : loadFailed ? (
          <p className="text-muted">계정 백업 상태를 확인하지 못했어요.</p>
        ) : backup ? (
          <>
            <p className="font-semibold">마지막 백업: {formatTime(backup.updatedAt)}</p>
            <p className="mt-1 text-muted">{describeBackup(backup.data)}</p>
          </>
        ) : (
          <p className="text-muted">아직 계정에 저장한 백업이 없어요.</p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <Button disabled={busy || loading} onClick={() => void upload()}>
          <CloudUpload size={18} strokeWidth={1.8} aria-hidden="true" />
          {busy ? "처리 중…" : "계정에 백업"}
        </Button>
        <Button variant="secondary" disabled={busy || loading} onClick={() => void download()}>
          <CloudDownload size={18} strokeWidth={1.8} aria-hidden="true" />
          이 기기로 받기
        </Button>
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

      <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
        받기는 이 기기 기록에 더해요. 지운 일정이 백업에 남아 있으면 다시 들어올 수 있어요. 올린 파일·이미지, AI에 보낸 글, 진행 중인 타이머는 저장하지 않아요.
      </p>
      {backup && (
        <Button variant="ghost" disabled={busy} onClick={() => void remove()} className="mt-1 w-full">
          계정 백업 지우기
        </Button>
      )}
    </Block>
  );
}
