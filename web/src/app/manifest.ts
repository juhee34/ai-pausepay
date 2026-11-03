import type { MetadataRoute } from "next";
import { ACCENT } from "./app-mark";

// 홈 화면에 추가했을 때의 앱 정보. 주소창 없이 앱처럼 열린다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우니스 — 대학생 AI 비서",
    short_name: "우니스",
    description: "수업 일정과 취업 준비를 한곳에서, 대학생 AI 비서",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F1F4",
    theme_color: ACCENT,
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
