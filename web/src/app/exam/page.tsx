"use client";

import { useState } from "react";
import {
  MAX_SOURCE_LENGTH,
  MIN_SOURCE_LENGTH,
  QUIZ_SIZE,
  type ExamPack,
} from "./schema";

type SourceMode = "pdf" | "text";

const SOURCE_MODES: { id: SourceMode; label: string }[] = [
  { id: "pdf", label: "PDF 올리기" },
  { id: "text", label: "글 붙여 넣기" },
];

// 큰 파일을 폰 메모리에 올리다 화면이 멈추지 않게 막는다.
const MAX_PDF_BYTES = 100 * 1024 * 1024;

// PDF 파일은 서버로 보내지 않는다. 브라우저 안에서 쪽별 글자만 뽑는다.
async function readPdfPages(file: File) {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
  try {
    const { text } = await extractText(pdf);
    return text;
  } finally {
    void pdf.loadingTask.destroy();
  }
}

const inputClass =
  "mt-2 w-full rounded-xl border border-foreground/15 bg-transparent px-4 py-3 text-base font-normal outline-none focus:border-accent";

const cardClass = "rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5";

function scrollToTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

export default function ExamPage() {
  const [mode, setMode] = useState<SourceMode>("pdf");
  const [pastedText, setPastedText] = useState("");

  const [fileName, setFileName] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [fromPage, setFromPage] = useState("1");
  const [toPage, setToPage] = useState("1");
  const [reading, setReading] = useState(false);

  const [pack, setPack] = useState<ExamPack | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 지금 푸는 문제들의 번호. 틀린 문제만 다시 풀 때는 그 번호만 남는다.
  const [round, setRound] = useState<number[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [graded, setGraded] = useState(false);

  const from = Number(fromPage);
  const to = Number(toPage);
  const isRangeValid =
    Number.isInteger(from) &&
    Number.isInteger(to) &&
    from >= 1 &&
    to <= pages.length &&
    from <= to;

  const source =
    mode === "text"
      ? pastedText.trim()
      : isRangeValid
        ? pages.slice(from - 1, to).join("\n\n").trim()
        : "";
  const isTooShort = source.length < MIN_SOURCE_LENGTH;
  const isTooLong = source.length > MAX_SOURCE_LENGTH;
  const canSubmit = !isTooShort && !isTooLong && !generating && !reading;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setFileName(null);
    setPages([]);

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("PDF 파일만 올릴 수 있어요. 다른 자료는 글을 복사해서 붙여 넣어 주세요.");
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setError("파일이 100MB보다 커요. 필요한 쪽만 따로 저장하거나 글을 붙여 넣어 주세요.");
      return;
    }

    setReading(true);
    try {
      const text = await readPdfPages(file);
      if (!text.some((page) => page.trim())) {
        setError(
          "이 PDF에서 글자를 찾지 못했어요. 사진을 찍어 만든 스캔 PDF일 수 있어요. 글을 직접 붙여 넣어 주세요.",
        );
        return;
      }
      setFileName(file.name);
      setPages(text);
      setFromPage("1");
      setToPage(String(text.length));
    } catch {
      // 암호가 걸린 파일이나 망가진 파일, 오래된 브라우저(Safari 18.4 미만 등)에서 여기로 온다.
      setError(
        "이 PDF를 읽지 못했어요. 암호가 걸렸거나, 브라우저가 오래되었을 수 있어요. 브라우저를 업데이트하거나 글을 복사해서 붙여 넣어 주세요.",
      );
    } finally {
      setReading(false);
    }
  }

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "문제를 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const nextPack = data as ExamPack;
      setPack(nextPack);
      setRound(nextPack.questions.map((_, index) => index));
      setAnswers({});
      setGraded(false);
      scrollToTop();
    } catch {
      setError("문제를 만들지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setGenerating(false);
    }
  }

  function startRound(indexes: number[]) {
    setRound(indexes);
    setAnswers({});
    setGraded(false);
    scrollToTop();
  }

  function backToInput() {
    setPack(null);
    scrollToTop();
  }

  const answeredCount = round.filter((index) => answers[index] !== undefined).length;
  const wrong = pack
    ? round.filter((index) => answers[index] !== pack.questions[index].answerIndex)
    : [];

  return (
    <main className="flex-1">
      <section className="mx-auto max-w-md px-5 pt-12 pb-20">
        <p className="text-accent text-xs font-semibold tracking-widest">시험 대비 팩</p>

        {!pack ? (
          <>
            <h1 className="mt-3 text-2xl font-bold leading-snug">
              강의자료를 넣으면
              <br />
              요약과 문제를 만들어 드려요
            </h1>
            <p className="mt-3 text-sm text-foreground/70">
              5줄 요약, 어려운 말 풀이, 객관식·OX {QUIZ_SIZE}문제가 나오고 틀린 문제만 다시
              풀 수 있어요.
            </p>

            <form onSubmit={generate} className="mt-8 space-y-6">
              <fieldset>
                <legend className="text-sm font-semibold">자료를 어떻게 넣을까요?</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SOURCE_MODES.map((m) => (
                    <label
                      key={m.id}
                      className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                        mode === m.id
                          ? "border-accent bg-accent-soft text-accent"
                          : "border-foreground/15 text-foreground/70"
                      }`}
                    >
                      <input
                        type="radio"
                        name="mode"
                        value={m.id}
                        checked={mode === m.id}
                        onChange={() => {
                          setMode(m.id);
                          setError(null);
                        }}
                        className="sr-only"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {mode === "pdf" ? (
                <div className="space-y-6">
                  <label className="block text-sm font-semibold">
                    강의자료 PDF
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFile}
                      disabled={reading || generating}
                      className={`${inputClass} file:mr-3 file:rounded-lg file:border-0 file:bg-accent-soft file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-accent`}
                    />
                    <span className="mt-1 block text-xs font-normal text-foreground/50">
                      파일은 이 기기 안에서만 읽어요. 4MB가 넘어도 괜찮아요.
                    </span>
                  </label>

                  {reading && (
                    <p role="status" className="text-sm text-foreground/70">
                      PDF에서 글자를 뽑는 중…
                    </p>
                  )}

                  {fileName && (
                    <div className={cardClass}>
                      <p className="text-sm font-semibold break-words">{fileName}</p>
                      <p className="mt-1 text-xs text-foreground/60">
                        전체 {pages.length}쪽. 공부할 쪽을 골라 주세요.
                      </p>
                      <div className="mt-3 flex items-end gap-3">
                        <label className="block flex-1 text-sm font-semibold">
                          시작 쪽
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={pages.length}
                            value={fromPage}
                            onChange={(e) => setFromPage(e.target.value)}
                            className={inputClass}
                          />
                        </label>
                        <label className="block flex-1 text-sm font-semibold">
                          끝 쪽
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={pages.length}
                            value={toPage}
                            onChange={(e) => setToPage(e.target.value)}
                            className={inputClass}
                          />
                        </label>
                      </div>
                      {!isRangeValid && (
                        <p className="mt-3 text-xs font-semibold text-red-700 dark:text-red-300">
                          1쪽부터 {pages.length}쪽 사이에서, 시작 쪽이 끝 쪽보다 크지 않게
                          골라 주세요.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <label className="block text-sm font-semibold">
                  강의자료 글
                  {/* 길게 붙여 넣은 글이 조용히 잘리지 않도록 maxLength를 두지 않는다. */}
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    rows={8}
                    placeholder="필기나 강의자료의 글을 붙여 넣어 주세요."
                    className={`${inputClass} resize-none`}
                  />
                </label>
              )}

              {(mode === "text" || (fileName && isRangeValid)) && (
                <div>
                  <p
                    className={`text-right text-xs ${
                      isTooLong ? "font-semibold text-red-700 dark:text-red-300" : "text-foreground/50"
                    }`}
                  >
                    {source.length.toLocaleString()} / {MAX_SOURCE_LENGTH.toLocaleString()}자
                  </p>
                  {isTooLong && (
                    <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-300">
                      자료가 너무 길어요.{" "}
                      {mode === "pdf" ? "쪽 범위를 줄여 주세요." : "내용을 나눠서 넣어 주세요."}
                    </p>
                  )}
                  {isTooShort && (mode === "pdf" || source.length > 0) && (
                    <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-300">
                      글자가 너무 적어요. {MIN_SOURCE_LENGTH}자 이상이 되도록{" "}
                      {mode === "pdf" ? "쪽 범위를 넓혀 주세요." : "더 넣어 주세요."}
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {generating ? "만드는 중…" : "요약과 문제 만들기"}
              </button>

              {generating && (
                <div role="status" className={cardClass}>
                  <div className="h-1.5 w-full animate-pulse rounded-full bg-accent" />
                  <p className="mt-3 text-sm font-semibold">
                    자료를 읽고 요약과 문제를 만들고 있어요
                  </p>
                  <p className="mt-1 text-xs text-foreground/60">
                    1분 안에 끝나요. 이 화면을 닫지 말고 기다려 주세요.
                  </p>
                </div>
              )}

              <p className="rounded-2xl bg-accent-soft p-4 text-xs leading-relaxed">
                넣은 자료는 내 공부에만 쓰이고, 우니스 서버에 저장하거나 다른 사람과 공유하지
                않아요. 고른 부분의 글자만 요약과 문제를 만들 때 AI에게 전달돼요. 강의자료의
                저작권은 교수님과 저작권자에게 있으니 다른 곳에 올리거나 나눠 주지 말아 주세요.
              </p>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-3 text-2xl font-bold leading-snug">
              {graded ? "채점 결과예요" : "요약을 읽고 문제를 풀어 보세요"}
            </h1>
            <p className="mt-3 text-xs text-foreground/50">
              AI가 만든 내용이라 틀릴 수 있어요. 헷갈리면 강의자료에서 꼭 확인해 주세요.
            </p>

            {graded && (
              <div className={`mt-6 ${cardClass}`}>
                <p className="text-3xl font-bold">
                  {round.length - wrong.length}
                  <span className="text-lg font-semibold text-foreground/50">
                    {" "}
                    / {round.length}
                  </span>
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  {wrong.length === 0
                    ? "모두 맞혔어요!"
                    : `${wrong.length}문제를 틀렸어요. 아래 해설을 읽고 다시 풀어 보세요.`}
                </p>
                <div className="mt-4 space-y-2">
                  {wrong.length > 0 && (
                    <button
                      type="button"
                      onClick={() => startRound(wrong)}
                      className="w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white"
                    >
                      틀린 문제만 다시 풀기
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => startRound(pack.questions.map((_, index) => index))}
                    className="w-full rounded-xl bg-accent-soft px-5 py-3 text-sm font-semibold text-accent"
                  >
                    처음부터 다시 풀기
                  </button>
                </div>
              </div>
            )}

            {!graded && round.length === pack.questions.length && (
              <div className="mt-6 space-y-3">
                <div className={cardClass}>
                  <h2 className="text-sm font-semibold">5줄 요약</h2>
                  <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                    {pack.summary.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ol>
                </div>

                {pack.terms.length > 0 && (
                  <div className={cardClass}>
                    <h2 className="text-sm font-semibold">어려운 말 풀이</h2>
                    <dl className="mt-3 space-y-3 text-sm">
                      {pack.terms.map((item) => (
                        <div key={item.term}>
                          <dt className="font-semibold break-words">{item.term}</dt>
                          <dd className="mt-0.5 leading-relaxed text-foreground/70">
                            {item.meaning}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            )}

            <h2 className="mt-8 text-sm font-semibold">
              {round.length === pack.questions.length
                ? `문제 ${round.length}개`
                : `틀린 문제 ${round.length}개`}
            </h2>
            <ol className="mt-3 space-y-3">
              {round.map((index, position) => {
                const question = pack.questions[index];
                const picked = answers[index];
                const isCorrect = picked === question.answerIndex;

                return (
                  <li key={index} className={cardClass}>
                    <fieldset disabled={graded}>
                      <legend className="text-sm font-semibold leading-relaxed">
                        <span className="text-accent">
                          {position + 1}. {question.type === "ox" ? "OX" : "객관식"}
                        </span>{" "}
                        {question.question}
                      </legend>
                      <div
                        className={`mt-3 ${
                          question.type === "ox" ? "grid grid-cols-2 gap-2" : "space-y-2"
                        }`}
                      >
                        {question.choices.map((choice, choiceIndex) => {
                          const isPicked = picked === choiceIndex;
                          const isAnswer = question.answerIndex === choiceIndex;
                          let tone = "border-foreground/15";
                          if (graded && isAnswer) {
                            tone = "border-accent bg-accent-soft font-semibold";
                          } else if (graded && isPicked) {
                            tone = "border-red-500/50 bg-red-500/10";
                          } else if (isPicked) {
                            tone = "border-accent bg-accent-soft";
                          }

                          return (
                            <label
                              key={choiceIndex}
                              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${tone} ${
                                graded ? "" : "cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name={`question-${index}`}
                                checked={isPicked}
                                onChange={() =>
                                  setAnswers((prev) => ({ ...prev, [index]: choiceIndex }))
                                }
                                className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                              />
                              <span className="min-w-0 break-words">
                                {choice}
                                {graded && isAnswer && " (정답)"}
                                {graded && isPicked && !isAnswer && " (내 답)"}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>

                    {graded && (
                      <div className="mt-3 border-t border-foreground/10 pt-3">
                        <p
                          className={`text-sm font-semibold ${
                            isCorrect ? "text-accent" : "text-red-700 dark:text-red-300"
                          }`}
                        >
                          {isCorrect ? "맞았어요" : "틀렸어요"}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>

            {!graded && (
              <button
                type="button"
                disabled={answeredCount < round.length}
                onClick={() => {
                  setGraded(true);
                  scrollToTop();
                }}
                className="mt-6 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {answeredCount < round.length
                  ? `${answeredCount} / ${round.length}문제 풀었어요`
                  : "채점하기"}
              </button>
            )}

            <button
              type="button"
              onClick={backToInput}
              className="mt-3 w-full rounded-xl px-5 py-3 text-sm font-semibold text-foreground/60"
            >
              다른 자료 넣기
            </button>
          </>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 rounded-2xl bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300"
          >
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
