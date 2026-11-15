import type { Metadata } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import BottomTabBar from "@/components/ui/bottom-tab-bar";

// 글꼴은 docs/DESIGN.md: 애플 기기는 기기 글꼴, 그 밖은 Plex Sans KR (globals.css의 --font-sans)
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "우니스",
  description: "수업 일정과 취업 준비를 한곳에서, 대학생 AI 비서",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${plexSansKr.variable} h-full antialiased`}
    >
      {/* 아래 여백은 떠 있는 탭바가 마지막 내용을 가리지 않게 한다 */}
      <body className="min-h-full flex flex-col pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
        <BottomTabBar />
      </body>
    </html>
  );
}
