"use client";

// 홈 로고를 누르면 화면이 까맣게 바뀌고, 우니스가 이름을 부르며 오늘 할 일을 말로 추천한다.
// 다 읽으면 사용자가 말로 묻거나(음성 인식이 되는 브라우저) 아래 버튼을 골라서 관련 화면으로 간다.
// 목소리는 브라우저에 들어 있는 음성 읽기·인식(Web Speech API)이라 우니스 서버·AI·쿠키를 쓰지 않는다.
// 소리를 못 내는 브라우저나 무음일 때를 위해 지금 읽는 문장을 아래에 작게 띄운다.

import { useRouter } from "next/navigation";
import { Mic } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { useNowMinutes } from "@/lib/briefing";
import { buildDayPlan, freeMinutesUntilNextClass } from "@/lib/day-plan";
import { useAccount } from "@/lib/firebase-auth";
import { useNickname } from "@/lib/nickname-store";
import { useTimetable } from "@/lib/timetable-store";
import { DEFAULT_AVAILABLE_HOURS, planToday } from "@/lib/today-plan";
import { useScoredTasks } from "@/lib/use-scored-tasks";
import {
  NOT_UNDERSTOOD,
  VOICE_CHOICES,
  intentReply,
  matchIntent,
  voiceScript,
  type VoiceContext,
  type VoiceIntent,
} from "@/lib/voice-script";

// 기기마다 한국어 목소리 이름이 다르다. 자연스러운 목소리를 먼저 고른다.
const PREFERRED_VOICES = [/SunHi/i, /Yuna/i, /Google.*(한국|Korean)/i, /Heami/i];

function pickVoice(voices: SpeechSynthesisVoice[]) {
  const korean = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith("ko"));
  for (const pattern of PREFERRED_VOICES) {
    const found = korean.find((v) => pattern.test(v.name));
    if (found) return found;
  }
  return korean[0];
}

