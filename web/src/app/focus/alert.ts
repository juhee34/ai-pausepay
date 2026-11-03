// 집중이 끝났을 때 소리와 진동으로 알린다. 소리 파일 없이 브라우저 기능으로 만든다.
// 화면이 꺼지거나 다른 앱으로 넘어가면 브라우저가 멈출 수 있어서 울리는 것을 보장하지 못한다.

// 끝난 지 오래 지나 돌아왔을 때 갑자기 소리가 나지 않게 한다.
export const ALERT_WINDOW_MS = 60 * 1000;

// 공부하다가도 알아차리도록 크고 길게 울린다. 짧고 작으면 들리지 않았다.
const BEEP_COUNT = 3;
const BEEP_SECONDS = 0.5;
const BEEP_GAP_SECONDS = 0.2;
const BEEP_VOLUME = 0.7;
const BEEP_FADE_SECONDS = 0.05;
const VIBRATE_PATTERN = [200, 100, 200, 100, 200];

let context: AudioContext | null = null;

// 브라우저는 사용자가 화면을 누른 뒤에만 소리를 허용하므로, 누를 때마다 미리 깨워 둔다.
export function prepareAlert() {
  try {
    context ??= new AudioContext();
    if (context.state !== "running") void context.resume().catch(() => {});
  } catch {
    // 소리를 못 쓰는 브라우저여도 타이머는 그대로 동작한다.
  }
}

function beep(audio: AudioContext) {
  const start = audio.currentTime;
  for (let i = 0; i < BEEP_COUNT; i++) {
    const at = start + i * (BEEP_SECONDS + BEEP_GAP_SECONDS);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 880;
    // 소리가 뚝 끊기는 잡음을 막으려고 끝부분만 부드럽게 줄인다.
    gain.gain.setValueAtTime(BEEP_VOLUME, at);
    gain.gain.setValueAtTime(BEEP_VOLUME, at + BEEP_SECONDS - BEEP_FADE_SECONDS);
    gain.gain.linearRampToValueAtTime(0, at + BEEP_SECONDS);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(at);
    oscillator.stop(at + BEEP_SECONDS);
  }
}

export function playEndAlert() {
  try {
    if (context) {
      const audio = context;
      // 폰 화면이 꺼졌다 켜지면 멈춰 있을 수 있어서 깨운 뒤에 울린다.
      void audio.resume().then(() => beep(audio)).catch(() => {});
    }
  } catch {
    // 소리가 안 나도 기록은 이미 저장되어 있다.
  }
  try {
    // 아이폰 사파리에는 진동 기능이 없다.
    navigator.vibrate?.(VIBRATE_PATTERN);
  } catch {
    // 진동을 못 써도 괜찮다.
  }
}
