// 폰에서 http 주소로 테스트할 때는 navigator.clipboard가 없어서 예전 방식도 함께 쓴다.
export async function copyText(text: string) {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 아래 예전 방식으로 다시 시도한다.
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  return copied;
}
