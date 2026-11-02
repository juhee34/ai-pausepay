// 우니스 아이콘 그림: 포인트 색 배경에 흰 "U" (UNIfied Student).
// 모서리는 폰이 알아서 둥글게 깎으므로 꽉 찬 네모로 그린다.
// 한글 글자를 쓰려면 글꼴 파일을 따로 넣어야 해서 기본 글꼴로 그릴 수 있는 "U"를 쓴다.
export const ACCENT = "#C6660A";

export function AppMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ACCENT,
        color: "white",
        fontSize: size * 0.62,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      U
    </div>
  );
}
