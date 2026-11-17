import Link from "next/link";
import type { Metadata } from "next";
import { ArrowDown, ArrowRight, CalendarDays, ChartNoAxesCombined, Check, FileText, GraduationCap, MoveUpRight, ReceiptText, ShieldCheck } from "lucide-react";
import styles from "./welcome.module.css";

export const metadata: Metadata = {
  title: "우니스 UNIS · 흩어진 대학 생활, 나의 하루로",
  description: "강의계획서의 일정과 평가 비율에서 오늘의 공부 계획까지. 수업과 취업 준비를 연결하는 대학생 비서 우니스.",
};

const FEATURES = [
  { no: "01", Icon: CalendarDays, title: "흩어진 마감, 한 달력에.", body: "강의계획서와 공고 캡처에서 일정을 찾아요. 날짜를 확인하고 저장하면 수업과 취업 준비를 함께 챙길 수 있어요.", tags: "강의계획서 · KLAS 캡처 · 취준 일정" },
  { no: "02", Icon: ChartNoAxesCombined, title: "바쁜 오늘, 할 일은 선명하게.", body: "배점, 마감, 예상 시간을 바탕으로 오늘 할 일을 정해요. 목표 총점까지 기말에 몇 점이 필요한지도 계산해요.", tags: "오늘의 한 가지 · 기말 필요 점수 · 리스크 지도" },
  { no: "03", Icon: ReceiptText, title: "끝낸 활동을, 다음 기회로.", body: "대외활동의 진행 상황을 관리하고 경험을 스펙 영수증으로 정리해요. 나중에 자기소개서를 쓸 때 다시 꺼내 볼 수 있도록.", tags: "대외활동 관리 · 스펙 영수증" },
];

export default function WelcomePage() {
  return <main className={styles.page}>
    <header className={styles.header}>
      <Link href="/welcome" aria-label="우니스 소개" className={styles.logo}>UNIS<span>•</span></Link>
      <Link href="/?tour=1" className={styles.navLink}>우니스 시작하기 <MoveUpRight size={15} aria-hidden="true" /></Link>
    </header>
    <section className={styles.hero}>
      <div>
        <p className={styles.eyebrow}><span /> UNIFIED STUDENT · 대학생 AI 비서</p>
        <h1>흩어진 대학 생활,<br /><em>나의 하루로.</em></h1>
        <p className={styles.lead}>과제 마감부터 기말 준비, 취업을 위한 경험까지.<br className={styles.desktopBreak} /> 우니스와 오늘 해야 할 일을 선명하게 만들어 보세요.</p>
        <Link href="/?tour=1" className={styles.primary}>우니스 시작하기 <ArrowRight size={19} aria-hidden="true" /></Link>
        <p className={styles.reassurance}><Check size={14} aria-hidden="true" /> 설치 없이 웹에서 · 로그인은 선택</p>
        <a href="#how-it-works" className={styles.discover}>어떻게 도와주나요? <ArrowDown size={14} aria-hidden="true" /></a>
      </div>
      <div className={styles.preview} aria-label="우니스 기능 설명용 예시. 실제 사용자 데이터가 아닙니다.">
        <div className={styles.previewTop}><span>MY CAMPUS, CONNECTED</span><span>기능 예시</span></div>
        <div className={styles.previewTitle}><GraduationCap size={24} strokeWidth={1.4} aria-hidden="true" /><span>오늘의 작은 시작</span></div>
        <div className={styles.paper}><div><span className={styles.stepNo}>01</span>일정을 모으고<FileText size={18} aria-hidden="true" /></div><p>강의계획서 속 시험·과제 마감</p><span className={styles.sampleTag}>확인한 날짜만 내 달력에</span></div>
        <div className={styles.featuredPaper}><span className={styles.stepNo}>02</span><p>오늘 어디에 시간을 쓸까요?</p><strong>내 배점에 맞춘<br />공부 우선순위</strong><span>남은 시간과 마감을 함께 고려해요 <ArrowRight size={16} aria-hidden="true" /></span></div>
        <div className={styles.paper}><div><span className={styles.stepNo}>03</span>경험을 남겨요<ReceiptText size={18} aria-hidden="true" /></div><p>끝낸 활동 → 나만의 스펙 영수증</p></div>
        <p className={styles.previewFoot}>일정에서 실행으로, 실행에서 기록으로.</p>
      </div>
    </section>
    <section id="how-it-works" className={styles.services}>
      <p className={styles.eyebrow}>LESS SCATTERED. MORE YOU.</p>
      <h2>대학 생활의 다음 행동을<br />한곳에서 찾으세요.</h2>
      <div className={styles.featureGrid}>{FEATURES.map(({no, Icon, title, body, tags}) => <article key={no} className={styles.feature}>
        <div className={styles.featureHead}><Icon size={27} strokeWidth={1.4} aria-hidden="true" /><span>{no}</span></div>
        <h3>{title}</h3><p>{body}</p><small>{tags}</small>
      </article>)}</div>
    </section>
    <section className={styles.difference}>
      <div><p className={styles.eyebrow}>WHY UNIS</p><h2>내 수업의 배점이<br />오늘의 계획이 되도록.</h2></div>
      <div><p>똑같은 두 시간이어도 과목마다 중요한 일은 달라요. 우니스는 내가 확인한 평가 비율과 마감, 예상 소요시간을 연결해 공부할 순서를 정하는 데 도움을 줍니다.</p><p>수업 밖의 지원 마감과 활동 기록도 같은 공간에 모아요. 학업을 챙기는 오늘과 취업을 준비하는 내일이 이어지도록요.</p><small>추천은 입력값에 따른 계산 결과이며, 실제 학점이나 성과를 보장하지 않아요.</small></div>
    </section>
    <section className={styles.start}>
      <ShieldCheck size={27} strokeWidth={1.4} aria-hidden="true" />
      <h2>시작은 가볍게.<br />내 기록은 소중하게.</h2>
      <p>로그인 없이 시작하고, 기록은 이 브라우저에 보관해요.<br />계정 백업은 마이페이지에서 직접 선택할 수 있어요.</p>
      <Link href="/?tour=1" className={styles.primary}>내 대학 생활 정리하기 <ArrowRight size={18} aria-hidden="true" /></Link>
      <small>처음에는 클릭하며 배우는 짧은 사용 안내가 함께해요.</small>
    </section>
    <footer className={styles.footer}><span className={styles.logo}>UNIS<span>•</span></span><p>UNIfied Student<br />광운대생과 함께 시작하는 대학 생활 비서 · 프로토타입</p></footer>
  </main>;
}
