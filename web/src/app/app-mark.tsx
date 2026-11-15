// 우니스 아이콘 그림: 포인트 색(위는 밝게, 아래는 깊게) 배경에 흰 "U"와 점 (UNIfied Student, 로고의 'UNIS.').
// 모서리는 폰이 알아서 둥글게 깎으므로 꽉 찬 네모로 그린다.
// 한글 글자를 쓰려면 글꼴 파일을 따로 넣어야 해서 기본 글꼴로 그릴 수 있는 "U"를 쓴다.
export const ACCENT = "#8C1D40";

export function AppMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "linear-gradient(160deg, #A3264D 0%, #5E1029 100%)",
        color: "white",
        paddingBottom: size * 0.2,
      }}
    >
      <div style={{ display: "flex", fontSize: size * 0.6, fontWeight: 700, lineHeight: 1 }}>U</div>
      <div
        style={{
          width: size * 0.09,
          height: size * 0.09,
          borderRadius: size,
          background: "white",
          marginLeft: size * 0.03,
          marginBottom: size * 0.075,
        }}
      />
    </div>
  );
}
