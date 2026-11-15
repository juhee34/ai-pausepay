import type { ComponentProps } from "react";

const VARIANTS = {
  // 주요 버튼: 포인트색. 화면에서 가장 중요한 행동 하나에만
  primary: "bg-brand text-white active:bg-brand-strong",
  // 보조 버튼: 흰 블록과 회색 바탕 양쪽에서 보이는 옅은 회색
  secondary: "bg-fill text-ink active:bg-line",
  // 글자만
  ghost: "text-brand active:bg-brand-soft",
};

export type ButtonVariant = keyof typeof VARIANTS;

export default function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full px-5 text-base font-semibold disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}
