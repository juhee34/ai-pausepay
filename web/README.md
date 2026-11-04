# 우니스 (web)

대학생을 위한 AI 학업 비서 우니스의 웹앱입니다. Next.js(App Router) + Tailwind CSS로 만든
모바일 반응형 웹앱이며, Claude API를 사용합니다.

## 시작하기

```bash
npm install
# .env.local 파일을 만들고 아래 환경변수 값을 채우기
npm run dev
```

http://localhost:3000 에서 확인합니다.

## 환경변수

`.env.local`을 만들고 아래 값을 채워야 합니다. 이 파일은 `.gitignore`에 포함되어 있어
커밋되지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude API 키 ([console.anthropic.com](https://console.anthropic.com)) |
| `AI_LIMIT_SECRET` | 하루 AI 사용 횟수 쿠키의 서명값. 긴 무작위 문자열 |

`AI_LIMIT_SECRET` 값은 아래 명령으로 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

배포 시에는 Vercel 프로젝트 Settings → Environment Variables에 같은 이름으로 등록하고,
Save 후 Redeploy까지 해야 적용됩니다.

## 폴더 구조

```
src/
  app/
    page.tsx              # 오늘의 브리핑 (홈)
    calendar/             # 강의계획서 → 캘린더
    exam/                 # 시험 대비 팩
    mail/                 # 교수님 메일 작성기
    api/                  # AI를 부르는 서버 코드 (briefing, exam, mail, syllabus)
  lib/
    claude.ts             # Claude API 클라이언트 (getAnthropic())
    ai-limit.ts           # 하루 AI 사용 횟수 제한
```

## 스크립트

```bash
npm run dev     # 개발 서버
npm run build   # 프로덕션 빌드
npm run start   # 빌드 결과 실행
npm run lint    # ESLint 검사
```

기능 범위는 저장소 루트의 [docs/PRD.md](../docs/PRD.md), 역할과 Git 협업 규칙은
[docs/역할분담.md](../docs/역할분담.md)를 참고하세요.

## Google 로그인 연결 (A)

로그인은 선택입니다. 설정이 없어도 기존 기능은 열리며, `/my`의 로그인만 준비 중으로 표시됩니다.
로그인·로그아웃은 기기에 저장한 일정·시간표·점수·집중 기록을 옮기거나 지우지 않습니다.

1. [Firebase 콘솔](https://console.firebase.google.com/)에서 프로젝트를 만들고 Google Analytics는 끕니다. 무료 Spark로 시작할 수 있습니다.
2. 보안 → Authentication → 로그인 방법에서 Google을 켭니다. 지원 이메일은 로그인 안내 화면에 표시될 수 있는 문의 주소입니다.
3. 프로젝트 개요 → 앱 추가 → 웹(`</>`)에서 `unis-web`을 등록합니다. Firebase Hosting은 선택하지 않습니다.
4. 아래 네 값을 `web/.env.local`의 기존 AI 설정 아래에 추가합니다. 값은 콘솔의 `firebaseConfig`에서 복사합니다. 채팅이나 커밋에는 넣지 않습니다.

```dotenv
# firebaseConfig.apiKey
NEXT_PUBLIC_FIREBASE_API_KEY=
# firebaseConfig.authDomain
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
# firebaseConfig.projectId
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
# firebaseConfig.appId
NEXT_PUBLIC_FIREBASE_APP_ID=
```

5. Authentication → 설정 → 승인된 도메인에 실제 우니스 도메인을 등록합니다. 현재 운영 주소는 `unis-murex.vercel.app`입니다. 로컬 테스트에 쓸 `localhost`도 직접 추가합니다. 미리보기에서 시험하면 해당 미리보기 호스트도 추가합니다. `https://`와 경로는 넣지 않습니다.
6. `npm run dev`를 다시 시작합니다. Vercel에는 같은 네 값을 환경 변수로 등록하고 새로 배포해야 반영됩니다(`NEXT_PUBLIC_` 값은 빌드할 때 고정).
7. 하단 마이페이지 탭에서 로그인·새로고침·로그아웃을 확인합니다. 실제 Google 로그인은 아이폰 사파리와 안드로이드 크롬 모두에서 확인합니다. 카카오톡 안의 브라우저 대신 사파리·크롬으로 엽니다.

팝업으로 로그인하며 캘린더 권한은 추가하지 않습니다. 팝업 취소·차단·네트워크 오류를 화면에 안내합니다. 앱 코드가 Google 접근 토큰을 별도 저장하지 않습니다. Firebase SDK가 로그인 상태를 관리합니다.

공식 문서: [Google 로그인](https://firebase.google.com/docs/auth/web/google-signin), [팝업 방식](https://firebase.google.com/docs/auth/web/redirect-best-practices#option_2_switch_to_signinwithpopup), [승인 도메인](https://firebase.google.com/docs/auth/faq-and-troubleshooting).

## Firestore 구조 — B 확인 후 계정 백업 연결

이번 단계는 로그인과 경로·규칙 준비까지입니다. 계정 백업(⑬), AI 사용량(⑫), ICS 구독은 별도 작업이며 로그인만으로 데이터가 업로드되지 않습니다.

| 경로 | 화면에서 접근 | 담당·용도 |
|---|---|---|
| `users/{uid}/backups/current` | 본인만 읽기·쓰기·삭제 | B: 정리된 데이터 백업 하나 |
| `users/{uid}/usage/{YYYY-MM-DD}` | 본인 읽기만, 쓰기 금지 | A: 서버가 기록하는 AI 사용 횟수 |
| 그 외 경로 | 금지 | 비밀 토큰 등은 서버 코드에서만 |

`uid`는 `useAccount().user.uid`를 사용합니다. 임의로 입력받은 사용자 ID로 접근하지 않습니다.
`getFirebaseDb()`와 `accountBackupPath(uid)`를 재사용합니다. 서버에 로그인 증명이 필요하면 `getFirebaseIdToken()`으로 가져오고, 서버에서는 `firebase-admin`으로 검증해야 합니다. 토큰 자체를 별도 저장하거나 로그로 남기지 않습니다.

백업 문서 형식은 아래와 같습니다. B가 기존 `backup.ts`의 검사를 거친 **정리된 값만 골라** `data`에 넣습니다. 원본 파일·이미지·메일 초안·AI에 보낸 자료·진행 중 타이머는 넣지 않습니다.

```ts
{
  version: 1,
  updatedAt: serverTimestamp(),
  data: {
    deadlines: [], activities: [], timetable: [], examResults: [], receipts: [],
    focus: { subjects: [], records: [] },
    grades: {}, grading: {}
  }
}
```

`firestore.rules`는 본인 uid와 문서 형식을 검사합니다. 사용량은 클라이언트가 쓸 수 없습니다.
Firebase 콘솔에서 Firestore 데이터베이스를 만들 때 테스트 모드로 열어 두지 말고, **백업 연결 전에 이 규칙을 적용**합니다. 현재 인증만 사용하는 데에는 Firestore 생성이 필수는 아닙니다.

접근 규칙은 [Firebase 공식 규칙 안내](https://firebase.google.com/docs/firestore/security/rules-conditions)를 참고했습니다. 서버 Admin SDK는 규칙을 우회하므로 서버에서도 uid 검증이 필수입니다.

## 계정 기능 검사

```bash
node --test tests/firebase-auth.test.mjs
# 실제 프로젝트 대신 demo 프로젝트의 로컬 Firestore에서 접근 규칙 검사
npx firebase-tools emulators:exec --only firestore --project demo-unis-login "node --test tests/firestore-rules.test.mjs"
```

규칙 검사는 Java가 필요합니다. 로그인 화면은 Firebase 설정 없이도 열려야 하며, 다른 모든 기존 화면도 로그인 없이 동작해야 합니다.

## AI 사용량 마이페이지 (A)

`/my`에서 로그인 계정의 오늘·이번 주 기능별 사용 횟수와 오늘 남은 횟수를 봅니다.
7개 AI 기능(강의계획서·시간표·브리핑·시험 대비·메일·취준 일정·영수증)이 한도를 함께 씁니다.
한국 시간 자정에 일별 한도가 새로 시작하고, 이번 주는 월요일부터 합산합니다.
로그인 전 기기 사용량은 계정 기록에 합치지 않습니다. 비로그인은 기존 기기별 서명 쿠키를 유지합니다.

### 서버 설정 — 로그인용 네 값과 별개

프로젝트에 `firebase-admin`을 추가했습니다. Node.js 22 이상이 필요합니다.
기존 브라우저용 Firebase 설정 네 값만으로는 서버가 Firestore에 기록할 수 없습니다.
아래 설정은 **프로젝트의 `web/.env.local`과 Vercel 환경 변수에만** 넣습니다.
Windows 전역 환경 변수·CLI 전역 로그인·전역 설치는 필요하지 않습니다.

1. 기존 로그인과 **같은 Firebase 프로젝트**에서 Firestore 기본 데이터베이스를 생성합니다. 테스트 모드로 열어 두지 말고 기존 `firestore.rules`를 적용합니다. 사용량은 본인만 읽고 화면에서 쓰지 못하는 규칙을 그대로 씁니다.
2. Firebase 프로젝트 설정 → 서비스 계정에서 서버용 비공개 키를 발급합니다. JSON의 세 항목을 아래 이름으로 옮깁니다. JSON 파일은 저장소 밖에 보관하며 코드·채팅·스크린샷에 넣지 않습니다.

| 환경 변수 이름 | 서비스 계정 JSON 항목 |
|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | `project_id` (브라우저용 프로젝트와 같아야 함) |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | `client_email` |
| `FIREBASE_ADMIN_PRIVATE_KEY` | `private_key` |

비공개 키는 실제 줄바꿈 또는 `\n` 표기를 지원합니다. `.env.local`에 넣을 때는 값 전체를 큰따옴표로 감쌉니다.
서버 변수에는 `NEXT_PUBLIC_`을 붙이지 않습니다. Vercel에는 필요한 배포 환경에 같은 이름으로 등록하고 **새로 배포**합니다. 로컬은 개발 서버를 다시 시작합니다.
이 작업에서 실제 환경 변수 값이나 Firebase 콘솔 설정은 변경하지 않았습니다.

### 저장하는 것과 횟수 계산

- `users/{uid}/usage/{YYYY-MM-DD}`에 `counts`(기능별 성공 횟수)와 `pending`(무작위 요청 번호·예약 만료 시각)만 저장합니다. 이름·이메일·입력 글·원본 파일·AI 답변은 사용량 문서에 넣지 않습니다.
- 서버가 Firebase ID 토큰을 검증해 얻은 uid만 사용합니다. 화면이 보낸 uid는 받지 않으며, 로그인 증명이 잘못되면 익명 요청으로 우회하지 않습니다.
- 트랜잭션으로 성공 횟수와 진행 중 예약의 합이 하루 20회를 넘지 않게 합니다. 일반 AI 오류·검증 실패는 성공 횟수에 넣지 않습니다. 강제 종료된 예약은 2분 뒤 다음 요청에서 회수합니다.
- 메일은 기존 방식대로 스트리밍 연결이 시작되면 1회로 셉니다. 전송 중 중단도 포함합니다. 다른 기능은 정상 결과를 만들었을 때 1회로 셉니다.
- 사용량 저장 결과가 불명확한 장애에서는 성공 결과 대신 오류를 안내하고 임시 예약을 만료까지 유지합니다. 장애 중에는 AI 성공 횟수가 누락될 수 있으며, 계정별 조회·기록에 실패했다고 비로그인 한도로 전환하지 않습니다.
- 서버 설정이 없거나 Firestore에 연결하지 못하면 로그인 사용자의 AI 요청·사용량 조회는 준비 중 또는 오류로 안내합니다. 비로그인 기능은 기존대로 동작합니다.
- 마이페이지 진입·사용량 새로고침·화면 복귀 때 조회합니다. 다른 폰에서 확인할 때도 새로고침을 누릅니다. 사용량 API 응답은 캐시하지 않습니다.

### 검사와 휴대폰 확인

`web` 폴더에서 다음 명령은 실계정·AI 없이 날짜 경계, 계정 분리, 동시 예약 제한, 성공·실패·예외 처리와 기존 로그인을 검사합니다.

```bash
node --test tests/ai-usage.test.mjs tests/firebase-auth.test.mjs tests/syllabus-grading.test.mjs
npm run lint
npx tsc --noEmit
```

메모리 저장소 테스트는 실제 Firestore 연결 검사를 대신하지 않습니다.

실제 로컬 Firestore에서도 검사하려면 에뮬레이터를 실행한 상태에서 `FIRESTORE_EMULATOR_HOST`를 해당 명령에만 지정합니다. 기본 포트는 `firebase.json`의 8089입니다. Java가 필요하며, 기존 계정 기능 검사와 같은 demo 프로젝트를 사용합니다. 아래 명령은 테스트용 데이터를 로컬에 만들고 검사한 뒤 에뮬레이터를 종료합니다.

```bash
npx firebase-tools emulators:exec --only firestore --project demo-unis-login "node --test --test-concurrency=1 tests/ai-usage.test.mjs tests/firestore-rules.test.mjs"
```

`--test-concurrency=1`은 규칙 검사의 데이터 초기화가 사용량 검사와 겹치지 않도록 파일을 순서대로 실행합니다. 에뮬레이터 없이 실행하면 실제 Firestore 검사 한 항목만 건너뜁니다.

배포 후 확인 순서:

1. 같은 계정으로 로그인하고 AI 기능을 한 번 사용합니다. 마이페이지를 열어 해당 기능의 오늘·이번 주 숫자가 1씩 늘고 남은 횟수가 줄었는지 봅니다.
2. 다른 폰에서 같은 계정으로 로그인하고 사용량을 새로고침해 같은 숫자인지 봅니다.
3. 다른 계정으로 바꾸면 이전 계정의 숫자가 보이지 않는지 확인합니다.
4. 비로그인으로 기존 기능을 확인합니다. 하루 제한·실패·동시 요청은 `docs/폰검증-체크리스트.md`에도 결과를 기록합니다.

최종 완료는 실제 Firebase 설정 후 배포 주소에서 두 폰으로 확인한 때입니다.
연결 방식 참고: [Admin SDK 설정](https://firebase.google.com/docs/admin/setup), [ID 토큰 검증](https://firebase.google.com/docs/auth/admin/verify-id-tokens), [Firestore 트랜잭션](https://firebase.google.com/docs/firestore/manage-data/transactions).

## 개발 환경 변경과 프로젝트 종료 시 정리

이 계정 기능 작업은 프로젝트 안에 Firebase 패키지·테스트 도구·설정 파일을 추가했습니다.
명령 실행 과정에서 npm 캐시, 빌드 결과(`web/.next`), Firebase 에뮬레이터 다운로드·로그가 생길 수 있습니다.
에뮬레이터는 실제 계정 대신 `demo-unis-login`으로만 검사하며, 실행 후 종료합니다.
Java는 이미 설치되어 있던 Android Studio의 실행 환경을 사용합니다. 검사 명령의 `JAVA_HOME`·`PATH` 지정은 그 실행에만 적용하며 Windows의 영구 환경변수는 변경하지 않습니다.
방화벽·백신·자동 시작 설정을 변경하거나 시스템 전체에 패키지를 설치하는 명령은 이 작업에 포함되지 않습니다.

로컬 실행도 모든 정보가 기기 안에만 머문다는 뜻은 아닙니다. Google/Firebase는 로그인에 필요한 계정·인증 정보를 처리합니다.
Codex 등 온라인 개발 도구에도 작업을 위해 읽은 코드 일부, 대화, 화면·도구 결과가 전달될 수 있습니다.
이번 앱 코드는 로그인만으로 일정·점수·원본 파일을 Firestore에 업로드하지 않습니다.
로컬 파일을 지워도 이미 전달된 외부 서비스 기록까지 자동으로 삭제되지는 않습니다.

종료할 때는 아래 항목을 하나씩 확인합니다. 현재는 정리 방법을 기록한 것이며, 데이터 삭제를 자동 실행하지 않습니다.

1. 켜 둔 개발 서버를 종료합니다. 임시 서버는 컴퓨터 재시작 시 자동 실행하도록 등록하지 않았습니다. 같은 Wi-Fi 테스트가 필요하지 않으면 개발 서버를 `npm run dev -- --hostname 127.0.0.1`로 실행해 이 컴퓨터에서만 접속하게 할 수 있습니다.
2. 필요한 소스와 사용자 기록을 먼저 백업한 뒤, 이 프로젝트의 `web/node_modules`, `.next`, 에뮬레이터 로그 등 다시 만들 수 있는 결과물을 정리합니다.
3. npm·Firebase 캐시는 다른 프로젝트도 함께 쓸 수 있으므로 공용 캐시 전체를 임의로 지우지 않고, 이 작업에서 만든 항목을 확인한 뒤 정리합니다.
4. 이 앱에서 로그아웃하고 필요하면 **우니스 사이트의 저장 데이터만** 지웁니다. 일정·점수 등도 함께 지워질 수 있으므로 내보내기를 먼저 합니다. Google 계정에 우니스 연결이 등록됐다면 필요 시 그 연결도 해제합니다.
5. 프로젝트를 폐기할 경우 Firebase의 계정·프로젝트 데이터, Vercel 배포와 환경변수, GitHub 저장소는 각각 별도로 확인·정리합니다. 개인 Google 계정 자체를 삭제할 필요는 없습니다.
6. Codex에서 이 프로젝트에 저장한 항상 허용 규칙이나 앱 접근 권한이 있다면 해당 권한을 다시 확인합니다. 사용자 승인으로 저장된 권한은 일반 Windows 설정과 구분됩니다.

작업 전 시스템 전체의 복원 이미지를 만든 것은 아니므로 모든 임시 기록까지 작업 전과 완전히 동일하다고 보장할 수는 없습니다. 프로젝트 변경과 실행 기록을 기준으로 범위를 확인하며 정리합니다.

다른 Codex 앱에서 이어갈 때는 이 저장소 폴더를 열고 `CLAUDE.md`, `web/AGENTS.md`, 최신 `docs/역할분담.md`, 이 README를 먼저 읽도록 합니다. 같은 폴더의 `.env.local`은 그대로 쓰되, 다른 폴더로 새로 복제하면 Git에 없는 설정값을 별도로 준비해야 합니다. 개발 도구를 바꿔도 웹앱의 실제 AI 연결은 `src/lib/claude.ts`의 Anthropic SDK를 유지합니다.

개인정보·승인 안내: [로컬 작업의 데이터 처리](https://learn.chatgpt.com/docs/enterprise/chatgpt-work-local-security), [Codex 승인과 접근 범위](https://learn.chatgpt.com/docs/agent-approvals-security).
