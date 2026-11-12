"use client";

import { aiFetch } from "@/lib/ai-fetch";

import { ChevronLeft, FileUp, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/ui/app-shell";
import BrandLabel from "@/components/ui/brand-label";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import CookieNote from "@/components/ui/cookie-note";
import { Checkbox } from "@/components/ui/check-row";
import SegmentedTabs from "@/components/ui/segmented-tabs";
import {
  ACTIVITY_KINDS,
  MAX_ACTIVITY_TEXT,
  MAX_ACTIVITY_TITLE,
  addPostingCard,
  type ActivityKind,
} from "@/lib/activity-store";
import { useToday } from "@/lib/briefing";
import { downloadCalendarFile } from "@/lib/calendar-file";
import { addDeadlines } from "@/lib/deadline-store";
import {
  CARD_KINDS,
  MAX_POSTING_TEXT,
  POSTING_IMAGE_TYPES,
  isPostingImage,
  type PostingResult,
} from "@/lib/posting";
import { MAX_UPLOAD_BYTES } from "@/lib/syllabus";
import EditSheet from "./edit-sheet";
import MonthCalendar from "./month-calendar";
import ReviewList, { type Draft } from "./review-list";

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "mt-1.5 block min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 py-2.5 text-[16px] font-normal text-ink outline-none placeholder:text-muted focus:border-brand";

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// 공고·자격증 → 일정. 올리기 → AI가 찾은 일정 확인·수정 → 일정 저장 + 대외활동 카드 + .ics 내려받기.
// 화면 주소는 /career/posting (취업 안). 옛 주소 /calendar?type=posting은 여기로 보낸다.
export default function PostingFlow() {
  const today = useToday();
  const [source, setSource] = useState<"image" | "text">("image");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; hasCard: boolean } | null>(null);

  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [org, setOrg] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<ActivityKind>("대외활동");
  const [makeCard, setMakeCard] = useState(true);
  const [month, setMonth] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    // 같은 파일을 다시 골라도 반응하도록 선택 칸을 비운다.
    e.target.value = "";
    if (!picked) return;
    setNotice(null);
    setFile(null);
    if (!isPostingImage(picked.type)) {
      setError("PNG·JPG 캡쳐만 올릴 수 있어요. PDF는 글을 복사해 붙여 넣어 주세요.");
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setError(`캡쳐가 너무 커요 (${formatSize(picked.size)}). 4MB 이하로 줄여서 올려 주세요.`);
      return;
    }
    setError(null);
    setFile(picked);
  }

  const canFind = !loading && (source === "image" ? file !== null : text.trim() !== "");

  async function findEvents() {
    if (!canFind) return;
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      let res: Response;
      if (source === "image" && file) {
        const body = new FormData();
        body.append("file", file);
        res = await aiFetch("/api/posting", { method: "POST", body });
      } else {
        res = await aiFetch("/api/posting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      }
      const data = (await res.json().catch(() => null)) as (PostingResult & { error?: string }) | null;
      if (!res.ok || !data) {
        setError(data?.error ?? "공고를 읽지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      if (data.events.length === 0) {
        setError("챙길 일정을 찾지 못했어요. 날짜가 보이게 다시 캡쳐하거나 글을 넣어 주세요.");
        return;
      }
      setOrg(data.org);
      setTitle(data.title);
      setKind(data.kind);
      setMakeCard(CARD_KINDS.includes(data.kind));
      const firstUpcoming = data.events.find((e) => e.date && today && e.date >= today)?.date;
      setMonth((firstUpcoming ?? today ?? "").slice(0, 7));
      setDrafts(
        data.events.map((event) => ({
          key: crypto.randomUUID(),
          checked: true,
          course: data.org,
          title: event.title,
          date: event.date,
          when: [event.rawText, event.time].filter(Boolean).join(" "),
          kind: "기타",
        })),
      );
      setFile(null);
      setText("");
    } catch {
      setError("인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  function save() {
    if (!drafts || !title.trim()) return;
    const chosen = drafts.filter((d) => d.checked);
    // 날짜가 정해지지 않은 일정이 있으면 그 일정의 날짜 고르기부터
    const undated = chosen.find((d) => !d.date);
    if (undated) {
      setEditing(undated.key);
      return;
    }
    if (chosen.length === 0) return;
    setError(null);

    const name = title.trim();
    const orgName = org.trim();
    const dates = chosen.map((d) => d.date!).sort();
    const eventDate = (eventTitle: string) => chosen.find((d) => d.title === eventTitle)?.date ?? undefined;

    let added = 0;
    let saved: ReturnType<typeof addDeadlines>["saved"] = [];
    let cardAdded = false;
    try {
      ({ added, saved } = addDeadlines(
        chosen.map((d) => ({
          course: orgName,
          title: `${name} ${d.title}`,
          date: d.date!,
          when: d.when,
          kind: d.kind,
          source: "posting" as const,
        })),
      ));
      if (makeCard) {
        cardAdded = addPostingCard({
          title: name.slice(0, MAX_ACTIVITY_TITLE),
          // 카드의 다음 마감은 오늘 이후 첫 일정, 모두 지났으면 마지막 일정
          date: dates.find((d) => today && d >= today) ?? dates[dates.length - 1],
          stage: "applied",
          kind,
          org: orgName.slice(0, MAX_ACTIVITY_TEXT) || undefined,
          startDate: eventDate("활동 시작"),
          endDate: eventDate("활동 끝"),
        });
      }
    } catch {
      setError("저장을 마치지 못했어요. 일부 일정은 저장됐을 수 있으니, 저장 공간을 확인하고 다시 눌러 주세요.");
      return;
    }

    let message = `일정 ${added}개를 새로 저장했어요.`;
    if (chosen.length > added) message += ` 이미 있던 ${chosen.length - added}개는 건너뛰었어요.`;
    if (cardAdded) message += " 대외활동 목록에 '준비 중'으로 넣었어요.";
    try {
      downloadCalendarFile(saved);
      message += " 캘린더 파일을 내려받았어요.";
    } catch {
      setError("일정은 저장했지만 캘린더 파일을 만들지 못했어요. 홈의 '다시 받기'를 눌러 주세요.");
    }
    setNotice({ text: message, hasCard: cardAdded });
    setDrafts(null);
  }

  const editingDraft = drafts?.find((d) => d.key === editing) ?? null;

  if (drafts && today) {
    const checkedCount = drafts.filter((d) => d.checked).length;
    return (
      <AppShell>
        <BrandLabel />
        <header className="mb-4 flex items-start gap-2">
          <button
            type="button"
            aria-label="올리기로 돌아가기"
            onClick={() => {
              if (confirm("찾은 일정을 버리고 돌아갈까요?")) setDrafts(null);
            }}
            className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink active:bg-divider"
          >
            <ChevronLeft size={22} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-[22px] font-bold leading-tight">찾은 일정 {drafts.length}개</h1>
            <p className="text-xs text-muted">공고와 날짜를 비교해 주세요</p>
          </div>
        </header>

        <Block className="space-y-3">
          <label className="block text-[13px] font-semibold">
            이름
            <input
              value={title}
              maxLength={MAX_ACTIVITY_TITLE}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-[13px] font-semibold">
            기관 <span className="text-xs font-medium text-muted">(선택)</span>
            <input
              value={org}
              maxLength={MAX_ACTIVITY_TEXT}
              onChange={(e) => setOrg(e.target.value)}
              className={inputClass}
            />
          </label>
          <fieldset>
            <legend className="text-[13px] font-semibold">종류</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ACTIVITY_KINDS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => {
                    setKind(value);
                    setMakeCard(CARD_KINDS.includes(value));
                  }}
                  className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${
                    kind === value ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span className="text-[13px] font-semibold">대외활동 목록에도 넣기</span>
            <Checkbox checked={makeCard} onChange={setMakeCard} label="대외활동 목록에도 넣기" />
          </div>
        </Block>

        <div className="mt-2.5">
          <MonthCalendar
            month={month}
            today={today}
            marks={drafts.flatMap((d) => (d.date ? [{ date: d.date, kind: d.kind }] : []))}
            onMonthChange={setMonth}
            onSelectDate={(date) => {
              const target = drafts.find((d) => d.date === date);
              document.getElementById(`draft-${target?.key}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </div>

        <ReviewList drafts={drafts} month={month} onChange={setDrafts} onEdit={setEditing} />
        <Button
          variant="secondary"
          className="mt-2.5 w-full !bg-surface"
          onClick={() => {
            const key = crypto.randomUUID();
            setDrafts([...drafts, { key, checked: true, course: org, title: "기타", date: null, when: "", kind: "기타" }]);
            setEditing(key);
          }}
        >
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
          일정 직접 추가
        </Button>
        <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
          AI가 찾은 결과라 틀릴 수 있어요. 지원 전에 공고 원문을 꼭 확인해 주세요. 일정 이름을 누르면 고칠 수 있어요.
        </p>
        {error && (
          <p role="alert" className="mt-3 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review">
            {error}
          </p>
        )}

        {/* 아래 고정 바가 마지막 내용을 가리지 않게 */}
        <div className="h-24" aria-hidden="true" />
        <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 border-t border-line bg-surface">
          <div className="mx-auto max-w-[480px] px-4 py-2.5">
            <Button className="w-full" disabled={checkedCount === 0 || !title.trim()} onClick={save}>
              <span>
                <span className="font-mono">{checkedCount}</span>개 일정 캘린더에 추가
              </span>
            </Button>
            <p className="mt-1 text-center text-[11px] text-muted">.ics 파일로 받아요 · 하루 전 알림 포함</p>
          </div>
        </div>

        <EditSheet
          draft={editingDraft}
          sourceLabel="공고 원문"
          onClose={() => setEditing(null)}
          onRemove={() => {
            setDrafts(drafts.filter((d) => d.key !== editing));
            setEditing(null);
          }}
          onSave={(patch) => {
            setDrafts(drafts.map((d) => (d.key === editing ? { ...d, ...patch, checked: true } : d)));
            setEditing(null);
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link href="/career" className="-ml-1 mb-1 flex min-h-11 w-fit items-center gap-0.5 pr-2 text-xs font-semibold text-brand">
        <ChevronLeft size={16} strokeWidth={1.8} aria-hidden="true" />
        취업
      </Link>
      <p className="px-1 text-xs font-medium text-muted">공고·자격증 올리기</p>
      <h1 className="px-1 text-[22px] font-bold">공고 한 장으로 취준 일정</h1>
      <p className="mt-1 px-1 text-sm text-muted">
        대외활동·공모전·인턴·채용 공고나 자격증 안내를 넣으면 마감일을 찾아 드려요.
      </p>

      <Block className="mt-4">
        <SegmentedTabs
          label="어떻게 넣을까요"
          options={[
            { value: "image", label: "캡쳐 올리기" },
            { value: "text", label: "글 붙여 넣기" },
          ]}
          value={source}
          onChange={(next) => {
            setSource(next);
            setError(null);
          }}
        />

        {source === "image" ? (
          <div className="mt-3">
            <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-button bg-canvas px-4 py-3 text-[15px] font-semibold active:bg-divider">
              <FileUp size={20} strokeWidth={1.8} aria-hidden="true" />
              {file ? "다른 캡쳐 고르기" : "캡쳐 고르기"}
              <input
                type="file"
                accept={POSTING_IMAGE_TYPES.join(",")}
                disabled={loading}
                onChange={handleFile}
                className="sr-only"
              />
            </label>
            {file ? (
              <p className="mt-2 truncate text-center text-sm font-semibold">
                {file.name} <span className="font-mono text-xs font-medium text-muted">{formatSize(file.size)}</span>
              </p>
            ) : (
              <p className="mt-2 text-center text-xs text-muted">PNG · JPG, 4MB까지</p>
            )}
          </div>
        ) : (
          <label className="mt-3 block text-[13px] font-semibold">
            공고 글
            <textarea
              rows={7}
              value={text}
              maxLength={MAX_POSTING_TEXT}
              onChange={(e) => setText(e.target.value)}
              placeholder="모집 기간과 일정이 보이게 공고 글을 붙여 넣어 주세요."
              className={inputClass}
            />
            <span className="mt-1 block text-right font-mono text-xs font-medium text-muted">
              {text.length}/{MAX_POSTING_TEXT}
            </span>
          </label>
        )}

        <Button className="mt-3 w-full" onClick={findEvents} disabled={!canFind}>
          {loading ? "일정 찾는 중… (10~30초)" : "AI로 일정 찾기"}
        </Button>
        <CookieNote />
      </Block>

      <p className="mt-3 px-1 text-xs leading-relaxed text-muted">
        올린 캡쳐와 글은 서버에 저장하지 않고, 일정을 찾는 데만 써요. 저장한 일정은 이 기기에만 있어요.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-callout bg-brand-soft p-3.5 text-sm font-semibold text-brand">
          {notice.text}{" "}
          <Link href="/" className="underline">
            홈 달력에서 보기
          </Link>
          {notice.hasCard && (
            <>
              {" · "}
              <Link href="/career" className="underline">
                대외활동 보기
              </Link>
            </>
          )}
        </p>
      )}
    </AppShell>
  );
}
