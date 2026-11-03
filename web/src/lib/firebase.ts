"use client";

import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// NEXT_PUBLIC 값은 Next.js가 빌드할 때 넣는다. 값이 없으면 로그인만 준비 중으로 둔다.
// 서버용 비밀 키나 Google 캘린더 권한은 사용하지 않는다.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured() {
  return Object.values(config).every((value) => Boolean(value?.trim()));
}

function getFirebaseApp(): FirebaseApp | null {
  if (typeof window === "undefined" || !isFirebaseConfigured()) return null;
  // 앱을 여러 번 초기화하지 않는다. 다른 Firebase 앱과도 설정이 섞이지 않게 이름을 둔다.
  return getApps().find((app) => app.name === "unis") ?? initializeApp(config, "unis");
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  const auth = getAuth(app);
  auth.languageCode = "ko";
  return auth;
}

// B의 계정 백업이 사용한다. 이 함수만 부르면 데이터를 올리거나 받지는 않는다.
export function getFirebaseDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}
