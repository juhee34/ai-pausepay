import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnthropic } from "@/lib/claude";
import {
  DEADLINE_KINDS,
  MAX_UPLOAD_BYTES,
  isAcceptedType,
  type Deadline,
} from "@/lib/syllabus";

// PDF를 읽는 데 시간이 걸릴 수 있어 넉넉히 잡는다.
export const maxDuration = 60;

// 날짜 뽑기는 단순한 작업이라 가장 싼 Haiku를 쓴다.
const SYLLABUS_MODEL = "claude-haiku-5-5";

const SyllabusResultSchema = z.object({
  deadlines: z.array(
    z.object({
      course: z.string().describe("과목명. 자료에 없으면 빈 문자열"),
      title: z.string().describe("일정 이름. 예: 1차 보고서 제출"),
      date: z.string().describe("YYYY-MM-DD 형식의 날짜"),
      kind: z.enum(DEADLINE_KINDS),
    }),
  ),
});

const SYSTEM_PROMPT = `당신은 대학생이 올린 강의계획서나 학사 시스템(KLAS) 화면 캡쳐에서 챙겨야 할 일정을 찾는 도우미입니다.

규칙:
- 과제 마감, 퀴즈, 중간고사, 기말고사, 발표처럼 학생이 챙겨야 할 날짜만 뽑습니다. 매주 수업 주제(진도표)는 뽑지 않습니다.
- 자료에 날짜가 분명히 적힌 항목만 뽑습니다. "3주차"처럼 날짜가 없으면 빼고, 날짜를 지어내지 않습니다.
- 연도가 적혀 있지 않으면 오늘 날짜를 기준으로 이번 학기에 맞는 연도를 붙입니다.
- 기간으로 적혀 있으면 끝나는 날(마감일)을 씁니다.
- 종류는 과제·퀴즈·중간·기말 중 하나, 나머지는 기타입니다.
- 일정이 하나도 없으면 빈 목록을 돌려줍니다.`;

function isValidYmd(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없어요." }, { status: 400 });
  }
  if (!isAcceptedType(file.type)) {
    return NextResponse.json(
      { error: "PDF나 PNG·JPG 이미지만 올릴 수 있어요." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "파일이 4MB보다 커요. 필요한 쪽만 저장해서 올려 주세요." },
      { status: 413 },
    );
  }

  // 파일은 저장하지 않고, 이 요청 안에서만 Claude에게 보낸 뒤 버린다.
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileBlock: Anthropic.ContentBlockParam =
    file.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.type, data } };

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

  try {
    const response = await getAnthropic().messages.parse({
      model: SYLLABUS_MODEL,
      max_tokens: 8000,
      output_config: {
        effort: "low",
        format: zodOutputFormat(SyllabusResultSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            { type: "text", text: `오늘 날짜는 ${today}입니다. 이 자료에서 일정을 찾아 주세요.` },
          ],
        },
      ],
    });

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "일정을 읽지 못했어요. 다른 파일로 다시 해 주세요." },
        { status: 502 },
      );
    }

    const deadlines: Deadline[] = response.parsed_output.deadlines
      .filter((d) => isValidYmd(d.date))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ deadlines });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "지금 요청이 많아요. 잠시 뒤에 다시 해 주세요." },
        { status: 429 },
      );
    }
    if (error instanceof Anthropic.APIError) {
      console.error("syllabus: Claude API error", error.status, error.message);
      return NextResponse.json(
        { error: "AI가 응답하지 않았어요. 잠시 뒤에 다시 해 주세요." },
        { status: 502 },
      );
    }
    throw error;
  }
}
