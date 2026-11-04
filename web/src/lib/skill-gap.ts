// 역량 공백 지도 계산. 화면 코드 없이 함수만 둔다. AI를 쓰지 않는다.
//
// 확인용 예시 (시안 04, 마케팅 기획)
// 공모전(42시간) 영수증 3장: [시장 분석·기획력] [시장 분석·기획력·협업] [발표·설득]
// 홍보팀(31시간) 영수증 2장: [콘텐츠 제작·커뮤니케이션] [협업·커뮤니케이션]
// 시장 분석 2장 42시간 채움 / 콘텐츠 제작 1장 31시간 보강 필요 / 협업 2장 73시간 채움 / 데이터 분석 0장 비어 있음
// 같은 활동의 영수증이 여러 장이어도 그 활동 시간은 한 번만 더한다.

export type GapStatus = "채움" | "보강 필요" | "비어 있음";
export const FILLED_RECEIPTS = 2;
export const MAX_FIRST_TO_FILL = 4;

export type GapActivity = { id: string; title: string; experience: boolean };
export type GapReceipt = { activityId?: string; competencies: string[] };
export type GapFocusRecord = { minutes: number; activityId?: string };

export type GapCell = { name: string; status: GapStatus; receipts: number; minutes: number };
export type GapFill = { name: string; status: GapStatus; hint: string; activityId?: string };
export type GapLine = { id: string; title: string; minutes: number; receipts: number; competencies: string[] };
export type GapMap = {
  cells: GapCell[];
  counts: Record<GapStatus, number>;
  firstToFill: GapFill[];
  lines: GapLine[];
  // 활동에 연결하지 않은 영수증
  loose: { receipts: number; competencies: string[] };
};

export function statusOf(receipts: number): GapStatus {
  if (receipts >= FILLED_RECEIPTS) return "채움";
  return receipts === 1 ? "보강 필요" : "비어 있음";
}

// 1시간 미만은 분으로, 그 위는 소수 한 자리 시간으로 보여 준다.
export function formatFocusTime(minutes: number) {
  if (minutes <= 0) return "0시간";
  if (minutes < 60) return `${Math.round(minutes)}분`;
  return `${Math.round((minutes / 60) * 10) / 10}시간`;
}

export function buildGapMap(
  required: readonly string[],
  activities: GapActivity[],
  receipts: GapReceipt[],
  records: GapFocusRecord[],
): GapMap {
  const titles = new Map(activities.map((a) => [a.id, a.title]));
  const minutesOf = new Map<string, number>();
  for (const { activityId, minutes } of records) {
    if (activityId && titles.has(activityId)) {
      minutesOf.set(activityId, (minutesOf.get(activityId) ?? 0) + minutes);
    }
  }
  const linkOf = (r: GapReceipt) => (r.activityId && titles.has(r.activityId) ? r.activityId : null);

  const cells = required.map((name): GapCell => {
    const matched = receipts.filter((r) => r.competencies.includes(name));
    const linked = new Set(matched.flatMap((r) => linkOf(r) ?? []));
    const minutes = [...linked].reduce((sum, id) => sum + (minutesOf.get(id) ?? 0), 0);
    return { name, status: statusOf(matched.length), receipts: matched.length, minutes };
  });

  const lines = activities
    .map((a): GapLine => {
      const own = receipts.filter((r) => linkOf(r) === a.id);
      return {
        id: a.id,
        title: a.title,
        minutes: minutesOf.get(a.id) ?? 0,
        receipts: own.length,
        competencies: [...new Set(own.flatMap((r) => r.competencies))],
      };
    })
    // 공고만 넣고 아직 하지 않은 활동은 경험이 아니라서 뺀다. 시간이나 영수증이 있으면 남긴다.
    .filter((line) => activities.find((a) => a.id === line.id)?.experience || line.minutes > 0 || line.receipts > 0)
    .sort((a, b) => b.minutes - a.minutes || b.receipts - a.receipts);

  // 비어 있는 칸에는 기록 없는 시간이 많은 활동부터 하나씩 권한다.
  const unrecorded = lines.filter((line) => line.receipts === 0 && line.minutes > 0);
  const empty = cells.filter((c) => c.status === "비어 있음");
  const weak = cells.filter((c) => c.status === "보강 필요");
  const firstToFill = [...empty, ...weak].slice(0, MAX_FIRST_TO_FILL).map((cell): GapFill => {
    const base = { name: cell.name, status: cell.status };
    if (cell.status === "비어 있음") {
      const line = unrecorded.shift();
      return line
        ? {
            ...base,
            activityId: line.id,
            hint: `아직 기록하지 않은 ${line.title}(${formatFocusTime(line.minutes)})부터 STAR로 적어 보세요. 이 역량을 썼다면 칸이 채워지기 시작해요.`,
          }
        : { ...base, hint: "공모전이나 팀 활동에서 이 역량을 쓴 순간을 영수증 한 장으로 적는 것부터 시작해 보세요." };
    }
    const owner = receipts.find((r) => r.competencies.includes(cell.name) && linkOf(r));
    const activityId = owner ? (linkOf(owner) ?? undefined) : undefined;
    return activityId
      ? { ...base, activityId, hint: `${titles.get(activityId)}에서 이 역량을 쓴 일을 한 장 더 기록하면 채워져요.` }
      : { ...base, hint: "이 역량을 쓴 경험을 한 장 더 기록하면 채워져요." };
  });

  const looseReceipts = receipts.filter((r) => !linkOf(r));
  return {
    cells,
    counts: {
      채움: cells.filter((c) => c.status === "채움").length,
      "보강 필요": weak.length,
      "비어 있음": empty.length,
    },
    firstToFill,
    lines,
    loose: {
      receipts: looseReceipts.length,
      competencies: [...new Set(looseReceipts.flatMap((r) => r.competencies))],
    },
  };
}
