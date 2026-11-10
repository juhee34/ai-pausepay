// 화면 요소를 그림으로 찍어 A4 PDF 파일로 내려받는다. 모두 브라우저 안에서 하고 서버로 보내지 않는다.
// 그림으로 넣기 때문에 PDF 안의 글자는 선택할 수 없다. 대신 한글 글꼴을 따로 넣지 않아도 된다.

export type PdfBlock = {
  top: number;
  bottom: number;
  breakBefore?: boolean; // 이 묶음은 새 쪽에서 시작한다
  keepWithNext?: boolean; // 제목처럼 다음 묶음과 같은 쪽에 둔다
};

export type PdfSlice = { top: number; bottom: number };

// 묶음이 쪽 경계에 잘리지 않도록 자를 위치를 정한다. 한 쪽보다 긴 묶음만 쪽 높이대로 자른다.
export function splitPages(blocks: PdfBlock[], totalHeight: number, pageHeight: number): PdfSlice[] {
  const merged: PdfBlock[] = [];
  let kept: PdfBlock | null = null;
  for (const block of blocks) {
    const current: PdfBlock = kept
      ? { ...block, top: kept.top, breakBefore: kept.breakBefore || block.breakBefore }
      : block;
    kept = block.keepWithNext ? current : null;
    if (!kept) merged.push(current);
  }
  if (kept) merged.push(kept);

  const slices: PdfSlice[] = [];
  let start = 0;
  const cut = (end: number) => {
    if (end > start) slices.push({ top: start, bottom: end });
    start = end;
  };
  for (const block of merged) {
    if (block.breakBefore || block.bottom - start > pageHeight) cut(block.top);
    while (block.bottom - start > pageHeight) cut(start + pageHeight);
  }
  while (totalHeight - start > pageHeight) cut(start + pageHeight);
  cut(totalHeight);
  return slices;
}

// 파일 이름에 쓸 수 없는 글자를 뺀다.
export function safeFileName(title: string, extension: string) {
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return `${safe || "우니스"}.${extension}`;
}

export function pdfFileName(title: string) {
  return safeFileName(title, "pdf");
}

const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_X_MM = 15;
const MARGIN_Y_MM = 16;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - MARGIN_X_MM * 2;
const CONTENT_HEIGHT_MM = PAGE_HEIGHT_MM - MARGIN_Y_MM * 2;

// 폰은 너무 큰 그림을 만들지 못한다(아이폰 약 1,670만 화소). 긴 자료는 선명도를 조금 낮춘다.
const MAX_PIXELS = 14_000_000;

// 묶음에는 data-pdf-block을, 새 쪽 시작에는 data-pdf-break를, 제목에는 data-pdf-keep을 붙인다.
export async function saveElementAsPdf(element: HTMLElement, fileName: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas-pro"), import("jspdf")]);
  await document.fonts?.ready;

  const box = element.getBoundingClientRect();
  const blocks = [...element.querySelectorAll<HTMLElement>("[data-pdf-block]")].map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top - box.top,
      bottom: rect.bottom - box.top,
      breakBefore: "pdfBreak" in el.dataset,
      keepWithNext: "pdfKeep" in el.dataset,
    };
  });

  const canvas = await html2canvas(element, {
    scale: Math.min(2, Math.sqrt(MAX_PIXELS / (box.width * box.height))),
    backgroundColor: "#ffffff",
    logging: false,
  });
  const ratio = canvas.width / box.width;
  const pageHeight = (box.width * CONTENT_HEIGHT_MM) / CONTENT_WIDTH_MM;

  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  splitPages(blocks, box.height, pageHeight).forEach((slice, index) => {
    const page = document.createElement("canvas");
    page.width = canvas.width;
    page.height = Math.round((slice.bottom - slice.top) * ratio);
    const context = page.getContext("2d");
    if (!context) throw new Error("canvas를 쓸 수 없어요");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, page.width, page.height);
    context.drawImage(canvas, 0, -Math.round(slice.top * ratio));

    if (index > 0) pdf.addPage();
    const heightMm = (page.height / page.width) * CONTENT_WIDTH_MM;
    pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_X_MM, MARGIN_Y_MM, CONTENT_WIDTH_MM, heightMm);
    page.width = 0; // 폰 메모리를 바로 돌려준다
  });
  pdf.save(fileName);
}
