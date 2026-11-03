import { ImageResponse } from "next/og";
import { AppMark } from "./app-mark";

// 브라우저 탭과 안드로이드 홈 화면에 쓰는 아이콘. 그림 파일 없이 코드로 만든다.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<AppMark size={size.width} />, { ...size });
}
