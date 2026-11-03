"use client";

// 일정과 대외활동을 파일로 내보내고 다시 불러온다. 파일은 이 기기 안에서만 만들고 읽으며 서버로 보내지 않는다.
// 저장소 파일(deadline-store.ts, activity-store.ts)은 화면 안에 사본을 들고 있으므로,
// 가져온 뒤에는 페이지를 새로 고쳐야 화면에 반영된다.

import type { Activity } from "./activity-store";
import type { SavedDeadline } from "./deadline-store";
import { DEADLINE_KINDS } from "./syllabus";

const DEADLINES_KEY = "unis.deadlines.v1";
const ACTIVITIES_KEY = "unis.activities.v1";

const BACKUP_APP = "unis";
const BACKUP_VERSION = 1;

// 일정 파일은 작다. 엉뚱한 큰 파일을 고르면 읽기 전에 막는다.
export const MAX_BACKUP_BYTES = 1024 * 1024;

type BackupData = { deadlines: SavedDeadline[]; activities: Activity[] };

function isYmd(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isDeadline(value: unknown): value is SavedDeadline {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.title === "string" &&
    typeof d.course === "string" &&
    typeof d.when === "string" &&
    isYmd(d.date) &&
    (DEADLINE_KINDS as readonly unknown[]).includes(d.kind)
  );
}

function isActivity(value: unknown): value is Activity {
  if (!value || typeof value !== "object") return false;
  const a = value as Record<string, unknown>;
  return typeof a.id === "string" && typeof a.title === "string" && isYmd(a.date);
}

function readList<T>(key: string, isItem: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

function readCurrent(): BackupData {
  return {
    deadlines: readList(DEADLINES_KEY, isDeadline),
    activities: readList(ACTIVITIES_KEY, isActivity),
  };
}

export function hasBackupData() {
  const { deadlines, activities } = readCurrent();
  return deadlines.length > 0 || activities.length > 0;
}

export function exportBackup() {
  const today = new Date().toLocaleDateString("sv-SE");
  const content = JSON.stringify(
    { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: today, ...readCurrent() },
    null,
    2,
  );

  const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `unis-backup-${today}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 폰 브라우저가 내려받기를 시작할 시간을 준 뒤에 지운다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// 우니스 파일이 아니거나 하나라도 형식이 틀리면 전체를 받지 않는다.
export function parseBackup(text: string): BackupData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const file = parsed as Record<string, unknown>;
  if (file.app !== BACKUP_APP || file.version !== BACKUP_VERSION) return null;

  const { deadlines, activities } = file;
  if (!Array.isArray(deadlines) || !deadlines.every(isDeadline)) return null;
  if (!Array.isArray(activities) || !activities.every(isActivity)) return null;
  return { deadlines, activities };
}

// 같은 내용이면 건너뛰고 새 항목만 더한다. id가 겹치면 새 id를 붙인다.
function mergeList<T extends { id: string; date: string }>(
  current: T[],
  incoming: T[],
  keyOf: (item: T) => string,
) {
  const seen = new Set(current.map(keyOf));
  const ids = new Set(current.map((item) => item.id));
  const fresh: T[] = [];

  for (const item of incoming) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);

    let id = item.id;
    for (let n = 2; ids.has(id); n++) id = `${item.id}-${n}`;
    ids.add(id);
    fresh.push({ ...item, id });
  }

  const merged = [...current, ...fresh].sort((a, b) => a.date.localeCompare(b.date));
  return { merged, added: fresh.length };
}

// 합친 결과를 저장하고 새로 더한 개수를 돌려준다. 저장에 실패하면 원래대로 되돌리고 오류를 던진다.
export function importBackup(data: BackupData) {
  const current = readCurrent();
  const deadlines = mergeList(
    current.deadlines,
    data.deadlines,
    (d) => `${d.course}|${d.title}|${d.date}`,
  );
  const activities = mergeList(
    current.activities,
    data.activities,
    (a) => `${a.title}|${a.date}`,
  );

  const previousDeadlines = localStorage.getItem(DEADLINES_KEY);
  const previousActivities = localStorage.getItem(ACTIVITIES_KEY);
  try {
    localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines.merged));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities.merged));
  } catch (error) {
    restore(DEADLINES_KEY, previousDeadlines);
    restore(ACTIVITIES_KEY, previousActivities);
    throw error;
  }

  return { addedDeadlines: deadlines.added, addedActivities: activities.added };
}

function restore(key: string, value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}
