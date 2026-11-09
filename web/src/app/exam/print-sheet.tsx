import type { ExamPack } from "./schema";

const CHOICE_MARKS = ["①", "②", "③", "④"];

const TYPE_LABEL: Record<ExamPack["questions"][number]["type"], string> = {
  multiple: "객관식",
  ox: "OX",
  short: "단답형",
};

function answerText(question: ExamPack["questions"][number]) {
  if (question.type === "short") {
    const [first, ...others] = question.acceptedAnswers;
    return others.length > 0 ? `${first} (인정: ${others.join(", ")})` : first;
  }
  const choice = question.choices[question.answerIndex];
  return question.type === "ox" ? choice : `${CHOICE_MARKS[question.answerIndex]} ${choice}`;
}

// PDF 파일의 재료가 되는 정리본. 화면 밖에 두고, 저장 버튼을 누르면 그림으로 찍어 PDF로 만든다.
// data-pdf-* 표시는 쪽을 나눌 때 쓴다 (lib/save-pdf.ts).
// 정답은 문제를 풀 때 보이지 않게 뒤쪽 새 쪽에 모은다.
export default function PrintSheet({ pack, course, today }: { pack: ExamPack; course: string; today: string }) {
  return (
    <article className="bg-white text-[11pt] leading-relaxed text-ink">
      <header data-pdf-block data-pdf-keep className="border-b-2 border-ink pb-2">
        <p className="text-[9pt] font-semibold">우니스 시험 대비</p>
        <h1 className="text-[18pt] font-bold">{course || "요약 노트와 문제"}</h1>
        <p className="text-[9pt]">
          {today} · 문제 {pack.questions.length}개
        </p>
      </header>

      <section className="mt-4">
        <h2 data-pdf-block data-pdf-keep className="text-[13pt] font-bold">요약 노트</h2>
        <ol className="mt-1.5 list-decimal space-y-1 pl-7">
          {pack.summary.map((line) => (
            <li key={line} data-pdf-block>
              {line}
            </li>
          ))}
        </ol>
      </section>

      {pack.terms.length > 0 && (
        <section className="mt-4">
          <h2 data-pdf-block data-pdf-keep className="text-[13pt] font-bold">어려운 말 풀이</h2>
          <dl className="mt-1.5 space-y-1">
            {pack.terms.map((item) => (
              <div key={item.term} data-pdf-block>
                <dt className="inline font-semibold">{item.term}: </dt>
                <dd className="inline">{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="mt-5">
        <h2 data-pdf-block data-pdf-break data-pdf-keep className="text-[13pt] font-bold">
          시험 대비 문제
        </h2>
        <ol className="mt-2 space-y-3.5">
          {pack.questions.map((question, index) => (
            <li key={index} data-pdf-block>
              <p className="font-semibold">
                {index + 1}. <span className="text-[9pt] font-medium">[{TYPE_LABEL[question.type]}]</span>{" "}
                {question.question}
              </p>
              {question.type === "multiple" && (
                <ul className="mt-1 space-y-0.5 pl-4">
                  {question.choices.map((choice, choiceIndex) => (
                    <li key={choiceIndex}>
                      {CHOICE_MARKS[choiceIndex]} {choice}
                    </li>
                  ))}
                </ul>
              )}
              {question.type === "ox" && <p className="mt-1 pl-4">O &nbsp;&nbsp;&nbsp; X</p>}
              {question.type === "short" && <p className="mt-1 pl-4">답: ______________________________</p>}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-5">
        <h2 data-pdf-block data-pdf-break data-pdf-keep className="text-[13pt] font-bold">
          정답과 해설
        </h2>
        <ol className="mt-2 space-y-2.5">
          {pack.questions.map((question, index) => (
            <li key={index} data-pdf-block>
              <p className="font-semibold">
                {index + 1}. {answerText(question)}
              </p>
              <p className="text-[10pt]">{question.explanation}</p>
            </li>
          ))}
        </ol>
        <p data-pdf-block className="mt-5 border-t border-line pt-2 text-[8.5pt]">
          AI가 만든 내용이라 틀릴 수 있어요. 헷갈리면 강의자료에서 확인해 주세요. 개인 공부용이에요. 강의자료의 저작권은 교수님과 저작권자에게 있으니 다른 곳에 올리거나 나눠 주지 말아 주세요.
        </p>
      </section>
    </article>
  );
}
