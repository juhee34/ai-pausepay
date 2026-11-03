import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import TabBar from "./tab-bar";

// 글꼴은 docs/DESIGN.md: 본문은 Plex Sans KR, 숫자·시간·날짜는 Plex Mono
const plexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-plex-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["500", "600"],
});

export const metadata: Metadata = {
  title: "우니스",
  description: "강의계획서 한 장으로 한 학기를 챙기는 대학생 AI 학업 비서",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${plexSansKr.variable} ${plexMono.variable} h-full antialiased`}
    >
      {/* 아래 여백은 고정된 탭바가 마지막 내용을 가리지 않게 한다 */}
      <body className="min-h-full flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
        <TabBar />
      </body>
    </html>
  );
}
