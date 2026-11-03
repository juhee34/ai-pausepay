"use client";

import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { aiFetch } from "@/lib/ai-fetch";
import { AI_FEATURES, totalCounts, type AiFeature, type UsageSummary } from "@/lib/ai-usage";

// uid가 바뀌면 부모의 key로 초기화한다. 늦게 도착한 이전 계정 응답은 버린다.
export default function UsageCard({ uid }: { uid: string | null }) {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(uid));
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!uid) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await aiFetch("/api/usage", { signal: controller.signal });
        const result = await response.json();
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setData(null);
          setError(typeof result.error === "string" ? result.error : "사용량을 불러오지 못했어요.");
          return;
        }
        setData(result);
        setError(null);
      } catch {
        if (!controller.signal.aborted) {
          setData(null);
          setError("사용량을 불러오지 못했어요. 인터넷 연결과 로그인을 확인하고 다시 눌러 주세요.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const refresh = () => { if (document.visibilityState === "visible") setRevision((n) => n + 1); };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [uid, revision]);

  return (
    <Block className="mt-2.5">
      <div className="flex items-center gap-2">
        <BarChart3 size={19} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
        <h2 className="text-[15px] font-bold">AI 사용량</h2>
      </div>
      {!uid ? (
        <p className="mt-2 text-sm leading-relaxed text-muted">로그인하면 오늘·이번 주의 기능별 사용량을 확인할 수 있어요. 로그인 전 사용량은 계정 기록에 합치지 않아요.</p>
      ) : (
        <>
          {loading && <p role="status" className="mt-3 text-sm text-muted">사용량 확인 중…</p>}
          {error && <p role="alert" className="mt-3 text-sm leading-relaxed text-review">{error}</p>}
          {data && !error && (
            <>
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-callout bg-canvas p-3 text-center">
                {[["오늘", data.usedToday], ["이번 주", totalCounts(data.weekCounts)], ["오늘 남음", data.remaining]].map(([label, count]) => (
                  <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-mono text-xl font-semibold">{count}<span className="ml-0.5 text-xs font-normal">회</span></dd></div>
                ))}
              </dl>
              <table className="mt-3 w-full text-left text-xs">
                <caption className="sr-only">기능별 오늘과 이번 주 AI 사용 횟수</caption>
                <thead className="text-muted"><tr><th className="py-2 font-medium">기능</th><th className="py-2 text-right font-medium">오늘</th><th className="py-2 text-right font-medium">이번 주</th></tr></thead>
                <tbody>{(Object.keys(AI_FEATURES) as AiFeature[]).map((feature) => (
                  <tr key={feature} className="border-t border-divider"><th scope="row" className="py-2.5 font-medium">{AI_FEATURES[feature]}</th><td className="text-right font-mono">{data.todayCounts[feature]}</td><td className="text-right font-mono">{data.weekCounts[feature]}</td></tr>
                ))}</tbody>
              </table>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">{data.today} · 이번 주 {data.weekStart}부터<br />한국 시간 자정에 하루 {data.dailyLimit}회로 다시 시작해요. 진행 중인 요청은 남은 횟수에서 잠시 빠져요.</p>
            </>
          )}
          <Button variant="secondary" className="mt-3 w-full" disabled={loading} onClick={() => { setLoading(true); setRevision((n) => n + 1); }}>
            <RefreshCw size={16} strokeWidth={1.8} aria-hidden="true" />사용량 새로고침
          </Button>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">성공한 요청을 1회로 세요. 메일은 초안 전송이 시작되면 1회로 세며, 전송 도중 끊겨도 포함돼요. 입력한 글·파일·AI 답변은 사용량에 저장하지 않아요.</p>
        </>
      )}
    </Block>
  );
}
