import { describe, test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp, Timestamp } from "firebase/firestore";

describe("Firestore: 본인 백업만 허용하고 사용량은 서버만 쓴다", { skip: !process.env.FIRESTORE_EMULATOR_HOST }, () => {
  let environment;
  const backup = (uid = "alice", id = "current") => `users/${uid}/backups/${id}`;
  const payload = () => ({
    version: 1, updatedAt: serverTimestamp(),
    data: { deadlines: [], activities: [], focus: { subjects: [], records: [] }, timetable: [], examResults: [], grades: {}, grading: {}, receipts: [] },
  });
  before(async () => {
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST.split(":");
    environment = await initializeTestEnvironment({
      projectId: "demo-unis-login",
      firestore: { host, port: Number(port), rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
    });
  });
  after(async () => { await environment?.cleanup(); });
  beforeEach(async () => { await environment.clearFirestore(); });

  test("로그인하지 않은 사용자는 백업을 읽거나 쓸 수 없다", async () => {
    const db = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, backup())));
    await assertFails(setDoc(doc(db, backup()), payload()));
  });
  test("본인만 현재 백업을 만들고 수정·조회·삭제할 수 있다", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, backup()), payload()));
    await assertSucceeds(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, grades: { 통계: { target: 85, scores: {} } } } }));
    const saved = await assertSucceeds(getDoc(doc(db, backup())));
    assert.equal(saved.data().version, 1);
    await assertSucceeds(deleteDoc(doc(db, backup())));
  });
  test("다른 사람의 백업 읽기·덮어쓰기·삭제는 거절한다", async () => {
    const alice = environment.authenticatedContext("alice").firestore();
    await setDoc(doc(alice, backup()), payload());
    const bob = environment.authenticatedContext("bob").firestore();
    await assertFails(getDoc(doc(bob, backup())));
    await assertFails(setDoc(doc(bob, backup()), payload()));
    await assertFails(deleteDoc(doc(bob, backup())));
  });
  test("목표 직무는 선택 항목이며 허용한 직무 이름만 백업할 수 있다", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    await assertSucceeds(setDoc(doc(db, backup()), payload()));
    await assertSucceeds(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, targetJob: "데이터 분석" } }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, targetJob: "없는 직무" } }));
    await assertSucceeds(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, semester: { 회계: { credits: 3, grade: "A0" } } } }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, semester: "wrong" } }));
    await assertSucceeds(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, jobPicks: { added: ["재무·회계"], removed: ["마케팅 기획"] } } }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, jobPicks: { added: "wrong", removed: [] } } }));
  });
  test("AI 사용량은 본인만 읽고 화면에서는 아무도 쓰지 못한다", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice/usage/2026-11-03"), { total: 1 });
    });
    const alice = environment.authenticatedContext("alice").firestore();
    const path = "users/alice/usage/2026-11-03";
    await assertSucceeds(getDoc(doc(alice, path)));
    await assertFails(setDoc(doc(alice, path), { total: 0 }));
    await assertFails(deleteDoc(doc(alice, path)));
    await assertFails(getDoc(doc(environment.authenticatedContext("bob").firestore(), path)));
  });
  test("원본 자료 필드·진행 중 타이머·임의 문서는 백업으로 받지 않는다", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, backup()), { ...payload(), originalFile: "not-allowed" }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, rawImage: "not-allowed" } }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, focus: { subjects: [], records: [], session: null } } }));
    await assertFails(setDoc(doc(db, backup("alice", "arbitrary")), payload()));
    await assertFails(getDoc(doc(db, "calendarSubscriptions/test-token")));
    await assertFails(setDoc(doc(db, "users/alice"), { role: "admin" }));
  });
  test("틀린 버전·임의 저장 시각·데이터 형식은 거절한다", async () => {
    const db = environment.authenticatedContext("alice").firestore();
    await assertFails(setDoc(doc(db, backup()), { ...payload(), version: 2 }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), updatedAt: Timestamp.fromMillis(0) }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, grading: "wrong" } }));
    await assertFails(setDoc(doc(db, backup()), { ...payload(), data: { ...payload().data, receipts: "wrong" } }));
  });
});
