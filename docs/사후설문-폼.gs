/**
 * 우니스 사후 설문 구글 폼 스크립트 (docs/사후설문.md와 같은 문항: 동의 1개 + 질문 5개).
 *
 * 새로 만들 때: createUnisSurvey 실행
 * 1. https://script.google.com 에서 '새 프로젝트'를 만들고, 이 파일 전체를 붙여 넣고 저장합니다.
 * 2. 함수 고르기에서 createUnisSurvey를 고르고 '실행'을 누릅니다.
 * 3. 처음 한 번은 '권한 검토' 창이 뜹니다. 내 계정을 고르고 허용합니다.
 * 4. '실행 로그'에 응답 주소(참가자용)와 편집 주소(팀용)가 나옵니다.
 *
 * 이미 만든 폼을 같은 주소로 고칠 때: updateUnisSurvey 실행
 * - 아래 FORM_ID에 편집 주소의 /d/ 와 /edit 사이 값을 넣고 실행합니다.
 * - 폼의 문항을 모두 지우고 이 파일의 문항으로 다시 채웁니다. 이미 받은 응답이 있으면 실행하지 마세요.
 */

const FORM_ID = ''; // 이미 만든 폼을 고칠 때만 넣는다
const INTERVIEW_LINK = ''; // 인터뷰 신청용 별도 폼 주소. 비워 두면 안내만 빠진다.

const FAVORITE_FEATURES = [
  '강의계획서 → 캘린더',
  '오늘의 브리핑',
  '우선순위',
  '시험 대비',
  '교수님 메일',
  '집중 모드',
  '기말 필요 점수',
  '리스크 지도',
  '공고 일정',
  '대외활동',
  '스펙 영수증',
  '역량 공백 지도',
  '학기 결산서',
];
const WISHED_FEATURES = ['졸업요건 계산기', '기업 분석 카드', '공고별 필요 역량 분석', '마감 알림', '친구와 일정 공유'];

function createUnisSurvey() {
  const form = FormApp.create('우니스 시범 운영 사후 설문');
  fillSurvey(form);
  logUrls(form);
}

function updateUnisSurvey() {
  if (!FORM_ID) throw new Error('FORM_ID에 편집 주소의 /d/ 와 /edit 사이 값을 넣어 주세요.');
  const form = FormApp.openById(FORM_ID);
  form.getItems().forEach((item) => form.deleteItem(item));
  fillSurvey(form);
  logUrls(form);
}

function fillSurvey(form) {
  form
    .setTitle('우니스 시범 운영 사후 설문')
    .setDescription(
      [
        '우니스 시범 운영에 참여해 주셔서 감사합니다. 1분이면 충분합니다.',
        '이름이나 이메일은 받지 않으며, 답변은 묶어서 통계와 수업 발표에만 사용합니다.',
      ].join('\n'),
    )
    .setCollectEmail(false)
    .setLimitOneResponsePerUser(false) // 켜면 구글 로그인을 요구한다
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(false)
    .setProgressBar(true)
    .setConfirmationMessage(
      '응답해 주셔서 감사합니다!' +
        (INTERVIEW_LINK ? '\n짧은 인터뷰에 참여해 주실 수 있다면 아래 링크로 따로 남겨 주세요.\n' + INTERVIEW_LINK : ''),
    );

  // 1페이지: 동의. '아니요'면 바로 제출된다.
  const consent = form
    .addMultipleChoiceItem()
    .setTitle('응답 내용을 이름 없이 수업 발표와 서비스 분석에 사용해도 될까요?')
    .setHelpText('어느 답을 고르셔도 불이익은 없습니다.')
    .setRequired(true);
  consent.setChoices([
    consent.createChoice('네, 사용해도 됩니다', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('통계로만 사용해 주세요', FormApp.PageNavigationType.CONTINUE),
    consent.createChoice('아니요 (바로 제출됩니다)', FormApp.PageNavigationType.SUBMIT),
  ]);

  // 2페이지: 질문 5개. 1~4는 필수, 5는 선택.
  form.addPageBreakItem().setTitle('우니스를 써 보신 경험을 알려 주세요');
  choice(
    form,
    '1. 평소 학업 일정과 할 일을 한곳에 정리할 필요를 느끼시나요?',
    ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '전혀 그렇지 않다'],
  );
  choice(form, '2. 우니스는 사용하기 편리하셨나요?', ['매우 편리했다', '편리했다', '보통이었다', '불편했다', '매우 불편했다']);
  choice(form, '3. 가장 마음에 드신 기능은 무엇인가요?', FAVORITE_FEATURES);
  choice(form, '4. 앞으로 추가되면 가장 도움이 될 것 같은 기능은 무엇인가요?', WISHED_FEATURES).showOtherOption(true);
  form
    .addParagraphTextItem()
    .setTitle('5. 저희에게 하고 싶은 말씀이나 우니스에 대한 평가를 자유롭게 적어 주세요.')
    .setRequired(false);
}

function choice(form, title, options) {
  return form.addMultipleChoiceItem().setTitle(title).setChoiceValues(options).setRequired(true);
}

function logUrls(form) {
  Logger.log('응답 주소 (참가자에게 보내기): ' + form.getPublishedUrl());
  Logger.log('편집 주소 (팀만): ' + form.getEditUrl());
}
