"use client";

// 로그인한 사용자가 버튼을 눌렀을 때만 정리된 기록을 본인 계정(Firestore)에 올리고 받는다.
// 원본 파일·이미지·AI에 보낸 글·진행 중인 타이머는 올리지 않는다. 접근 규칙은 web/firestore.rules.

import { deleteDoc, doc, getDocFromServer, serverTimestamp, setDoc } from "firebase/firestore";
import { parseBackupData, readBackupData, type BackupData } from "./backup";
import { getFirebaseDb } from "./firebase";
import { accountBackupPath } from "./firebase-paths";

const ACCOUNT_BACKUP_VERSION = 1;
const REQUEST_TIMEOUT_MS = 15_000;
// Firestore 문서 하나는 1MiB까지다. 여유를 둔다.
const MAX_DOCUMENT_BYTES = 900_000;

export class AccountBackupError extends Error {}

export type AccountBackup = { updatedAt: Date | null; data: BackupData };

export function accountBackupErrorMessage(error: unknown) {
  if (error instanceof AccountBackupError) return error.message;
  const code = error && typeof error === "object" && "code" in error ? error.code : "";
  if (code === "permission-denied" || code === "unauthenticated") {
    return "계정 백업 권한을 확인하지 못했어요. 다시 로그인해 주세요.";
  }
  if (code === "unavailable") return "인터넷 연결을 확인하고 다시 해 주세요.";
  if (code === "not-found" || code === "failed-precondition") return "계정 백업을 준비 중이에요. 잠시 뒤에 다시 해 주세요.";
  return "계정 백업을 처리하지 못했어요. 잠시 뒤에 다시 해 주세요.";
}

function backupDoc(uid: string) {
  const db = getFirebaseDb();
  if (!db) throw new AccountBackupError("계정 백업을 준비 중이에요. 이 기기의 기록은 그대로예요.");
  const [first, ...rest] = accountBackupPath(uid);
  return doc(db, first, ...rest);
}

// 인터넷이 끊기면 Firestore 저장은 끝나지 않고 기다리므로 안내로 바꾼다.
function withTimeout<T>(work: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new AccountBackupError("응답이 없어요. 인터넷 연결을 확인하고 다시 해 주세요.")),
      timeoutMs,
    );
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

export function countBackup(data: BackupData) {
  return {
    deadlines: data.deadlines.length,
    activities: data.activities.length,
    timetable: data.timetable.length,
    focus: data.focus.records.length,
    examResults: data.examResults.length,
    grades: Object.keys(data.grades).length,
    grading: Object.keys(data.grading).length,
    receipts: data.receipts.length,
    semester: Object.keys(data.semester ?? {}).length,
  };
}

export function describeBackup(data: BackupData) {
  const c = countBackup(data);
  return [
    `일정 ${c.deadlines}`,
    `대외활동 ${c.activities}`,
    `시간표 ${c.timetable}`,
    `공부 기록 ${c.focus}`,
    `시험 결과 ${c.examResults}`,
    `점수 ${c.grades}과목`,
    `평가 비율 ${c.grading}과목`,
    `영수증 ${c.receipts}`,
    ...(c.semester > 0 ? [`학기 결산 ${c.semester}과목`] : []),
    ...(data.targetJob ? [`목표 직무 ${data.targetJob}`] : []),
  ].join(" · ");
}

export function isBackupEmpty(data: BackupData) {
  return Object.values(countBackup(data)).every((count) => count === 0) && data.focus.subjects.length === 0 && data.targetJob === undefined;
}

// 없으면 null. 형식이 틀린 백업은 이 기기에 넣지 않으려고 오류로 알린다.
export async function readAccountBackup(uid: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<AccountBackup | null> {
  const snapshot = await withTimeout(getDocFromServer(backupDoc(uid)), timeoutMs);
  if (!snapshot.exists()) return null;
  const saved = snapshot.data() as { updatedAt?: { toDate?: () => Date }; data?: unknown };
  const data = parseBackupData(saved.data);
  if (!data) throw new AccountBackupError("계정 백업을 읽지 못했어요. 이 기기의 기록은 그대로예요.");
  return { updatedAt: saved.updatedAt?.toDate?.() ?? null, data };
}

export async function uploadAccountBackup(uid: string, timeoutMs = REQUEST_TIMEOUT_MS) {
  // readBackupData는 검사를 통과한 값만 고른다. Firestore는 undefined를 받지 않으므로 JSON으로 한 번 거른다.
  const text = JSON.stringify(readBackupData());
  const data = JSON.parse(text) as BackupData;
  if (isBackupEmpty(data)) throw new AccountBackupError("이 기기에 백업할 기록이 없어요.");
  if (new TextEncoder().encode(text).length > MAX_DOCUMENT_BYTES) {
    throw new AccountBackupError("기록이 너무 많아 계정에 올리지 못했어요. 내보내기 파일로 보관해 주세요.");
  }
  await withTimeout(
    setDoc(backupDoc(uid), { version: ACCOUNT_BACKUP_VERSION, updatedAt: serverTimestamp(), data }),
    timeoutMs,
  );
}

export async function removeAccountBackup(uid: string, timeoutMs = REQUEST_TIMEOUT_MS) {
  await withTimeout(deleteDoc(backupDoc(uid)), timeoutMs);
}
