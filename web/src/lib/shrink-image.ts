"use client";

// 폰 사진은 한 장이 몇 MB라서 여러 장을 보내면 요청 크기 제한(4.5MB)을 넘는다.
// 글자를 읽을 수 있는 크기로 브라우저 안에서 줄여서 보낸다. 서버에는 줄인 파일만 간다.

const MAX_SIDE = 1800;
const JPEG_QUALITY = 0.82;
const SKIP_BELOW_BYTES = 400 * 1024; // 이보다 작으면 그대로 둔다

// 줄이지 못하면 원본을 돌려준다. PDF는 줄일 수 없어서 그대로 둔다.
export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= SKIP_BELOW_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) return file;
    // PNG의 투명한 부분이 검게 나오지 않게 흰 바탕을 깐다.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
