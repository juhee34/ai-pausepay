// Firestore의 문서 주소. A(사용량)와 B(계정 백업)가 같은 경로를 쓴다.
function checkUid(uid: string) {
  if (!uid || uid.includes("/")) throw new Error("사용자 정보를 확인해 주세요.");
  return uid;
}

export function accountBackupPath(uid: string) {
  return ["users", checkUid(uid), "backups", "current"] as const;
}

// 쿠키 잔액. 서버(firebase-admin)만 읽고 쓴다. 화면에서 직접 고칠 수 없다.
export function accountWalletPath(uid: string) {
  return ["users", checkUid(uid), "wallet", "cookies"] as const;
}

export function accountUsagePath(uid: string, day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("날짜를 확인해 주세요.");
  return ["users", checkUid(uid), "usage", day] as const;
}
