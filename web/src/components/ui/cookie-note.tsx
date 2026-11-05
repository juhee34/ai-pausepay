import { Cookie } from "lucide-react";
import { DAILY_AI_LIMIT } from "@/lib/ai-usage";
import { COOKIES_PER_AI_USE } from "@/lib/cookies";

// 쿠키가 필요할 수 있는 AI 기능의 버튼 아래에 두는 한 줄 안내.
export default function CookieNote() {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
      <Cookie size={14} strokeWidth={1.8} aria-hidden="true" className="mt-0.5 shrink-0 text-brand" />
      <span>
        한 번에 쿠키 {COOKIES_PER_AI_USE}개를 써요. 매일 무료 쿠키 {DAILY_AI_LIMIT}개를 먼저 쓰고, 충전은 마이페이지에서 해요.
      </span>
    </p>
  );
}
