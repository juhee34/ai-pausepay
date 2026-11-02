import { z } from "zod";

// 자료 길이. 길면 잘라 쓰지 않고 쪽 범위를 줄이라고 안내한다.
export const MIN_SOURCE_LENGTH = 100;
export const MAX_SOURCE_LENGTH = 30000;

export const SUMMARY_LINES = 5;
export const QUIZ_SIZE = 10;
export const MAX_TERMS = 8;

const MAX_SUMMARY_LINE_LENGTH = 200;
const MAX_TERM_LENGTH = 60;
const MAX_MEANING_LENGTH = 200;
const MAX_QUESTION_LENGTH = 400;
const MAX_CHOICE_LENGTH = 200;
const MAX_EXPLANATION_LENGTH = 600;

// AI에게 요청하는 답의 형식. 개수와 글자 수는 아래 normalizeExamPack에서 검사한다.
export const ExamPackSchema = z.object({
  summary: z.array(z.string()).describe("자료를 요약한 문장 5개"),
  terms: z
    .array(
      z.object({
        term: z.string().describe("자료에 나온 어려운 말"),
        meaning: z.string().describe("쉬운 말로 푼 뜻"),
      }),
    )
    .describe("어려운 말 풀이"),
  questions: z
    .array(
      z.object({
        number: z.number().int().describe("문제 번호. 1부터 10까지 차례로"),
        type: z.enum(["multiple", "ox"]).describe("multiple은 객관식, ox는 OX 문제"),
        question: z.string(),
        choices: z.array(z.string()).describe('객관식은 보기 4개, OX는 ["O", "X"]'),
        answerIndex: z.number().int().describe("choices에서 정답의 위치. 0부터 센다"),
        explanation: z.string().describe("정답인 이유"),
      }),
    )
    .describe("문제 10개"),
});

export type ExamPack = z.infer<typeof ExamPackSchema>;
export type ExamQuestion = ExamPack["questions"][number];

function isValidText(text: string, maxLength: number) {
  return text.length > 0 && text.length <= maxLength;
}

// AI는 정답을 같은 위치에 몰아 두는 버릇이 있어서, 보기를 직접 섞고 정답 위치를 다시 잡는다.
function shuffleChoices(choices: string[], answerIndex: number) {
  const shuffled = [...choices];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return { choices: shuffled, answerIndex: shuffled.indexOf(choices[answerIndex]) };
}

function normalizeQuestion(raw: ExamQuestion): ExamQuestion | null {
  const question = raw.question.trim();
  const explanation = raw.explanation.trim();
  const choices = raw.choices.map((choice) => choice.trim());

  if (!isValidText(question, MAX_QUESTION_LENGTH)) return null;
  if (!isValidText(explanation, MAX_EXPLANATION_LENGTH)) return null;

  if (raw.type === "ox") {
    if (choices.length !== 2 || choices[0] !== "O" || choices[1] !== "X") return null;
  } else {
    if (choices.length !== 4 || new Set(choices).size !== 4) return null;
    if (!choices.every((choice) => isValidText(choice, MAX_CHOICE_LENGTH))) return null;
  }

  if (
    !Number.isInteger(raw.answerIndex) ||
    raw.answerIndex < 0 ||
    raw.answerIndex >= choices.length
  ) {
    return null;
  }

  if (raw.type === "ox") {
    return { ...raw, question, explanation, choices };
  }
  return { ...raw, question, explanation, ...shuffleChoices(choices, raw.answerIndex) };
}

// AI의 답이 약속한 형식을 지켰는지 서버에서 직접 확인한다. 어긋나면 null.
export function normalizeExamPack(raw: ExamPack): ExamPack | null {
  const summary = raw.summary.map((line) => line.trim());
  if (
    summary.length !== SUMMARY_LINES ||
    !summary.every((line) => isValidText(line, MAX_SUMMARY_LINE_LENGTH))
  ) {
    return null;
  }

  const questions = raw.questions.map(normalizeQuestion);
  if (
    questions.length !== QUIZ_SIZE ||
    !questions.every((question) => question !== null)
  ) {
    return null;
  }
  if (
    !questions.some((question) => question.type === "multiple") ||
    !questions.some((question) => question.type === "ox")
  ) {
    return null;
  }

  // 풀이는 문제만큼 중요하지 않아서, 어긋난 항목만 빼고 쓴다.
  const terms = raw.terms
    .map(({ term, meaning }) => ({ term: term.trim(), meaning: meaning.trim() }))
    .filter(
      ({ term, meaning }) =>
        isValidText(term, MAX_TERM_LENGTH) && isValidText(meaning, MAX_MEANING_LENGTH),
    )
    .slice(0, MAX_TERMS);

  return { summary, terms, questions };
}
