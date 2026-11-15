// 받침에 따라 조사를 고른다. 화면 코드 없이 함수만 둔다. (음성 안내에서 쓰던 것을 여러 화면이 같이 쓰도록 옮김)

// 마지막 글자에 받침이 있는지. 한글이 아니면 받침 없는 것으로 본다. 숫자는 읽는 소리로 본다.
export function hasBatchim(word: string) {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return /[0-9]$/.test(last) ? "013678".includes(last) : false;
  return code % 28 !== 0;
}

// 받침에 따라 조사를 고른다. josa("퀴즈 3", "이에요", "예요") → "퀴즈 3이에요"
export function josa(word: string, withBatchim: string, without: string) {
  return `${word}${hasBatchim(word) ? withBatchim : without}`;
}
