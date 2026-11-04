"use client";

import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import CookieNote from "@/components/ui/cookie-note";
import { aiFetch } from "@/lib/ai-fetch";
import { convertScore, formatPoints, type GradingItem } from "@/lib/grades";
import { resolveScoreSheet, scoreStats } from "@/lib/score-sheet";
import { MAX_UPLOAD_BYTES, isAcceptedType } from "@/lib/syllabus";

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputClass =
  "mt-1.5 min-h-11 w-full min-w-0 rounded-button border border-line bg-surface px-3 text-[16px] font-normal text-ink outline-none focus:border-brand";

type ReadResult = {
  maxScore: number | null;
  myScore: number | null;
  average: number | null;
  stdDev: number | null;
  scores: number[];
};

export type ScoreSheetApply = { item: string; score: number | null; average: number; spread: number | null };

const text = (value: number | null) => (value === null ? "" : String(value));

// 점수표 사진이나 PDF를 AI가 읽고, 사용자가 숫자를 확인·수정한 뒤 저장한다.
export default function ScoreUploadSheet({
  items,
  firstItem,
  onClose,
  onApply,
}: {
  items: GradingItem[];
  firstItem: string;
  onClose: () => void;
  onApply: (result: ScoreSheetApply) => void;
}) {
  const [itemName, setItemName] = useState(firstItem);
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [read, setRead] = useState(false);

  const [maxScore, setMaxScore] = useState("");
  const [myScore, setMyScore] = useState("");
  const [average, setAverage] = useState("");
  const [stdDev, setStdDev] = useState("");
  const [scoreList, setScoreList] = useState("");

  const item = items.find((i) => i.name === itemName) ?? items[0];
  const { values, error: formError } = resolveScoreSheet({ maxScore, myScore, average, stdDev, scoreList });

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    e.target.value = "";
    setError(null);
    setFile(null);
    if (!picked) return;
    if (!isAcceptedType(picked.type)) {
      setError("PDF나 PNG·JPG 이미지만 올릴 수 있어요.");
      return;
    }
    if (picked.size > MAX_UPLOAD_BYTES) {
      setError("파일이 4MB보다 커요. 점수 부분만 다시 캡쳐해 주세요.");
      return;
    }
    setFile(picked);
  }

  async function readFile() {
    if (!file) return;
    setReading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("item", item.name);
      const response = await aiFetch("/api/scores", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        setError(data?.error ?? "점수를 읽지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const result = data as ReadResult;
      const stats = result.scores.length >= 2 ? scoreStats(result.scores) : null;
      setMaxScore(text(result.maxScore));
      setMyScore(text(result.myScore));
      setAverage(text(result.average ?? stats?.mean ?? null));
      setStdDev(text(result.stdDev ?? stats?.stdDev ?? null));
      setScoreList(result.scores.join(", "));
      setRead(true);
    } catch {
      setError("점수를 읽지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setReading(false);
    }
  }

  function apply() {
    if (!values) return;
    const convert = (value: number) => convertScore(value, values.maxScore, item.weight);
    onApply({
      item: item.name,
      score: values.myScore === null ? null : convert(values.myScore),
      average: convert(values.average),
      spread: values.stdDev === null ? null : convert(values.stdDev),
    });
  }

  return (
    <BottomSheet open onClose={onClose} title={read ? "읽은 점수 확인" : "점수 사진·PDF 넣기"}>
      {!read ? (
        <>
          <p className="-mt-1 rounded-callout border border-review-line bg-review-soft p-3 text-xs font-semibold leading-relaxed text-review">
            다른 학생의 이름과 학번은 가리고 올려 주세요. 파일은 AI가 숫자를 읽을 때만 쓰고 저장하지 않아요.
          </p>
          <fieldset className="mt-3">
            <legend className="text-[13px] font-semibold">어떤 항목의 점수인가요?</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {items.map(({ name }) => (
                <button
                  key={name}
                  type="button"
                  aria-pressed={name === item.name}
                  onClick={() => setItemName(name)}
                  className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${
                    name === item.name ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </fieldset>
          <label
            className={`mt-3 flex min-h-11 items-center justify-center rounded-button bg-canvas px-4 text-[15px] font-semibold active:bg-divider has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
              reading ? "opacity-40" : "cursor-pointer"
            }`}
          >
            {file ? "다른 파일 고르기" : "사진이나 PDF 고르기"}
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              onChange={pickFile}
              disabled={reading}
              className="sr-only"
            />
          </label>
          <p className="mt-1.5 text-center text-xs text-muted">PDF · PNG · JPG, 4MB까지</p>
          {file && <p className="mt-2 truncate text-sm font-semibold">{file.name}</p>}
          {error && (
            <p role="alert" className="mt-2 text-xs font-semibold text-review">
              {error}
            </p>
          )}
          <Button className="mt-3 w-full" disabled={!file || reading} onClick={() => void readFile()}>
            {reading ? "점수 읽는 중… (10~30초)" : "AI로 점수 읽기"}
          </Button>
          <CookieNote />
        </>
      ) : (
        <>
          <p className="-mt-1 text-xs leading-relaxed text-muted">
            AI가 읽은 숫자라 틀릴 수 있어요. 원본과 비교하고 고쳐 주세요. <span className="font-semibold text-ink">{item.name}</span> 점수로 저장해요.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { id: "sheet-my", label: "내 점수", value: myScore, set: setMyScore },
              { id: "sheet-max", label: "만점", value: maxScore, set: setMaxScore },
              { id: "sheet-average", label: "평균", value: average, set: setAverage },
              { id: "sheet-stddev", label: "표준편차 (선택)", value: stdDev, set: setStdDev },
            ].map(({ id, label, value, set }) => (
              <label key={id} className="block min-w-0 text-[13px] font-semibold">
                {label}
                <input
                  id={id}
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </label>
            ))}
          </div>
          <label className="mt-3 block text-[13px] font-semibold">
            전체 점수 (선택)
            <textarea
              id="sheet-list"
              value={scoreList}
              onChange={(e) => setScoreList(e.target.value)}
              rows={3}
              placeholder="예: 18, 22, 25, 30"
              className={`${inputClass} py-2.5 font-mono`}
            />
            <span className="mt-1 block text-xs font-normal text-muted">
              평균이나 표준편차 칸을 비우면 이 점수로 계산해요. 목록은 저장하지 않아요.
            </span>
          </label>
          {values && (
            <div role="status" className="mt-3 rounded-button bg-canvas p-3 text-xs leading-relaxed">
              {values.count > 0 && (
                <p>
                  전체 <span className="font-mono font-semibold">{values.count}</span>명
                  {values.rank !== null && (
                    <>
                      {" · "}내 등수 <span className="font-mono font-semibold">{values.rank}</span>등 (상위{" "}
                      <span className="font-mono font-semibold">{values.topPercent}</span>%)
                    </>
                  )}
                </p>
              )}
              <p>
                배점 <span className="font-mono">{formatPoints(item.weight)}</span>점 기준으로
                {values.myScore !== null && (
                  <>
                    {" "}내 점수 <span className="font-mono font-semibold">{formatPoints(convertScore(values.myScore, values.maxScore, item.weight))}</span>점,
                  </>
                )}{" "}
                평균 <span className="font-mono font-semibold">{formatPoints(convertScore(values.average, values.maxScore, item.weight))}</span>점이에요.
              </p>
              {values.stdDev === null && <p className="mt-1 text-muted">표준편차가 없어서 퍼진 정도는 임시 값을 써요.</p>}
            </div>
          )}
          {formError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-review">
              {formError}
            </p>
          )}
          <Button className="mt-3 w-full" disabled={!values} onClick={apply}>
            이 숫자로 저장
          </Button>
          <Button variant="ghost" onClick={() => setRead(false)} className="mt-1 w-full">
            다른 파일 올리기
          </Button>
        </>
      )}
    </BottomSheet>
  );
}