// 읽는 동안 소리 크기처럼 움직이는 원. 음성 읽기는 실제 소리 크기를 알려 주지 않아서 말하는 동안 박자를 흉내 낸다.
function VoiceOrb({
  speakingRef,
  pulseRef,
  small,
}: {
  speakingRef: RefObject<boolean>;
  pulseRef: RefObject<number>;
  small: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = 300;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let amp = 0.1;
    let t = 0;
    let last = performance.now();
    let lastBeat = 0;
    let frame = 0;
    const c = size / 2;

    function draw(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      const speaking = speakingRef.current;
      // 말하는 동안 음절 박자처럼 0.1~0.2초마다 한 번씩 튄다.
      if (speaking && t - lastBeat > 0.1 + Math.random() * 0.1) {
        lastBeat = t;
        pulseRef.current = Math.max(pulseRef.current, 0.45 + Math.random() * 0.55);
      }
      const target = speaking ? 0.35 + 0.65 * pulseRef.current : 0.08;
      amp += (target - amp) * (reduce ? 0.05 : 0.18);
      pulseRef.current *= 0.88;

      ctx!.clearRect(0, 0, size, size);

      // 가운데 빛
      const r = 58 * (1 + 0.1 * amp);
      const glow = ctx!.createRadialGradient(c, c, 0, c, c, r * 2.1);
      glow.addColorStop(0, `rgba(194, 55, 95, ${0.55 + 0.35 * amp})`);
      glow.addColorStop(0.45, "rgba(140, 29, 64, 0.35)");
      glow.addColorStop(1, "rgba(140, 29, 64, 0)");
      ctx!.fillStyle = glow;
      ctx!.beginPath();
      ctx!.arc(c, c, r * 2.1, 0, Math.PI * 2);
      ctx!.fill();

      const core = ctx!.createRadialGradient(c - r * 0.3, c - r * 0.3, 0, c, c, r);
      core.addColorStop(0, "#E0708F");
      core.addColorStop(0.55, "#8C1D40");
      core.addColorStop(1, "#4A0F22");
      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.arc(c, c, r, 0, Math.PI * 2);
      ctx!.fill();

      // 둘레 막대: 소리 파형
      const bars = 72;
      ctx!.lineCap = "round";
      ctx!.lineWidth = 2;
      for (let i = 0; i < bars; i++) {
        const a = (i / bars) * Math.PI * 2;
        const wave = reduce ? 0.6 : Math.abs(Math.sin(a * 3 + t * 4) * Math.cos(a * 5 - t * 2.6));
        const len = 4 + amp * 40 * (0.35 + 0.65 * wave);
        const inner = r + 18;
        ctx!.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.6 * amp * (0.4 + 0.6 * wave)})`;
        ctx!.beginPath();
        ctx!.moveTo(c + Math.cos(a) * inner, c + Math.sin(a) * inner);
        ctx!.lineTo(c + Math.cos(a) * (inner + len), c + Math.sin(a) * (inner + len));
        ctx!.stroke();
      }

      // 바깥 고리: 천천히 도는 눈금
      const spin = reduce ? 0 : t * 0.35;
      ctx!.lineWidth = 1.5;
      ctx!.strokeStyle = "rgba(224, 112, 143, 0.55)";
      for (let k = 0; k < 3; k++) {
        const start = spin + (k * Math.PI * 2) / 3;
        ctx!.beginPath();
        ctx!.arc(c, c, 136, start, start + Math.PI * 0.45);
        ctx!.stroke();
      }
      ctx!.strokeStyle = "rgba(255, 255, 255, 0.12)";
      ctx!.beginPath();
      ctx!.arc(c, c, 128, 0, Math.PI * 2);
      ctx!.stroke();

      frame = requestAnimationFrame(draw);
    }
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [speakingRef, pulseRef]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`transition-[width,height] duration-500 ${small ? "h-[200px] w-[200px]" : "h-[300px] w-[300px]"}`}
    />
  );
}

// 브라우저 음성 인식. 타입이 표준 lib에 없어서 쓰는 부분만 적는다.
type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; length: number; [i: number]: RecognitionAlternative };
type RecognitionEvent = { resultIndex: number; results: { length: number; [i: number]: RecognitionResult } };
type Recognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const noop = () => () => {};
function useCanListen() {
  return useSyncExternalStore(noop, () => recognitionCtor() !== null, () => false);
}

function toHm(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// 읽을 문장과, 말하거나 고른 것에 대답할 때 쓰는 오늘 상황.
function useVoiceData(canListen: boolean) {
  const { today, scored, isExample } = useScoredTasks();
  const timetable = useTimetable();
  const now = useNowMinutes();
  const nickname = useNickname();
  const account = useAccount();

  return useMemo(() => {
    const plan = planToday(scored, DEFAULT_AVAILABLE_HOURS);
    let nextClass: { course: string; minutes: number } | null = null;
    if (today && now !== null) {
      const timed = buildDayPlan(today, timetable, [], []).timed;
      const free = freeMinutesUntilNextClass(now, timed);
      if (free === 0) {
        const current = timed.find((c) => c.slot.start <= toHm(now) && c.slot.end > toHm(now));
        if (current) nextClass = { course: current.slot.course, minutes: 0 };
      } else if (free !== null) {
        const next = timed.find((c) => c.slot.start > toHm(now));
        if (next) nextClass = { course: next.slot.course, minutes: free };
      }
    }
    const picks = plan.picks.map((p) => ({
      course: p.task.course,
      title: p.task.title,
      hours: p.hours,
      reason: p.task.reason,
      days: p.task.days,
    }));
    const first = plan.picks[0];
    const lines = voiceScript({
      name: nickname || account.user?.displayName || null,
      hour: now === null ? 12 : Math.floor(now / 60),
      available: DEFAULT_AVAILABLE_HOURS,
      picks,
      deferred: plan.deferred ? { course: plan.deferred.course, title: plan.deferred.title } : null,
      isExample,
      nextClass,
      canListen,
    });
    const ctx: VoiceContext = {
      main: picks[0] ?? null,
      // 오늘의 한 가지 화면의 '집중 시작'과 같은 주소
      focusHref: first
        ? `/focus?deadline=${encodeURIComponent(first.task.id)}&course=${encodeURIComponent(first.task.course)}&hours=${first.hours}`
        : "/focus",
      nextClass,
      hasTimetable: timetable.length > 0,
      weekTasks: scored
        .filter((t) => t.days <= 6)
        .sort((a, b) => a.days - b.days)
        .map((t) => ({ course: t.course, title: t.title, days: t.days })),
      isExample,
    };
    return { lines, ctx };
  }, [scored, isExample, timetable, now, nickname, account.user, today, canListen]);
}

// intro: 처음 안내를 읽는 중 · ask: 말하거나 고르기를 기다림 · listening: 듣는 중 · reply: 대답을 읽는 중
type Phase = "intro" | "ask" | "listening" | "reply";

const ASK_CAPTION = "무엇을 도와드릴까요?";
const IDLE_CLOSE_MS = 30_000;

// 로고 버튼. children이 로고 모양이다.
export default function VoiceCall({ className, children }: { className?: string; children: ReactNode }) {
  const router = useRouter();
  const canListen = useCanListen();
  const { lines, ctx } = useVoiceData(canListen);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [caption, setCaption] = useState("");
  const [micBlocked, setMicBlocked] = useState(false);
  const speakingRef = useRef(false);
  const pulseRef = useRef(0);
  const timers = useRef<number[]>([]);
  const idleTimer = useRef<number | null>(null);
  // 새로 읽기 시작하면 앞선 읽기의 끝 신호는 무시한다.
  const speechToken = useRef(0);
  const recognition = useRef<Recognition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    idleTimer.current = null;
  }

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  function stopSpeech() {
    speechToken.current += 1;
    clearTimers();
    window.speechSynthesis?.cancel();
    speakingRef.current = false;
  }

  function stopListening() {
    recognition.current?.abort();
    recognition.current = null;
  }

  // 소리를 못 낼 때: 문장 길이만큼 자막만 넘긴다.
  function captionsOnly(texts: string[], token: number, onDone: () => void) {
    let at = 0;
    for (const text of texts) {
      later(() => {
        if (token !== speechToken.current) return;
        speakingRef.current = true;
        setCaption(text);
      }, at);
      at += 600 + text.length * 110;
      later(() => (speakingRef.current = false), at - 250);
    }
    later(() => token === speechToken.current && onDone(), at);
  }

  // 문장을 차례로 읽고 끝나면 onDone. 아이폰은 누른 그 순간에 읽기를 시작해야 소리가 나서, 모두 한꺼번에 줄 세운다.
  function speak(texts: string[], onDone: () => void) {
    stopSpeech();
    const token = speechToken.current;
    setCaption(texts[0] ?? "");
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === "undefined") {
      captionsOnly(texts, token, onDone);
      return;
    }
    const voice = pickVoice(synth.getVoices());
    let started = false;
    texts.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "ko-KR";
      if (voice) u.voice = voice;
      u.rate = 1.05;
      u.onstart = () => {
        if (token !== speechToken.current) return;
        started = true;
        speakingRef.current = true;
        setCaption(text);
      };
      u.onboundary = () => {
        pulseRef.current = 1;
      };
      u.onend = () => {
        if (token !== speechToken.current) return;
        speakingRef.current = false;
        if (i === texts.length - 1) onDone();
      };
      u.onerror = () => {
        if (token !== speechToken.current) return;
        speakingRef.current = false;
        if (i === texts.length - 1) onDone();
      };
      synth.speak(u);
    });
    // 2.5초 안에 읽기가 시작되지 않으면(막힌 브라우저) 자막만 보여 준다.
    later(() => {
      if (started || token !== speechToken.current) return;
      synth.cancel();
      captionsOnly(texts, token, onDone);
    }, 2500);
  }

  function toAsk() {
    setPhase("ask");
    setCaption(ASK_CAPTION);
    if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
    // 한참 아무것도 안 하면 닫는다.
    idleTimer.current = window.setTimeout(close, IDLE_CLOSE_MS);
  }

  function start() {
    stopListening();
    setPhase("intro");
    setOpen(true);
    requestAnimationFrame(() => setShown(true));
    speak(lines, toAsk);
  }

  function choose(intent: VoiceIntent) {
    stopListening();
    const reply = intentReply(intent, ctx);
    setPhase("reply");
    speak(reply.lines, () => {
      if (reply.close) return close();
      if (reply.href) {
        close();
        router.push(reply.href);
        return;
      }
      toAsk();
    });
  }

  function listen() {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    stopSpeech();
    stopListening();
    const rec = new Ctor();
    recognition.current = rec;
    rec.lang = "ko-KR";
    rec.interimResults = true;
    rec.maxAlternatives = 3;
    rec.continuous = false;
    let handled = false;
    setPhase("listening");
    setCaption("듣고 있어요…");
    speakingRef.current = true;

    rec.onresult = (e) => {
      pulseRef.current = 1;
      let heard = "";
      for (let i = 0; i < e.results.length; i++) heard += e.results[i][0]?.transcript ?? "";
      if (heard.trim()) setCaption(`“${heard.trim()}”`);
      const last = e.results[e.results.length - 1];
      if (!last?.isFinal || handled) return;
      handled = true;
      speakingRef.current = false;
      const alternatives = Array.from({ length: last.length }, (_, i) => last[i].transcript);
      const intent = matchIntent([heard, ...alternatives]);
      if (intent) choose(intent);
      else {
        setPhase("reply");
        speak([NOT_UNDERSTOOD], toAsk);
      }
    };
    rec.onerror = (e) => {
      if (handled || recognition.current !== rec) return;
      handled = true;
      speakingRef.current = false;
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicBlocked(true);
        toAsk();
        setCaption("마이크를 쓸 수 없어요. 아래에서 골라 주세요.");
      } else {
        toAsk();
        setCaption("잘 못 들었어요. 마이크를 다시 눌러 말씀해 주세요.");
      }
    };
    rec.onend = () => {
      if (handled || recognition.current !== rec) return;
      speakingRef.current = false;
      toAsk();
    };
    try {
      rec.start();
    } catch {
      speakingRef.current = false;
      setMicBlocked(true);
      toAsk();
    }
  }

  function close() {
    stopSpeech();
    stopListening();
    setShown(false);
    setOpen(false);
    buttonRef.current?.focus();
  }

  // 처음 안내 중에 화면을 누르면 건너뛰고, 고르는 중에 빈 곳을 누르면 닫는다.
  function tapBackground() {
    if (phase === "intro") {
      stopSpeech();
      toAsk();
    } else close();
  }

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close는 매번 새로 만들어지지만 하는 일이 같다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 화면을 떠나면 읽기·듣기를 멈춘다.
  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      if (idleTimer.current !== null) window.clearTimeout(idleTimer.current);
      window.speechSynthesis?.cancel();
      recognition.current?.abort();
    },
    [],
  );

  const choosing = phase !== "intro";
  const listening = phase === "listening";
  const showMic = canListen && !micBlocked;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={start}
        aria-label="우니스 부르기: 오늘 할 일을 말로 들려줘요"
        className={`-m-1 rounded-button p-1 text-left active:opacity-70 ${className ?? ""}`}
      >
        {children}
      </button>

      {open && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="우니스 음성 안내"
          tabIndex={-1}
          onClick={tapBackground}
          className={`fixed inset-0 z-50 overflow-y-auto bg-black outline-none transition-opacity duration-300 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="flex min-h-full flex-col items-center justify-center px-5 pt-10 pb-[calc(env(safe-area-inset-bottom)+24px)]">
            <VoiceOrb speakingRef={speakingRef} pulseRef={pulseRef} small={choosing} />
            <p
              aria-live="polite"
              className={`min-h-12 max-w-xs text-center text-[15px] leading-relaxed break-keep text-white/80 ${choosing ? "mt-3" : "mt-8"}`}
            >
              {caption}
            </p>

            {choosing && (
              // 버튼을 눌러도 화면 닫기로 번지지 않게 막는다.
              <div className="mt-5 flex w-full max-w-sm flex-col items-center" onClick={(e) => e.stopPropagation()}>
                {showMic && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (!listening) return listen();
                        stopListening();
                        speakingRef.current = false;
                        toAsk();
                      }}
                      aria-pressed={listening}
                      className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${
                        listening ? "bg-brand motion-safe:animate-pulse" : "bg-white/15 active:bg-white/25"
                      }`}
                    >
                      <Mic size={26} strokeWidth={1.8} aria-hidden="true" />
                      <span className="sr-only">{listening ? "듣기 멈추기" : "말로 물어보기"}</span>
                    </button>
                    <p className="mt-2 text-xs text-white/60">{listening ? "듣고 있어요. 말씀해 주세요" : "눌러서 말하기"}</p>
                  </>
                )}
                <div className="mt-4 flex flex-wrap justify-center gap-2" role="group" aria-label="고르기">
                  {VOICE_CHOICES.map((choice) => (
                    <button
                      key={choice.intent}
                      type="button"
                      onClick={() => choose(choice.intent)}
                      className="min-h-11 rounded-full border border-white/25 px-3.5 text-[13px] font-semibold text-white/90 active:bg-white/15"
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
                {showMic && (
                  <p className="mt-4 max-w-xs text-center text-[11px] leading-relaxed text-white/40">
                    말한 내용은 글자로 바꾸기 위해 브라우저(구글·애플)의 음성 인식으로 보내져요. 우니스는 듣거나 저장하지 않아요.
                  </p>
                )}
                <p className="mt-3 text-center text-xs text-white/40">빈 곳을 누르면 닫혀요</p>
              </div>
            )}
          </div>
          {!choosing && (
            <p className="pointer-events-none fixed inset-x-0 bottom-0 pb-[calc(env(safe-area-inset-bottom)+20px)] text-center text-xs text-white/40">
              화면을 누르면 건너뛰어요
            </p>
          )}
        </div>
      )}
    </>
  );
}
