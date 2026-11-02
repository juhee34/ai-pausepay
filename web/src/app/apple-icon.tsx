import { ImageResponse } from "next/og";
import { AppMark } from "./app-mark";

// 아이폰 '홈 화면에 추가' 아이콘. 없으면 화면 캡처가 작게 들어간다.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(<AppMark size={size.width} />, { ...size });
}
