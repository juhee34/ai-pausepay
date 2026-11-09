// 화면 요소를 PNG 그림으로 만들어 폰의 공유 창으로 보낸다. 공유 창이 없으면 파일로 내려받는다.
// 그림은 이 기기 안에서만 만들고 서버로 보내지 않는다.

export type ShareResult = "shared" | "downloaded" | "cancelled";

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // 폰 브라우저가 내려받기를 시작할 시간을 준 뒤에 지운다.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function shareElementImage(element: HTMLElement, fileName: string, title: string): Promise<ShareResult> {
  const { default: html2canvas } = await import("html2canvas-pro");
  await document.fonts?.ready;
  const canvas = await html2canvas(element, { scale: 3, backgroundColor: null, logging: false });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  canvas.width = 0; // 폰 메모리를 바로 돌려준다
  if (!blob) throw new Error("그림을 만들지 못했어요");

  const file = new File([blob], fileName, { type: "image/png" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return "shared";
    } catch (error) {
      // 사용자가 공유 창을 닫았다
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
      // 그 밖의 이유로 공유가 막히면 파일로 내려받는다.
    }
  }
  downloadBlob(blob, fileName);
  return "downloaded";
}
