"use client";

// 일정, 대외활동, 시간표, 집중 모드 공부 기록, 시험 대비 결과, 점수, 평가 비율, 스펙 영수증을 파일로 내보내고 다시 불러온다.
// 파일은 이 기기 안에서만 만들고 읽으며 서버로 보내지 않는다. 계정 백업(account-backup.ts)은 같은 검사를 쓴다.
// 저장소 파일(deadline-store.ts, activity-store.ts)은 화면 안에 사본을 들고 있으므로,
// 가져온 뒤에는 페이지를 새로 고쳐야 화면에 반영된다.

import type { FocusData } from "@/app/focus/store";
import { hasValidActivityDetails, type Activity } from "./activity-store";
import type { SavedDeadline } from "./deadline-store";
import {
  EXAM_RESULTS_KEY,
  MAX_EXAM_RESULTS,
  isExamResult,
  type ExamResult,
} from "./exam-results";
import { GRADES_KEY, isCourseGrades, type GradesData } from "./grades-store";
import { GRADING_KEY, isGradingList, type GradingData } from "./grading-store";
import { RECEIPTS_KEY, isReceipt, type Receipt } from "./receipt-store";
import { DEADLINE_KINDS } from "./syllabus";
import { isClassSlot, type ClassSlot } from "./timetable";

const DEADLINES_KEY = "unis.deadlines.v1";
const ACTIVITIES_KEY = "unis.activities.v1";
const FOCUS_KEY = "unis-focus";
const TIMETABLE_KEY = "unis.timetable.v1";

const BACKUP_APP = "unis";
const BACKUP_VERSION = 1;

// 일정 파일은 작다. 엉뚱한 큰 파일을 고르면 읽기 전에 막는다.
export const MAX_BACKUP_BYTES = 1024 * 1024;

// 진행 중인 타이머(session)는 그 기기의 일이라 옮기지 않는다.
type FocusBackup = Pick<FocusData, "subjects" | "records">;
export type BackupData = {
  deadlines: SavedDeadline[];
  activities: Activity[];
  focus: FocusBackup;
  timetable: ClassSlot[];
  examResults: ExamResult[];
  grades: GradesData;
  grading: GradingData;
  receipts: Receipt[];
};

const EMPTY_FOCUS: FocusBackup = { subjects: [], records: [] };

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
  return (
    typeof a.id === "string" &&
    typeof a.title === "string" &&
    isYmd(a.date) &&
    hasValidActivityDetails(a)
  );
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isFocusRecord(value: unknown): value is FocusData["records"][number] {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.subject === "string" &&
    typeof r.minutes === "number" &&
    Number.isFinite(r.minutes) &&
    r.minutes >= 0 &&
    typeof r.finishedAt === "number" &&
    Number.isFinite(r.finishedAt)
  );
}

function isFocusSession(value: unknown): value is NonNullable<FocusData["session"]> {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.subject === "string" &&
    (s.phase === "focus" || s.phase === "break" || s.phase === "done") &&
    typeof s.endsAt === "number"
  );
}

function readList<T>(key: string, isItem: (value: unknown) => value is T): T[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readRecord<T>(key: string, isValue: (value: unknown) => value is T): Record<string, T> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!isPlainObject(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isValue(value)),
    ) as Record<string, T>;
  } catch {
    return {};
  }
}

function readFocus(): FocusData {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? "null");
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_FOCUS, session: null };
    const { subjects, records, session } = parsed as Record<string, unknown>;
    return {
      subjects: Array.isArray(subjects) ? subjects.filter(isString) : [],
      records: Array.isArray(records) ? records.filter(isFocusRecord) : [],
      session: isFocusSession(session) ? session : null,
    };
  } catch {
    return { ...EMPTY_FOCUS, session: null };
  }
}

function readCurrent(): BackupData {
  const { subjects, records } = readFocus();
  return {
    deadlines: readList(DEADLINES_KEY, isDeadline),
    activities: readList(ACTIVITIES_KEY, isActivity),
    focus: { subjects, records },
    timetable: readList(TIMETABLE_KEY, isClassSlot),
    examResults: readList(EXAM_RESULTS_KEY, isExamResult),
    grades: readRecord(GRADES_KEY, isCourseGrades),
    grading: readRecord(GRADING_KEY, isGradingList),
    receipts: readList(RECEIPTS_KEY, isReceipt),
  };
}

