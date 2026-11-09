"use client";

import { aiFetch } from "@/lib/ai-fetch";

import { useRef, useState } from "react";
import AppShell from "@/components/ui/app-shell";
import BrandLabel from "@/components/ui/brand-label";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import CookieNote from "@/components/ui/cookie-note";
import SegmentedTabs from "@/components/ui/segmented-tabs";
import { useSavedDeadlines } from "@/lib/deadline-store";
import { saveExamResult, updateExamResultCorrect } from "@/lib/exam-results";
import { useTimetable } from "@/lib/timetable-store";
import { useToday } from "@/lib/briefing";
import { pdfFileName, saveElementAsPdf } from "@/lib/save-pdf";
import PrintSheet from "./print-sheet";
import { isShortAnswerCorrect } from "./grading";
import {
  MAX_SHORT_INPUT_LENGTH,
  MAX_SOURCE_LENGTH,
  MIN_SOURCE_LENGTH,
  QUESTION_COUNTS,
  QUIZ_SIZE,
  type QuestionCount,
  type ExamPack,
} from "./schema";

type SourceMode = "pdf" | "text";

const SOURCE_MODES: { value: SourceMode; label: string }[] = [
  { value: "pdf", label: "PDF 올리기" },
  { value: "text", label: "글 붙여 넣기" },
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

// 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다.
const inputShape =
  "mt-1.5 block min-h-11 w-full rounded-button border px-3.5 py-2.5 text-base font-normal outline-none placeholder:text-muted";
const inputTone = "border-line bg-surface text-ink focus:border-brand";
const inputClass = `${inputShape} ${inputTone}`;

const warningClass = "text-xs font-semibold text-review";

const MAX_COURSE_LENGTH = 50;

function scrollToTop() {
  requestAnimationFrame(() => window.scrollTo({ top: 0 }));
}

export default function ExamPage() {
  const [mode, setMode] = useState<SourceMode>("pdf");
  const [pastedText, setPastedText] = useState("");
  const [course, setCourse] = useState("");
  const [questionCount, setQuestionCount] = useState<QuestionCount>(QUIZ_SIZE);
  const today = useToday();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [savingPdf, setSavingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const deadlines = useSavedDeadlines();
  const timetable = useTimetable();
  const courseOptions = [
    ...new Set([...timetable, ...deadlines.filter((d) => !d.source)].map((item) => item.course.trim())),
  ].filter(Boolean);

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
  // 단답형에 적은 답. 저장하지 않는다.
  const [texts, setTexts] = useState<Record<number, string>>({});
  // 코드가 틀렸다고 했지만 사용자가 맞다고 고친 단답형 문제.
  const [accepted, setAccepted] = useState<number[]>([]);
  // 방금 저장한 채점 결과. 고치면 저장한 점수도 함께 고친다.
  const [savedAt, setSavedAt] = useState<number | null>(null);
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
      const res = await aiFetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, count: questionCount }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error ?? "문제를 만들지 못했어요. 잠시 뒤에 다시 해 주세요.");
        return;
      }
      const nextPack = data as ExamPack;
      setPack(nextPack);
      setRound(nextPack.questions.map((_, index) => index));
      resetRound();
      scrollToTop();
    } catch {
      setError("문제를 만들지 못했어요. 인터넷 연결을 확인하고 다시 해 주세요.");
    } finally {
      setGenerating(false);
    }
  }

  function resetRound() {
    setAnswers({});
    setTexts({});
    setAccepted([]);
    setSavedAt(null);
    setGraded(false);
  }

  function startRound(indexes: number[]) {
    setRound(indexes);
    resetRound();
    scrollToTop();
  }

  function isAnswered(index: number) {
    if (pack?.questions[index].type === "short") return (texts[index] ?? "").trim() !== "";
    return answers[index] !== undefined;
  }

  // 사용자가 맞다고 고친 문제는 코드 비교와 상관없이 맞은 것으로 센다.
  function isRight(index: number, acceptedList = accepted) {
    if (!pack) return false;
    const question = pack.questions[index];
    if (question.type !== "short") return answers[index] === question.answerIndex;
    return acceptedList.includes(index) || isShortAnswerCorrect(texts[index] ?? "", question.acceptedAnswers);
  }

  function toggleAccepted(index: number) {
    const next = accepted.includes(index) ? accepted.filter((i) => i !== index) : [...accepted, index];
    setAccepted(next);
    if (savedAt !== null) {
      updateExamResultCorrect(savedAt, round.filter((i) => isRight(i, next)).length);
    }
  }

  // 정리본을 PDF 파일로 만들어 바로 내려받는다.
  async function savePdf() {
    if (!sheetRef.current || savingPdf) return;
    setPdfError(null);
    setSavingPdf(true);
    try {
      await saveElementAsPdf(sheetRef.current, pdfFileName(`우니스 시험 대비 ${course}`));
    } catch {
      setPdfError("PDF를 만들지 못했어요. 사파리나 크롬으로 열어 다시 해 주세요.");
    } finally {
      setSavingPdf(false);
    }
  }

  function backToInput() {
    setPack(null);
    scrollToTop();
  }

  const answeredCount = round.filter(isAnswered).length;
  const wrong = pack ? round.filter((index) => !isRight(index)) : [];

  return (
    <AppShell>
      {!pack ? (
        <>
          <BrandLabel />
          <header className="mb-4 px-1">
            <h1 className="text-[22px] font-bold">강의자료로 요약과 문제 만들기</h1>
            <p className="mt-1 text-sm text-muted">
              5줄 요약, 어려운 말 풀이, 객관식·OX·단답형 문제가 나오고 틀린 문제만 다시 풀 수
              있어요.
            </p>
          </header>

          <form onSubmit={generate} className="space-y-2.5">
            <Block>
              <h2 className="text-[15px] font-bold">자료를 어떻게 넣을까요?</h2>
              <div className="mt-2.5">
                <SegmentedTabs
                  label="자료 넣는 방법"
                  options={SOURCE_MODES}
                  value={mode}
                  onChange={(next) => {
                    setMode(next);
                    setError(null);
                  }}
                />
              </div>

              {mode === "pdf" ? (
                <div className="mt-3.5">
                  {/* 진짜 파일 입력칸은 숨기고 버튼 모양의 label을 누르게 한다. */}
                  <label
                    className={`flex min-h-11 items-center justify-center rounded-button bg-canvas px-4 text-[15px] font-semibold text-ink active:bg-divider has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${
                      reading || generating ? "opacity-40" : "cursor-pointer"
                    }`}
                  >
                    {fileName ? "다른 PDF 고르기" : "강의자료 PDF 고르기"}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={handleFile}
                      disabled={reading || generating}
                      className="sr-only"
                    />
                  </label>
                  <p className="mt-1.5 text-xs text-muted">
                    파일은 이 기기 안에서만 읽어요. 4MB가 넘어도 괜찮아요.
                  </p>
                  {reading && (
                    <p role="status" className="mt-2 text-sm text-muted">
                      PDF에서 글자를 뽑는 중…
                    </p>
                  )}
                </div>
              ) : (
                <label className="mt-3.5 block text-sm font-semibold">
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
            </Block>

            {mode === "pdf" && fileName && (
              <Block>
                <p className="text-[15px] font-semibold break-words">{fileName}</p>
                <p className="mt-0.5 text-xs text-muted">
                  전체 <span className="font-mono font-medium">{pages.length}</span>쪽. 공부할 쪽을
                  골라 주세요.
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <label className="block min-w-0 flex-1 text-sm font-semibold">
                    시작 쪽
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={pages.length}
                      value={fromPage}
                      onChange={(e) => setFromPage(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </label>
                  <label className="block min-w-0 flex-1 text-sm font-semibold">
                    끝 쪽
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={pages.length}
                      value={toPage}
                      onChange={(e) => setToPage(e.target.value)}
                      className={`${inputClass} font-mono`}
                    />
                  </label>
                </div>
                {!isRangeValid && (
                  <p className={`mt-2.5 ${warningClass}`}>
                    1쪽부터 {pages.length}쪽 사이에서, 시작 쪽이 끝 쪽보다 크지 않게 골라 주세요.
                  </p>
                )}
              </Block>
            )}

            <Block>
              <label className="block text-[15px] font-bold" htmlFor="exam-course">
                어떤 과목인가요? <span className="text-xs font-medium text-muted">(선택)</span>
              </label>
              {courseOptions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {courseOptions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={course.trim() === name}
                      onClick={() => setCourse(course.trim() === name ? "" : name)}
                      className={`min-h-11 max-w-full break-words rounded-button px-3.5 text-sm font-semibold ${
                        course.trim() === name ? "bg-brand-soft text-brand" : "bg-canvas text-muted"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
              <input
                id="exam-course"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                maxLength={MAX_COURSE_LENGTH}
                placeholder="예: 재무관리"
                className={`${inputClass} ${courseOptions.length > 0 ? "mt-2.5" : ""}`}
              />
              <p className="mt-1.5 text-xs text-muted">
                고르면 채점 결과를 이 기기에 저장해서 공부 순서를 정할 때 참고해요. AI에게는 보내지
                않아요.
              </p>
            </Block>

            <Block>
              <h2 className="text-[15px] font-bold">문제를 몇 개 만들까요?</h2>
              <div role="group" aria-label="문제 수" className="mt-2.5 flex gap-2">
                {QUESTION_COUNTS.map((count) => (
                  <button
                    key={count}
                    type="button"
                    aria-pressed={questionCount === count}
                    onClick={() => setQuestionCount(count)}
                    className={`min-h-11 flex-1 rounded-full font-mono text-sm font-semibold ${
                      questionCount === count ? "bg-brand text-white" : "border border-line bg-surface text-ink"
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                많을수록 오래 걸려요. 자료가 짧으면 적게 골라 주세요. 몇 개를 골라도 AI 1회로 세요.
              </p>
            </Block>

            {(mode === "text" || (fileName && isRangeValid)) && (
              <div className="px-1">
                <p
                  className={`text-right font-mono text-xs font-medium ${
                    isTooLong ? "text-review" : "text-muted"
                  }`}
                >
                  {source.length.toLocaleString()} / {MAX_SOURCE_LENGTH.toLocaleString()}자
                </p>
                {isTooLong && (
                  <p className={`mt-1 ${warningClass}`}>
                    자료가 너무 길어요.{" "}
                    {mode === "pdf" ? "쪽 범위를 줄여 주세요." : "내용을 나눠서 넣어 주세요."}
                  </p>
                )}
                {isTooShort && (mode === "pdf" || source.length > 0) && (
                  <p className={`mt-1 ${warningClass}`}>
                    글자가 너무 적어요. {MIN_SOURCE_LENGTH}자 이상이 되도록{" "}
                    {mode === "pdf" ? "쪽 범위를 넓혀 주세요." : "더 넣어 주세요."}
                  </p>
                )}
              </div>
            )}

            <Button type="submit" disabled={!canSubmit} className="w-full">
              {generating ? "만드는 중…" : "요약과 문제 만들기"}
            </Button>
            <CookieNote />

            {generating && (
              <Block role="status">
                <div className="h-1.5 w-full animate-pulse rounded-full bg-brand" />
                <p className="mt-3 text-[15px] font-semibold">
                  자료를 읽고 요약과 문제를 만들고 있어요
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  1분 안에 끝나요. 이 화면을 닫지 말고 기다려 주세요.
                </p>
              </Block>
            )}

            <p className="px-1 text-xs leading-relaxed text-muted">
              넣은 자료는 내 공부에만 쓰이고, 우니스 서버에 저장하거나 다른 사람과 공유하지 않아요.
              고른 부분의 글자만 요약과 문제를 만들 때 AI에게 전달돼요. 강의자료의 저작권은 교수님과
              저작권자에게 있으니 다른 곳에 올리거나 나눠 주지 말아 주세요.
            </p>
          </form>
        </>
      ) : (
        <>
          <div>
          <BrandLabel />
          <header className="mb-4 px-1">
            <h1 className="text-[22px] font-bold">
              {graded ? "채점 결과예요" : "요약을 읽고 문제를 풀어 보세요"}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              AI가 만든 내용이라 틀릴 수 있어요. 헷갈리면 강의자료에서 꼭 확인해 주세요.
            </p>
          </header>

          <div className="space-y-2.5">
            {graded && (
              <Block>
                <p className="font-mono text-[40px] font-semibold leading-tight">
                  {round.length - wrong.length}
                  <span className="text-xl font-medium text-muted"> / {round.length}</span>
                </p>
                <p className="mt-1 text-sm text-muted">
                  {wrong.length === 0
                    ? "모두 맞혔어요!"
                    : `${wrong.length}문제를 틀렸어요. 아래 해설을 읽고 다시 풀어 보세요.`}
                </p>
                <div className="mt-3.5 space-y-2">
                  {wrong.length > 0 && (
                    <Button onClick={() => startRound(wrong)} className="w-full">
                      틀린 문제만 다시 풀기
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => startRound(pack.questions.map((_, index) => index))}
                    className="w-full"
                  >
                    처음부터 다시 풀기
                  </Button>
                </div>
              </Block>
            )}

            {!graded && round.length === pack.questions.length && (
              <>
                <Block>
                  <h2 className="text-[15px] font-bold">5줄 요약</h2>
                  <ol className="mt-1 divide-y divide-divider">
                    {pack.summary.map((line, index) => (
                      <li key={line} className="flex gap-2.5 py-2.5 text-sm leading-relaxed last:pb-0">
                        <span className="shrink-0 font-mono font-medium text-muted">{index + 1}</span>
                        <span className="min-w-0">{line}</span>
                      </li>
                    ))}
                  </ol>
                </Block>

                {pack.terms.length > 0 && (
                  <Block>
                    <h2 className="text-[15px] font-bold">어려운 말 풀이</h2>
                    <dl className="mt-1 divide-y divide-divider text-sm">
                      {pack.terms.map((item) => (
                        <div key={item.term} className="py-2.5 last:pb-0">
                          <dt className="font-semibold break-words">{item.term}</dt>
                          <dd className="mt-0.5 leading-relaxed text-muted">{item.meaning}</dd>
                        </div>
                      ))}
                    </dl>
                  </Block>
                )}
              </>
            )}
          </div>

          <h2 className="mt-5 mb-2 px-1 text-[15px] font-bold">
            {round.length === pack.questions.length
              ? `문제 ${round.length}개`
              : `틀린 문제 ${round.length}개`}
          </h2>
          <Block padded={false}>
            <ol className="divide-y divide-divider">
              {round.map((index, position) => {
                const question = pack.questions[index];
                const picked = answers[index];
                const isCorrect = isRight(index);
                const wasAccepted = accepted.includes(index);

                return (
                  <li key={index} className="p-3.5">
                    <fieldset disabled={graded}>
                      <legend className="text-[15px] font-semibold leading-relaxed">
                        <span className="font-mono text-muted">{position + 1}</span>{" "}
                        <span className="text-xs font-medium text-muted">
                          {question.type === "ox" ? "OX" : question.type === "short" ? "단답형" : "객관식"}
                        </span>{" "}
                        {question.question}
                      </legend>
                      {question.type === "short" ? (
                        <input
                          aria-label={`${position + 1}번 답`}
                          value={texts[index] ?? ""}
                          onChange={(e) => setTexts((prev) => ({ ...prev, [index]: e.target.value }))}
                          maxLength={MAX_SHORT_INPUT_LENGTH}
                          autoComplete="off"
                          placeholder="답을 짧게 적어 주세요"
                          className={`${inputShape} ${
                            !graded
                              ? inputTone
                              : isCorrect
                                ? "border-quiz bg-quiz-soft text-quiz"
                                : "border-brand bg-brand-soft text-brand"
                          }`}
                        />
                      ) : (
                      <div
                        className={`mt-2.5 ${
                          question.type === "ox" ? "grid grid-cols-2 gap-2" : "space-y-2"
                        }`}
                      >
                        {question.choices.map((choice, choiceIndex) => {
                          const isPicked = picked === choiceIndex;
                          const isAnswer = question.answerIndex === choiceIndex;
                          let tone = "border-line";
                          if (graded && isAnswer) {
                            tone = "border-quiz bg-quiz-soft font-semibold text-quiz";
                          } else if (graded && isPicked) {
                            tone = "border-brand bg-brand-soft text-brand";
                          } else if (isPicked) {
                            tone = "border-brand bg-brand-soft";
                          }

                          return (
                            <label
                              key={choiceIndex}
                              className={`flex min-h-11 items-start gap-2.5 rounded-button border px-3.5 py-2.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand ${tone} ${
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
                                className="mt-0.5 size-4 shrink-0 accent-brand"
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
                      )}
                    </fieldset>

                    {graded && (
                      <div className="mt-2.5">
                        <p
                          className={`text-sm font-semibold ${
                            isCorrect ? "text-quiz" : "text-brand"
                          }`}
                        >
                          {wasAccepted ? "맞은 걸로 쳤어요" : isCorrect ? "맞았어요" : "틀렸어요"}
                        </p>
                        {question.type === "short" && (
                          <>
                            <p className="mt-0.5 text-sm font-semibold break-words">
                              정답: {question.acceptedAnswers[0]}
                              {question.acceptedAnswers.length > 1 && (
                                <span className="font-normal text-muted">
                                  {" "}
                                  (인정: {question.acceptedAnswers.slice(1).join(", ")})
                                </span>
                              )}
                            </p>
                            {(!isCorrect || wasAccepted) && (
                              <button
                                type="button"
                                onClick={() => toggleAccepted(index)}
                                className="-ml-1 min-h-11 px-1 text-[13px] font-semibold text-brand"
                              >
                                {wasAccepted ? "되돌리기" : "내 답도 맞아요. 맞은 걸로 치기"}
                              </button>
                            )}
                          </>
                        )}
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">
                          {question.explanation}
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </Block>

          {!graded && (
            <Button
              disabled={answeredCount < round.length}
              onClick={() => {
                // 틀린 문제만 다시 푼 결과는 정답률을 왜곡하므로 전체를 풀었을 때만 저장한다.
                const name = course.trim();
                if (name && round.length === pack.questions.length) {
                  const finishedAt = Date.now();
                  saveExamResult({
                    course: name,
                    correct: round.length - wrong.length,
                    total: round.length,
                    finishedAt,
                  });
                  setSavedAt(finishedAt);
                }
                setGraded(true);
                scrollToTop();
              }}
              className="mt-2.5 w-full"
            >
              {answeredCount < round.length ? (
                <>
                  <span className="font-mono">
                    {answeredCount} / {round.length}
                  </span>
                  문제 풀었어요
                </>
              ) : (
                "채점하기"
              )}
            </Button>
          )}

          <Button variant="secondary" onClick={savePdf} disabled={savingPdf} className="mt-2.5 w-full !bg-surface">
            {savingPdf ? "PDF 만드는 중…" : "요약 노트와 문제 PDF로 저장"}
          </Button>
          <p className="mt-1.5 px-1 text-xs leading-relaxed text-muted">
            누르면 PDF 파일을 내려받아요. 정답과 해설은 뒤쪽에 따로 들어가요. 카카오톡 같은 앱 안에서는 저장이 막힐 수 있으니, 받아지지 않으면 사파리나 크롬으로 열어 주세요. 개인 공부용으로만 써 주세요.
          </p>
          {pdfError && (
            <p role="alert" className="mt-1.5 px-1 text-xs font-semibold text-review">
              {pdfError}
            </p>
          )}

          <Button variant="ghost" onClick={backToInput} className="mt-1 w-full">
            다른 자료 넣기
          </Button>
          </div>
          {/* 화면 밖에 두는 PDF 재료. 종이 너비(A4에서 좌우 여백을 뺀 180mm)로 그린다. */}
          <div aria-hidden="true" className="pointer-events-none fixed top-0 left-[-10000px] w-[180mm]">
            <div ref={sheetRef}>
              <PrintSheet pack={pack} course={course.trim()} today={today ?? ""} />
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          role="alert"
          className="mt-2.5 rounded-callout border border-review-line bg-review-soft p-3.5 text-sm text-review"
        >
          {error}
        </div>
      )}
    </AppShell>
  );
}
