/**
 * 우니스 사후 설문을 구글 폼으로 만드는 스크립트 (docs/사후설문.md와 같은 문항).
 *
 * 쓰는 법 (5분)
 * 1. 구글에 로그인한 브라우저에서 https://script.google.com 을 열고 '새 프로젝트'를 누릅니다.
 * 2. 편집기에 있던 내용을 모두 지우고, 이 파일 전체를 붙여 넣은 뒤 저장(Ctrl+S)합니다.
 * 3. 위쪽 함수 고르기에서 createUnisSurvey를 고르고 '실행'을 누릅니다.
 * 4. 처음 한 번은 '권한 검토' 창이 뜹니다. 내 계정을 고르고 허용합니다.
 *    (이 스크립트는 내 구글 드라이브에 폼 하나를 만드는 일만 합니다.)
 * 5. 아래 '실행 로그'에 나오는 두 주소를 확인합니다.
 *    - 응답 주소: 참가자에게 보내는 주소
 *    - 편집 주소: 문구를 고치거나 응답을 보는 주소 (참가자에게 보내지 않기)
 *
 * 보내기 전에 확인할 것
 * - Q3·Q13 문구를 사전 설문과 똑같이 맞추기 (아래 PRE_SURVEY_ 두 줄)
 * - 인터뷰 신청 폼 주소가 생기면 INTERVIEW_LINK에 넣고 다시 실행하거나, 폼 설정에서 확인 메시지를 고치기
 * - 폼 설정에서 '이메일 주소 수집'이 꺼져 있는지 한 번 더 보기
 * 다시 실행하면 폼이 하나 더 만들어집니다. 필요 없는 폼은 드라이브에서 지우세요.
 */

const PRE_SURVEY_Q3 = '요즘 더 신경 쓰이는 쪽은?'; // [정할 것] 사전 설문 문구 그대로
const PRE_SURVEY_Q13 = '"자소서나 이력서를 쓸 때 무엇을 적어야 할지 막막하다."'; // [정할 것] 사전 설문 문구 그대로
const INTERVIEW_LINK = ''; // 인터뷰 신청용 별도 폼 주소. 비워 두면 안내만 빠진다.

const FEATURES = [
  '강의계획서 → 캘린더',
  '홈 오늘 브리핑',
  '우선순위(오늘의 한 가지)',
  '시험 대비',
  '교수님 메일',
  '집중 모드',
  '기말 필요 점수',
  '학기 리스크 지도',
  '공고·자격증 일정',
  '대외활동 목록',
  '스펙 영수증',
  '역량 공백 지도',
  '학기 결산서',
];
const START_DAYS = ['하루 전', '2~3일 전', '4~6일 전', '1~2주 전', '2주보다 전'];

