const FEATURES = [
  {
    tag: "01",
    title: "구매 전 소비 등록",
    desc: "상품명과 가격을 10초 안에 등록하고 결제 전 잠깐 멈춥니다.",
  },
  {
    tag: "02",
    title: "AI 3초 질문",
    desc: "“이걸 왜 사고 싶나요?” 스스로 소비 이유를 인식합니다.",
  },
  {
    tag: "03",
    title: "AI 충동구매 위험도 분석",
    desc: "시간대·금액·이유를 바탕으로 위험도와 근거를 알려줍니다.",
  },
  {
    tag: "04",
    title: "가상 쿨다운 금고",
    desc: "24시간·3일·7일, 구매를 미루는 동안 마음을 정리합니다.",
  },
];

export default function Home() {
  return (
    <main className="flex-1">
      <section className="mx-auto max-w-2xl px-5 pt-16 pb-10 sm:pt-24">
        <p className="text-accent font-mono text-xs font-semibold tracking-widest uppercase">
          PAUSEPAY · 세이브브레이크
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          쓰기 직전의 돈을,
          <br />
          쓰기 전에 지켜드려요.
        </h1>
        <p className="mt-4 text-sm text-foreground/70 sm:text-base">
          PAUSEPAY는 결제 직전 AI가 개입해 충동구매를 한 번 더 생각하게 만드는
          소비 쿨다운 서비스입니다. 얼마를 썼는가 대신, 얼마를 지켰는가를 봅니다.
        </p>
        <button
          type="button"
          className="mt-8 w-full rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-white sm:w-auto"
        >
          소비 등록하고 3초 질문 받기
        </button>
      </section>

      <section className="mx-auto max-w-2xl px-5 pb-20">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.tag}
              className="rounded-2xl border border-foreground/10 bg-foreground/[0.02] p-5"
            >
              <span className="font-mono text-xs font-semibold text-foreground/40">
                {f.tag}
              </span>
              <h2 className="mt-2 text-sm font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-foreground/60">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
