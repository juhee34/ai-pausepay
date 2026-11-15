"use client";

// 브라우저 목소리 목록을 미리 불러 둔다.
// 크롬은 처음 getVoices()를 부르면 빈 목록을 주고 나중에 채운다. 로고를 처음 누를 때 목록이 비어 있으면
// 자연스러운 한국어 목소리를 못 고르고 기본 목소리로 읽어서, 화면이 열릴 때 미리 불러 둔다.
//
// 불러오는 순서는 EasySpeech의 init 방식을 따랐다:
// 바로 읽어 보기 → 'voiceschanged' 신호 기다리기 → interval마다 다시 읽기 → maxTimeout이 지나면 그때 목록으로 끝내기.
// 출처: EasySpeech (https://github.com/leaonline/easy-speech), MIT License, Copyright (c) 2021 Jan Küster
// 패키지는 설치하지 않고 이 방식만 우리 코드로 옮겼다. 자세한 내용은 docs/개발가이드.md '참고 자료'.

const DEFAULT_MAX_TIMEOUT = 5000; // EasySpeech 기본값과 같다
const DEFAULT_INTERVAL = 250;

let cached: SpeechSynthesisVoice[] = [];
let loading: Promise<SpeechSynthesisVoice[]> | null = null;

function synth(): SpeechSynthesis | null {
  return typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;
}

// 목록이 생기면(또는 maxTimeout이 지나면) 끝난다. 여러 번 불러도 한 번만 불러온다.
export function loadVoices({
  maxTimeout = DEFAULT_MAX_TIMEOUT,
  interval = DEFAULT_INTERVAL,
}: { maxTimeout?: number; interval?: number } = {}): Promise<SpeechSynthesisVoice[]> {
  const s = synth();
  if (!s) return Promise.resolve([]);
  if (cached.length > 0) return Promise.resolve(cached);
  if (loading) return loading;

  // 1) 바로 읽어 보기
  const first = readVoices(s);
  if (first.length > 0) {
    cached = first;
    return Promise.resolve(first);
  }

  loading = new Promise((resolve) => {
    let done = false;

    const finish = (list: SpeechSynthesisVoice[]) => {
      if (done) return;
      done = true;
      window.clearInterval(poll);
      window.clearTimeout(timer);
      s.removeEventListener?.("voiceschanged", tryLoad);
      cached = list;
      loading = null; // 빈 목록으로 끝났으면 다음에 다시 불러 본다.
      resolve(list);
    };

    function tryLoad() {
      const list = readVoices(s!);
      if (list.length > 0) finish(list);
    }

    // 2) 'voiceschanged' 신호 기다리기 3) interval마다 다시 읽기 4) maxTimeout이 지나면 끝내기
    s.addEventListener?.("voiceschanged", tryLoad);
    const poll = window.setInterval(tryLoad, interval);
    const timer = window.setTimeout(() => finish(readVoices(s)), maxTimeout);
  });
  return loading;
}

function readVoices(s: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    return s.getVoices() ?? [];
  } catch {
    return []; // 목록을 못 읽는 브라우저는 빈 목록으로 둔다.
  }
}

// 지금 고를 수 있는 목소리. 미리 불러 둔 목록이 있으면 그것을, 없으면 브라우저에 바로 물어본다.
// 아이폰은 누른 그 순간에 읽기를 시작해야 소리가 나서, 기다리지 않고 바로 돌려준다.
export function currentVoices(): SpeechSynthesisVoice[] {
  if (cached.length > 0) return cached;
  try {
    return synth()?.getVoices() ?? [];
  } catch {
    return [];
  }
}