function createUnisSurvey() {
  const form = FormApp.create('우니스 시범 운영 사후 설문');
  form
    .setDescription(
      [
        '우니스 시범 운영에 참여해 주셔서 고마워요. 써 보신 경험을 5분만 들려주세요.',
        '- 이름이나 이메일은 받지 않아요. 답은 묶어서 통계로만 쓰고, 수업 발표와 서비스 개선에만 써요.',
        '- 답하기 싫은 문항은 건너뛰어도 돼요 (필수 표시 제외).',
        '- 정답은 없어요. 별로였던 점을 솔직하게 알려 주시는 게 가장 큰 도움이 돼요.',
      ].join('\n'),
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false) // 켜면 구글 로그인을 요구한다
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setProgressBar(true)
    .setConfirmationMessage(
      '답해 주셔서 고마워요!' +
        (INTERVIEW_LINK
          ? '\n10~15분 인터뷰에 참여해 주실 수 있다면 아래 링크로 따로 남겨 주세요. 이 설문과 연결되지 않아요.\n' + INTERVIEW_LINK
          : ''),
    );

  // ── 0. 발표·분석에 써도 될까요? '아니요'면 바로 제출된다 ──
  const consent = form
    .addMultipleChoiceItem()
    .setTitle('Q0. 이 설문의 답을 이름 없이 묶어서 수업 발표와 서비스 분석에 써도 될까요?')
    .setHelpText('이름·학번·이메일은 묻지 않아요. 어느 답을 골라도 불이익은 없어요.')
    .setRequired(true);
  consent.setChoices([
    consent.createChoice('네, 써도 돼요 (짧은 의견을 이름 없이 인용하는 것 포함)', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('통계 숫자로만 써 주세요 (의견 인용은 안 돼요)', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('아니요, 쓰지 말아 주세요 (바로 제출되고 답은 쓰지 않아요)', FormApp.PageNavigationType.SUBMIT),
  ]);

  // ── 1. 나에 대해 ──
  form.addPageBreakItem().setTitle('1. 나에 대해');
  choice(form, 'Q1. 학년', ['1학년', '2학년', '3학년', '4학년 이상'], true);
  choice(form, 'Q2. 전공 계열', ['경영·경제', '인문·사회', '공학', '자연', '예체능', '기타'], true);
  choice(
    form,
    'Q3. ' + PRE_SURVEY_Q3,
    ['학교 공부가 훨씬', '학교 공부가 조금 더', '비슷', '취업 준비가 조금 더', '취업 준비가 훨씬'],
    true,
  );
  choice(form, 'Q4. 시범 기간에 우니스를 며칠쯤 열었나요?', ['1~2일', '3~5일', '6~8일', '거의 매일'], true);
  checkbox(
    form,
    'Q5. 어떻게 썼나요? (여러 개)',
    ['홈 화면에 추가해서', '브라우저에서 주소로', '로그인해서', '계정 백업을 해 봄', '캘린더 구독 주소를 등록함'],
    false,
  );

  // ── 2. 기능 ──
  form.addPageBreakItem().setTitle('2. 기능');
  checkbox(form, 'Q6. 써 본 기능을 모두 골라 주세요.', FEATURES, true);
  choice(form, 'Q7. 가장 도움이 된 기능 하나는?', FEATURES, true);
  form.addTextItem().setTitle('Q8. 그 기능이 왜 도움이 됐나요?');
  choice(
    form,
    'Q8-1. (강의계획서 → 캘린더를 써 본 분만) AI가 찾은 날짜가 얼마나 맞았나요?',
    ['거의 다 맞았다', '몇 개 고쳤다', '많이 고쳤다', '안 써 봤다'],
    false,
  );
  checkbox(
    form,
    'Q8-2. 우니스 전에는 일정과 마감을 주로 어디서 챙겼나요? (여러 개)',
    ['에브리타임', '폰 캘린더', '메모·노트 앱', '엑셀·스프레드시트', '종이 다이어리', '따로 안 챙겼다'],
    false,
  ).showOtherOption(true);
  choice(
    form,
    'Q8-3. 시범 기간에 우니스가 원래 쓰던 방법을 대신했나요?',
    ['완전히 대신했다', '일부 대신했다', '원래 방법과 같이 썼다', '원래 방법만 썼다'],
    false,
  );
  choice(
    form,
    'Q8-4. 우니스를 가장 많이 연 때는 언제였나요?',
    ['과제 마감 전', '시험 전', '하루를 시작할 때', '수업 사이 빈 시간', '취업 준비를 할 때'],
    false,
  ).showOtherOption(true);

  // ── 3. 시험 준비와 자소서 ──
  form.addPageBreakItem().setTitle('3. 시험 준비와 자소서');
  choice(form, 'Q9. 평소에는 시험 준비를 시험 며칠 전에 시작하나요?', START_DAYS, true);
  choice(form, 'Q10. 이번 기말은 시험 며칠 전에 시작했나요?', START_DAYS, true);
  choice(
    form,
    'Q11. (기말 필요 점수를 써 본 분만) 필요한 점수를 본 것이 준비 시작에 영향을 줬나요?',
    ['더 일찍 시작했다', '영향 없었다', '오히려 늦게 시작했다', '안 써 봤다'],
    false,
  );
  choice(
    form,
    'Q12. (리스크 지도를 써 본 분만) 몰리는 주를 본 뒤 할 일을 앞당긴 적이 있나요?',
    ['여러 번 앞당겼다', '한 번쯤 앞당겼다', '보기만 했다', '안 써 봤다'],
    false,
  );
  form
    .addScaleItem()
    .setTitle('Q13. ' + PRE_SURVEY_Q13)
    .setBounds(1, 5)
    .setLabels('전혀 아니다', '매우 그렇다')
    .setRequired(true);
  choice(form, 'Q14. 스펙 영수증을 몇 장 만들었나요?', ['0장', '1장', '2~3장', '4장 이상'], false);

  // ── 4. 실제 걸린 시간 ──
  form
    .addPageBreakItem()
    .setTitle('4. 실제 걸린 시간')
    .setHelpText('우니스는 할 일마다 공부 시간을 시험 준비 8시간, 과제 3시간, 퀴즈 1시간으로 어림잡았어요.');
  const hoursRule = FormApp.createTextValidation()
    .requireNumberBetween(0, 200)
    .setHelpText('0~200 사이 숫자로 적어 주세요. 예: 6 또는 2.5')
    .build();
  form.addTextItem().setTitle('Q15-1. 한 과목 기준, 시험 준비(중간·기말 하나)에 보통 실제로 몇 시간 걸렸나요?').setValidation(hoursRule);
  form.addTextItem().setTitle('Q15-2. 과제 하나에 보통 실제로 몇 시간 걸렸나요?').setValidation(hoursRule);
  form.addTextItem().setTitle('Q15-3. 퀴즈 하나에 보통 실제로 몇 시간 걸렸나요?').setValidation(hoursRule);
  form
    .addGridItem()
    .setTitle('Q16. 우니스의 예상 시간과 비교하면?')
    .setRows(['시험 준비 (8시간)', '과제 (3시간)', '퀴즈 (1시간)'])
    .setColumns(['실제가 훨씬 길었다', '조금 길었다', '비슷했다', '조금 짧았다', '훨씬 짧았다']);
  choice(
    form,
    'Q17. 할 일에 예상 시간을 직접 고쳐 넣은 적이 있나요?',
    ['자주 고쳤다', '한두 번 고쳤다', '고칠 수 있는 줄 몰랐다', '필요 없어서 안 고쳤다'],
    false,
  );

  // ── 5. 만족과 추천 ──
  form.addPageBreakItem().setTitle('5. 만족과 추천');
  form.addScaleItem().setTitle('Q18. 우니스에 전반적으로 얼마나 만족하나요?').setBounds(1, 5).setLabels('매우 불만족', '매우 만족').setRequired(true);
  form.addScaleItem().setTitle('Q19. 친구에게 우니스를 추천할 가능성은?').setBounds(0, 10).setLabels('전혀 없음', '매우 높음').setRequired(true);
  choice(
    form,
    'Q20. 다음 학기에도 쓸 생각이 있나요?',
    ['꼭 쓰겠다', '아마 쓸 것 같다', '모르겠다', '아마 안 쓸 것 같다', '안 쓰겠다'],
    true,
  );
  form
    .addMultipleChoiceItem()
    .setTitle('Q21. 매일 무료 쿠키(AI 20회)를 다 쓴 뒤, AI를 더 쓰려면 얼마까지 낼 수 있나요?')
    .setHelpText('시범 기간의 쿠키 충전은 모의 결제라 실제로 돈이 나가지 않았어요.')
    .setChoiceValues(['돈을 내고는 안 쓴다', 'AI 5회에 300원', 'AI 5회에 500원', 'AI 5회에 1,000원', '월 3,000원 정액'])
    .showOtherOption(true);
  choice(
    form,
    'Q21-1. 학교나 취업지원센터가 우니스를 무료로 제공하면 쓰겠나요?',
    ['꼭 쓰겠다', '아마 쓰겠다', '모르겠다', '아마 안 쓸 것 같다', '안 쓰겠다'],
    false,
  );

  // ── 6. 불편한 점 ──
  form.addPageBreakItem().setTitle('6. 불편한 점');
  choice(form, 'Q22. 써 보면서 오류가 난 적이 있나요?', ['없었다', '있었다'], false);
  form.addParagraphTextItem().setTitle('Q22-1. (오류가 있었다면) 어느 화면에서 무엇을 눌렀을 때였나요?');
  form.addScaleItem().setTitle('Q23. AI에 강의자료나 일정을 보내는 것이 걱정됐나요?').setBounds(1, 5).setLabels('전혀 걱정 안 됨', '많이 걱정됨');
  form.addParagraphTextItem().setTitle('Q24. 가장 불편했던 점이나 꼭 바뀌었으면 하는 점은?');

  Logger.log('응답 주소 (참가자에게 보내기): ' + form.getPublishedUrl());
  Logger.log('편집 주소 (팀만): ' + form.getEditUrl());
}

function choice(form, title, options, required) {
  return form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(required);
}

function checkbox(form, title, options, required) {
  return form.addCheckboxItem().setTitle(title).setChoiceValues(options).setRequired(required);
}
