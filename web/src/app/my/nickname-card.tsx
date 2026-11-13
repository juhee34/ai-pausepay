"use client";

import { Mic } from "lucide-react";
import { useState } from "react";
import Block from "@/components/ui/block";
import Button from "@/components/ui/button";
import { saveNickname, useNickname } from "@/lib/nickname-store";
import { MAX_NICKNAME } from "@/lib/voice-script";

// 홈 로고를 눌렀을 때 우니스가 불러 줄 이름. 이 기기에만 저장한다.
export default function NicknameCard() {
  const saved = useNickname();
  const [draft, setDraft] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const value = draft ?? saved;
  const changed = value.trim() !== saved;

  return (
    <Block className="mt-2.5">
      <div className="flex items-center gap-2">
        <Mic size={19} strokeWidth={1.8} aria-hidden="true" className="text-muted" />
        <h2 className="text-[15px] font-bold">불러 줄 이름</h2>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        홈의 UNIS 로고를 누르면 우니스가 이 이름을 부르고 오늘 할 일을 말로 알려 줘요. 비워 두면 Google 계정 이름으로 불러요.
      </p>
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveNickname(value);
          setDraft(null);
          setDone(true);
        }}
      >
        {/* 글자가 16px보다 작으면 아이폰이 입력할 때 화면을 확대한다. */}
        <input
          aria-label="불러 줄 이름"
          value={value}
          maxLength={MAX_NICKNAME}
          placeholder="예: 다희"
          onChange={(e) => {
            setDraft(e.target.value);
            setDone(false);
          }}
          className="min-h-11 min-w-0 flex-1 rounded-button border border-line bg-surface px-3.5 py-2.5 text-base text-ink outline-none focus:border-brand"
        />
        <Button type="submit" variant="secondary" disabled={!changed} className="shrink-0">
          저장
        </Button>
      </form>
      <p role="status" className="mt-1.5 min-h-4 text-xs text-muted">
        {done ? (saved ? `이제 '${saved}님'이라고 불러요.` : "이름 없이 불러요.") : `${MAX_NICKNAME}자까지 · 이 기기에만 저장돼요`}
      </p>
    </Block>
  );
}
