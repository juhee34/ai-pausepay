// 단답형 채점. AI를 다시 부르지 않고 코드로 비교한다. 화면 코드 없이 함수만 둔다.
//
// 띄어쓰기, 대소문자, 문장 부호, 전각·반각 차이만 무시하고 나머지는 그대로 비교한다.
// 일부만 맞아도 정답으로 치면 틀린 답이 맞은 걸로 나오므로 글자 전체가 같아야 한다.
// 코드가 모르는 표현은 틀리다고 나올 수 있어서, 화면에서 '맞은 걸로 치기'로 고칠 수 있게 한다.

export function normalizeAnswer(text: string) {
  // 숫자 사이의 점은 남긴다. 지우면 3.5와 35가 같아진다.
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}.]|(?<!\p{N})\.|\.(?!\p{N})/gu, "");
}

export function isShortAnswerCorrect(input: string, acceptedAnswers: string[]) {
  const answer = normalizeAnswer(input);
  if (!answer) return false;
  return acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === answer);
}
