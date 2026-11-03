import type { MetadataRoute } from "next";
import { ACCENT } from "./app-mark";

// 홈 화면에 추가했을 때의 앱 정보. 주소창 없이 앱처럼 열린다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "우니스 — 대학생 AI 학업 비서",
    short_name: "우니스",
    description: "강의계획서 한 장으로 한 학기를 챙기는 대학생 AI 학업 비서",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6FB",
    theme_color: ACCENT,
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
