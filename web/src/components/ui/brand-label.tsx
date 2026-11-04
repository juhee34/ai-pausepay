// 화면 맨 위의 작은 '우니스'. 위에 뒤로 가기나 다른 작은 글이 없는 화면에 넣는다 (docs/DESIGN.md '화면 틀').
export default function BrandLabel() {
  return <p className="flex min-h-7 items-center px-1 text-xs font-semibold text-brand">우니스</p>;
}