// 검사를 통과한 값만 고른 지금 기록. 계정 백업이 올린다.
export function readBackupData() {
  return readCurrent();
}

export function hasBackupData() {
  const { deadlines, activities, focus, timetable, examResults, grades, grading, receipts } = readCurrent();
  return (
    receipts.length > 0 ||
    Object.keys(grades).length > 0 ||
    Object.keys(grading).length > 0 ||
    deadlines.length > 0 ||
    activities.length > 0 ||
    focus.subjects.length > 0 ||
    focus.records.length > 0 ||
    timetable.length > 0 ||
    examResults.length > 0
  );
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

function parseFocus(value: unknown): FocusBackup | null {
  // 공부 기록을 넣기 전에 내보낸 파일에는 이 칸이 없다.
  if (value === undefined) return EMPTY_FOCUS;
  if (!value || typeof value !== "object") return null;
  const { subjects, records } = value as Record<string, unknown>;
  if (!Array.isArray(subjects) || !subjects.every(isString)) return null;
  if (!Array.isArray(records) || !records.every(isFocusRecord)) return null;
  return { subjects, records };
}

// 이 칸을 넣기 전에 내보낸 파일에는 칸이 없다. 있는데 형식이 틀리면 null.
function parseOptionalList<T>(value: unknown, isItem: (item: unknown) => item is T): T[] | null {
  if (value === undefined) return [];
  return Array.isArray(value) && value.every(isItem) ? value : null;
}

function parseOptionalRecord<T>(
  value: unknown,
  isValue: (item: unknown) => item is T,
): Record<string, T> | null {
  if (value === undefined) return {};
  return isPlainObject(value) && Object.values(value).every(isValue)
    ? (value as Record<string, T>)
    : null;
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

  const focus = parseFocus(file.focus);
  if (!focus) return null;

  const timetable = parseOptionalList(file.timetable, isClassSlot);
  const examResults = parseOptionalList(file.examResults, isExamResult);
  const grades = parseOptionalRecord(file.grades, isCourseGrades);
  const grading = parseOptionalRecord(file.grading, isGradingList);
  const receipts = parseOptionalList(file.receipts, isReceipt);
  if (!timetable || !examResults || !grades || !grading || !receipts) return null;

  return { deadlines, activities, focus, timetable, examResults, grades, grading, receipts };
}

// 계정 백업에서 받은 값을 파일과 똑같이 검사한다.
export function parseBackupData(data: unknown) {
  if (!isPlainObject(data)) return null;
  return parseBackup(JSON.stringify({ ...data, app: BACKUP_APP, version: BACKUP_VERSION }));
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

// 과목은 합치고, 과목과 끝난 시각이 같은 기록은 하나만 남긴다. 이 기기의 진행 중인 타이머는 그대로 둔다.
function mergeFocus(current: FocusData, incoming: FocusBackup) {
  const subjects = [...new Set([...current.subjects, ...incoming.subjects])];
  const seen = new Set(current.records.map((r) => `${r.subject}|${r.finishedAt}`));
  const fresh = incoming.records.filter((r) => {
    const key = `${r.subject}|${r.finishedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const records = [...current.records, ...fresh].sort((a, b) => a.finishedAt - b.finishedAt);

  return {
    merged: { subjects, records, session: current.session },
    added: fresh.length,
    changed: fresh.length > 0 || subjects.length !== current.subjects.length,
  };
}

// 과목과 끝난 시각이 같은 결과는 하나만 남긴다.
function mergeExamResults(current: ExamResult[], incoming: ExamResult[]) {
  const seen = new Set(current.map((r) => `${r.course}|${r.finishedAt}`));
  const fresh = incoming.filter((r) => {
    const key = `${r.course}|${r.finishedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const merged = [...current, ...fresh]
    .sort((a, b) => a.finishedAt - b.finishedAt)
    .slice(-MAX_EXAM_RESULTS);
  return { merged, added: fresh.length };
}

// 과목별 기록은 섞지 않는다. 이 기기에 이미 있는 과목은 그대로 두고 없는 과목만 더한다.
function mergeRecord<T>(current: Record<string, T>, incoming: Record<string, T>) {
  const fresh = Object.entries(incoming).filter(([course]) => !Object.hasOwn(current, course));
  return { merged: { ...current, ...Object.fromEntries(fresh) }, added: fresh.length };
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
  const focus = mergeFocus(readFocus(), data.focus);
  const examResults = mergeExamResults(current.examResults, data.examResults);
  const grades = mergeRecord(current.grades, data.grades);
  const grading = mergeRecord(current.grading, data.grading);
  // 같은 영수증(id)은 이 기기 것을 그대로 두고 없는 것만 더한다.
  const knownReceipts = new Set(current.receipts.map((r) => r.id));
  const freshReceipts = data.receipts.filter((r) => !knownReceipts.has(r.id));

  // 시간표는 학기당 하나라 섞지 않는다. 이 기기에 없을 때만 파일 것을 넣는다.
  const timetableAdded = current.timetable.length === 0 && data.timetable.length > 0;
  const timetableKept =
    current.timetable.length > 0 &&
    data.timetable.length > 0 &&
    JSON.stringify(current.timetable) !== JSON.stringify(data.timetable);

  const keys = [
    DEADLINES_KEY,
    ACTIVITIES_KEY,
    FOCUS_KEY,
    TIMETABLE_KEY,
    EXAM_RESULTS_KEY,
    GRADES_KEY,
    GRADING_KEY,
    RECEIPTS_KEY,
  ];
  const previous = keys.map((key) => localStorage.getItem(key));
  try {
    localStorage.setItem(DEADLINES_KEY, JSON.stringify(deadlines.merged));
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activities.merged));
    if (focus.changed) localStorage.setItem(FOCUS_KEY, JSON.stringify(focus.merged));
    if (timetableAdded) localStorage.setItem(TIMETABLE_KEY, JSON.stringify(data.timetable));
    if (examResults.added > 0) {
      localStorage.setItem(EXAM_RESULTS_KEY, JSON.stringify(examResults.merged));
    }
    if (grades.added > 0) localStorage.setItem(GRADES_KEY, JSON.stringify(grades.merged));
    if (grading.added > 0) localStorage.setItem(GRADING_KEY, JSON.stringify(grading.merged));
    if (freshReceipts.length > 0) {
      const receipts = [...current.receipts, ...freshReceipts].sort((a, b) => b.createdAt - a.createdAt);
      localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    }
  } catch (error) {
    keys.forEach((key, index) => restore(key, previous[index]));
    throw error;
  }

  return {
    addedDeadlines: deadlines.added,
    addedActivities: activities.added,
    addedFocusRecords: focus.added,
    addedExamResults: examResults.added,
    addedGrades: grades.added,
    addedGrading: grading.added,
    addedReceipts: freshReceipts.length,
    timetableAdded,
    timetableKept,
    changed:
      grades.added > 0 ||
      grading.added > 0 ||
      freshReceipts.length > 0 ||
      deadlines.added > 0 ||
      activities.added > 0 ||
      focus.changed ||
      timetableAdded ||
      examResults.added > 0,
  };
}

// 가져온 것만 알려 준다.
export function describeImport(result: ReturnType<typeof importBackup>) {
  const parts = [
    result.addedDeadlines > 0 && `일정 ${result.addedDeadlines}개`,
    result.addedActivities > 0 && `대외활동 ${result.addedActivities}개`,
    result.addedFocusRecords > 0 && `공부 기록 ${result.addedFocusRecords}개`,
    result.addedExamResults > 0 && `시험 결과 ${result.addedExamResults}개`,
    result.addedGrades > 0 && `점수 ${result.addedGrades}과목`,
    result.addedGrading > 0 && `평가 비율 ${result.addedGrading}과목`,
    result.addedReceipts > 0 && `영수증 ${result.addedReceipts}장`,
    result.timetableAdded && "시간표",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "기록";
}

function restore(key: string, value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
}
