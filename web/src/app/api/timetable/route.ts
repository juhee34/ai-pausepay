import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { completeAiUse, withAiUsage } from "@/lib/ai-route";
import {
  CLAUDE_REQUEST_OPTIONS,
  checkAiLimit,
  claudeErrorResponse,
  readFormFile,
} from "@/lib/ai-route";
import { getAnthropic } from "@/lib/claude";
import { MAX_UPLOAD_BYTES, isAcceptedType } from "@/lib/syllabus";
import {
  MAX_SLOTS,
  MAX_TEXT_LENGTH,
  WEEKDAYS,
  isHm,
  sortSlots,
  type ClassSlot,
} from "@/lib/timetable";

// 캡쳐 한 장이라 강의계획서보다 빠르지만, 같은 여유를 둔다.
export const maxDuration = 60;

// 표를 옮겨 적는 단순한 작업이라 가장 싼 Haiku를 쓴다.
const TIMETABLE_MODEL = "claude-haiku-5-5";

const TimetableResultSchema = z.object({
  slots: z.array(
    z.object({
      course: z.string().describe("과목명만. 괄호 안 강의실·교수님은 빼고"),
      day: z.enum(WEEKDAYS),
      start: z.string().nullable().describe("HH:mm 24시간 형식 시작 시각. 칸에 시간이 없으면 null"),
      end: z.string().nullable().describe("HH:mm 24시간 형식 끝 시각. 칸에 시간이 없으면 null"),
      room: z.string().describe("강의실. 없거나 '미지정'이면 빈 문자열"),
      professor: z.string().describe("교수님 이름. 없으면 빈 문자열"),
    }),
  ),
});

const SYSTEM_PROMPT = `당신은 대학생이 올린 학사 시스템(KLAS) 시간표 화면 캡쳐를 표로 옮겨 적는 도우미입니다.

규칙:
- 시간표 칸 하나가 수업 한 줄입니다. 같은 과목이 여러 요일에 있으면 요일마다 따로 적습니다.
- 칸에 "과목명 (강의실 / 교수님)" 형식으로 적혀 있으면 나눠서 옮깁니다.
- 시각은 칸에 적힌 시간을 그대로 HH:mm(24시간)으로 옮깁니다. 오후 3시는 15:00입니다.
- 시각을 절대 지어내지 않습니다. 교시 번호만 있거나 "undefined"처럼 시간이 없으면 start와 end는 null입니다.
- 시간표가 아닌 화면이면 빈 목록을 돌려줍니다.`;

function clip(text: string) {
  return text.trim().slice(0, MAX_TEXT_LENGTH);
}

export const POST = withAiUsage("timetable", async (request: NextRequest) => {
  const file = await readFormFile(request);
  if (!file) {
    return NextResponse.json({ error: "파일이 없어요." }, { status: 400 });
  }
  if (!isAcceptedType(file.type)) {
    return NextResponse.json(
      { error: "PNG·JPG 캡쳐나 PDF만 올릴 수 있어요." },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "파일이 4MB보다 커요. 시간표 부분만 다시 캡쳐해 주세요." },
      { status: 413 },
    );
  }

  // 다른 AI 기능과 하루 사용 횟수를 함께 쓴다.
  const limit = await checkAiLimit(request);
  if (limit instanceof NextResponse) return limit;

  // 파일은 저장하지 않고, 이 요청 안에서만 Claude에게 보낸 뒤 버린다.
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const fileBlock: Anthropic.ContentBlockParam =
    file.type === "application/pdf"
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
      : { type: "image", source: { type: "base64", media_type: file.type, data } };

  try {
    const response = await getAnthropic().messages.parse({
      model: TIMETABLE_MODEL,
      max_tokens: 4000,
      output_config: {
        effort: "low",
        format: zodOutputFormat(TimetableResultSchema),
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: "이 시간표를 옮겨 적어 주세요." }],
        },
      ],
    }, CLAUDE_REQUEST_OPTIONS);

    if (!response.parsed_output) {
      return NextResponse.json(
        { error: "시간표를 읽지 못했어요. 시간표 부분만 다시 캡쳐해 주세요." },
        { status: 502 },
      );
    }

    // 형식이 틀린 시각은 버리지 않고 비워서 사용자가 넣게 한다.
    const slots: ClassSlot[] = sortSlots(
      response.parsed_output.slots.slice(0, MAX_SLOTS).map((s) => ({
        course: clip(s.course),
        day: s.day,
        start: isHm(s.start) ? s.start : null,
        end: isHm(s.end) ? s.end : null,
        room: clip(s.room),
        professor: clip(s.professor),
      })),
    );

    // 성공했을 때만 1회로 센다.
    const result = NextResponse.json({ slots });
    return await completeAiUse(result, request);
  } catch (error) {
    return claudeErrorResponse(error, "timetable");
  }
});
