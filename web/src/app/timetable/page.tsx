"use client";

import { aiFetch } from "@/lib/ai-fetch";

import { ImageUp } from "lucide-react";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import BrandLabel from "@/components/ui/brand-label";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import CookieNote from "@/components/ui/cookie-note";
import CheckRow from "@/components/ui/check-row";
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES, isAcceptedType } from "@/lib/syllabus";
import type { ClassSlot } from "@/lib/timetable";
import { clearTimetable, saveTimetable, useTimetable } from "@/lib/timetable-store";
import ReviewTable, { type SlotDraft } from "./review-table";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// KLAS 시간표 캡쳐 → AI가 표로 읽기 → 사용자가 확인·수정 → 이 폰에만 저장.
export default function TimetablePage() {
  const saved = useTimetable();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<SlotDraft[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    // 같은 파일을 다시 골라도 반응하도록 선택 칸을 비운다.
    e.target.value = "";
    if (!picked) return;

    setDrafts(null);
    setNotice(null);
    if (!isAcceptedType(picked.type)) {
      setFile(null);
      setError("PNG·JPG 캡쳐나 PDF만 올릴 수 있어요.");
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setFile(null);
      setError(`파일이 너무 커요 (${formatSize(picked.size)}). 시간표 부분만 다시 캡쳐해 주세요.`);
      return;
    }
    setError(null);
    setFile(picked);
  }

  async function readTimetable() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await aiFetch("/api/timetable", { method: "POST", body });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "시간표를 읽지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const slots = data.slots as ClassSlot[];
      if (slots.length === 0) {
        setError("시간표를 찾지 못했어요. KLAS 시간표 화면을 캡쳐했는지 확인해 주세요.");
        return;
      }
      setDrafts(slots.map((s) => ({ ...s, key: crypto.randomUUID() })));
      setFile(null);
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!drafts) return;
    saveTimetable(
      drafts.map((d) => ({
        course: d.course.trim(),
        day: d.day,
        start: d.start,
        end: d.end,
        room: d.room.trim(),
        professor: d.professor.trim(),
      })),
    );
    setNotice(`수업 ${drafts.length}개를 이 폰에 저장했어요.`);
    setDrafts(null);
  }

  return (
    <AppShell>
      <BrandLabel />
      <h1 className="px-1 text-[22px] font-bold">KLAS 시간표 올리기</h1>
      <p className="mt-1 px-1 text-sm text-muted">
        KLAS 시간표 화면을 캡쳐해서 올리면 수업 시간을 읽어 홈에 보여 드려요.
      </p>

      {!drafts && (
        <Block className="mt-6">
          <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-button bg-canvas px-4 py-3 text-[15px] font-semibold active:bg-divider">
            <ImageUp size={20} strokeWidth={1.8} aria-hidden="true" />
            {saved.length > 0 ? "새 캡쳐 고르기" : "캡쳐 고르기"}
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              disabled={loading}
              onChange={handleFile}
              className="sr-only"
            />
          </label>
          <p className="mt-2 text-center text-xs text-muted">PNG · JPG · PDF, 4MB까지</p>

          {file && (
            <div className="mt-3 border-t border-divider pt-3">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <p className="font-mono text-xs text-muted">{formatSize(file.size)}</p>
              <Button className="mt-3 w-full" onClick={readTimetable} disabled={loading}>
                {loading ? "시간표 읽는 중… (10초쯤)" : "AI로 읽기"}
              </Button>
              <CookieNote />
            </div>
          )}
        </Block>
      )}

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        캡쳐는 서버에 저장하지 않고 시간표를 읽는 데만 써요. 시간표는 이 폰에만 저장돼요.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="mt-4 rounded-callout bg-brand-soft p-3.5 text-sm font-semibold text-brand">
          {notice}
        </p>
      )}

      {drafts && (
        <ReviewTable
          drafts={drafts}
          replacing={saved.length > 0}
          onChange={setDrafts}
          onSave={save}
          onCancel={() => setDrafts(null)}
        />
      )}

      {!drafts && saved.length > 0 && (
        <section className="mt-6">
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h2 className="text-[15px] font-bold">저장된 시간표</h2>
            <span className="text-xs text-muted">수업 {saved.length}개</span>
          </div>
          <Block padded={false} className="divide-y divide-divider">
            {saved.map((s, i) => (
              <CheckRow
                key={`${s.day}-${s.start}-${s.course}-${i}`}
                time={s.day}
                title={s.course}
                sub={[s.start ? `${s.start}~${s.end}` : "시간 미정", s.room, s.professor]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </Block>
          <Button
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => {
              if (confirm("저장된 시간표를 지울까요?")) {
                clearTimetable();
                setNotice(null);
              }
            }}
          >
            시간표 지우기
          </Button>
        </section>
      )}
    </AppShell>
  );
}
