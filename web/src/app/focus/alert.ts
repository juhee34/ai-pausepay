// 집중이 끝났을 때 끌 때까지 삐-뽀 소리와 진동으로 알린다. 소리 파일 없이 브라우저 기능으로 만든다.
// 화면이 꺼지거나 다른 앱으로 넘어가면 브라우저가 멈출 수 있어서 울리는 것을 보장하지 못한다.

// 끝난 지 오래 지나 돌아왔을 때 갑자기 소리가 나지 않게 한다.
export const ALERT_WINDOW_MS = 60 * 1000;

// 끄지 않아도 이 시간이 지나면 멈춘다. 도서관 같은 곳에서 계속 울리지 않게 한다.
export const ALARM_SECONDS = 60;

const HIGH_HZ = 960;
const LOW_HZ = 640;
const TONE_SECONDS = 0.4;
const TONE_GAP_SECONDS = 0.05;
const CYCLE_GAP_SECONDS = 0.25;
const VOLUME = 0.7;
const FADE_SECONDS = 0.02;

const VIBRATE_PATTERN = [400, 200, 400];
const VIBRATE_EVERY_MS = 2000;

let context: AudioContext | null = null;
let stopCurrent: (() => void) | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeAlarm(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const isAlarmRinging = () => stopCurrent !== null;
export const getServerAlarmRinging = () => false;

// 브라우저는 사용자가 화면을 누른 뒤에만 소리를 허용하므로, 누를 때마다 미리 깨워 둔다.
export function prepareAlert() {
  try {
    context ??= new AudioContext();
    if (context.state !== "running") void context.resume().catch(() => {});
  } catch {
    // 소리를 못 쓰는 브라우저여도 타이머는 그대로 동작한다.
  }
}

// 다른 탭으로 가면 타이머가 느려지므로, 1분치 소리를 한 번에 예약해 둔다.
function scheduleTones(audio: AudioContext) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + 0.02;
  const end = start + ALARM_SECONDS;

  const gateTone = (at: number, hz: number) => {
    oscillator.frequency.setValueAtTime(hz, at);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(VOLUME, at + FADE_SECONDS);
    gain.gain.setValueAtTime(VOLUME, at + TONE_SECONDS - FADE_SECONDS);
    gain.gain.linearRampToValueAtTime(0, at + TONE_SECONDS);
  };

  gain.gain.setValueAtTime(0, start);
  const cycle = 2 * (TONE_SECONDS + TONE_GAP_SECONDS) + CYCLE_GAP_SECONDS;
  for (let at = start; at + cycle <= end; at += cycle) {
    gateTone(at, HIGH_HZ);
    gateTone(at + TONE_SECONDS + TONE_GAP_SECONDS, LOW_HZ);
  }

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(start);
  oscillator.stop(end);

  return () => {
    try {
      oscillator.stop();
    } catch {
      // 이미 멈췄으면 그대로 둔다.
    }
    gain.disconnect();
  };
}

export function stopAlarm() {
  if (!stopCurrent) return;
  stopCurrent();
  stopCurrent = null;
  notify();
}

export function startAlarm() {
  stopAlarm();

  let stopTones: (() => void) | null = null;
  let stopped = false;

  const vibrate = () => {
    try {
      // 아이폰 사파리에는 진동 기능이 없다.
      navigator.vibrate?.(VIBRATE_PATTERN);
    } catch {
      // 진동을 못 써도 괜찮다.
    }
  };
  vibrate();
  const vibrateTimer = setInterval(vibrate, VIBRATE_EVERY_MS);
  const stopTimer = setTimeout(stopAlarm, ALARM_SECONDS * 1000);

  stopCurrent = () => {
    stopped = true;
    clearInterval(vibrateTimer);
    clearTimeout(stopTimer);
    stopTones?.();
    try {
      navigator.vibrate?.(0);
    } catch {
      // 진동을 못 써도 괜찮다.
    }
  };
  notify();

  const audio = context;
  if (!audio) return;
  // 폰 화면이 꺼졌다 켜지면 멈춰 있을 수 있어서 깨운 뒤에 울린다.
  void audio
    .resume()
    .then(() => {
      if (!stopped) stopTones = scheduleTones(audio);
    })
    .catch(() => {});
}
