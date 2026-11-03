import type { ComponentProps } from "react";

// 회색 바탕 위의 흰 블록. 테두리·그림자 없이 모서리만 둥글다.
// 안쪽을 구분선으로 나누는 목록은 padded={false}로 두고 줄마다 여백을 준다.
export default function Block({
  className = "",
  padded = true,
  ...props
}: ComponentProps<"div"> & { padded?: boolean }) {
  return (
    <div
      className={`rounded-block bg-surface ${padded ? "p-3.5" : ""} ${className}`}
      {...props}
    />
  );
}
