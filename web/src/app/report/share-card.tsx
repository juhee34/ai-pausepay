import type { SemesterFlow } from "@/lib/semester-flow";
import { leadLabel } from "@/lib/semester-flow";
import { SEMESTER_LABEL, formatHours, type SemesterReport } from "@/lib/semester-report";

// 이미지로 공유할 결산 카드. 화면 밖에 그려 두고, 공유 버튼을 누르면 그림으로 찍는다.
export default function ShareCard({
  report,
  flow,
  over,
  isExample,
}: {
  report: SemesterReport;
  flow: SemesterFlow;
  over: boolean;
  isExample: boolean;
}) {
  const best = report.courses[0]?.value !== null ? report.courses[0] : undefined;
  const max = Math.max(...flow.weekly, 0);
  const exam = new Set(flow.examWeeks);

  return (
    <div className="w-[360px] bg-brand px-6 pb-5 pt-6 text-white">
      <div className="flex items-center justify-between">
        <p className="flex items-baseline gap-2">
          <span className="text-xl font-bold">우니스</span>
          <span className="font-mono text-sm text-white/85">{SEMESTER_LABEL}</span>
        </p>
        {isExample && (
          <span className="rounded-full border border-white/60 px-2.5 py-0.5 text-xs font-semibold">예시 데이터</span>
        )}
      </div>

      <p className="mt-6 text-sm font-semibold text-white/80">{over ? "내 한 학기 결산" : "이번 학기 지금까지"}</p>
      <p className="mt-1 flex items-end gap-2">
        <span className="font-mono text-[64px] font-bold leading-none">
          {report.hoursPerCredit === null ? "-" : formatHours(report.hoursPerCredit)}
        </span>
        <span className="pb-1.5 text-xl font-bold">시간</span>
      </p>
      <p className="mt-2 text-[13px] text-white/85">
        {over ? "학점 1개를 얻는 데 든 시간" : "학점 1개에 쓴 시간"} · {formatHours(report.totalHours)}시간으로{" "}
        {report.earnedCredits}학점
      </p>

      <div className="mt-5 border-t border-white/25 pt-4">
        <p className="text-xs font-semibold text-white/80">가장 가성비 좋았던 과목</p>
        {best ? (
          <>
            <p className="mt-1 break-words text-2xl font-bold">{best.course}</p>
            <p className="mt-0.5 font-mono text-[13px] text-white/85">
              가성비 {best.value} · {best.grade} · {formatHours(best.hours)}시간
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-white/85">과목에 예상 성적을 넣으면 나와요</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-semibold text-white/80">가장 몰린 주</p>
          <p className="mt-1 text-[15px] font-bold">
            {flow.busiest ? `${flow.busiest.week}주차 · ${formatHours(flow.busiest.hours)}시간` : "기록 없음"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold text-white/80">가장 많이 미룬 과제</p>
          <p className="mt-1 text-[15px] font-bold">
            {flow.procrastination ? `${leadLabel(flow.procrastination.leadDays)} 착수` : "기록 없음"}
          </p>
        </div>
      </div>

      <div className="mt-5 flex h-14 items-end gap-[3px]">
        {flow.weekly.map((hours, index) => (
          <span
            key={index}
            className={`flex-1 rounded-t-[3px] ${exam.has(index + 1) ? "bg-white" : "bg-white/55"}`}
            style={{ height: max > 0 && hours > 0 ? `${Math.max(6, (hours / max) * 100)}%` : "2px" }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-white/25 pt-2.5 text-[11px] text-white/80">
        <span>주차별 집중 시간</span>
        <span>UNIS · 광운대생을 위한 AI 비서</span>
      </div>
    </div>
  );
}
