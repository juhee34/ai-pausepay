"use client";

import { useState } from "react";
import BottomSheet from "@/components/ui/bottom-sheet";
import Button from "@/components/ui/button";
import { CUSTOM_JOB_MAX, CUSTOM_JOB_MIN, PRESET_JOBS } from "@/lib/competencies";
import {
  MAX_CUSTOM_JOB_NAME,
  addCustomJob,
  removeCustomJob,
  updateCustomJob,
  type CustomJob,
} from "@/lib/custom-job-store";
import { customTargetJob, setTargetJob } from "@/lib/target-job-store";
import CompetencyPicker, { jobSkillGroups } from "../receipts/competency-picker";
import { receiptInputClass } from "../receipts/input-class";

// 목록에 없는 직무를 만든다. 이름과 필요한 역량 6~10개를 버튼으로 고른다. AI를 쓰지 않는다.
export default function CustomJobSheet({ job, onClose }: { job?: CustomJob; onClose: () => void }) {
  const [name, setName] = useState(job?.name ?? "");
  const [competencies, setCompetencies] = useState<string[]>(job?.competencies ?? []);
  const canSave =
    name.trim() !== "" && competencies.length >= CUSTOM_JOB_MIN && competencies.length <= CUSTOM_JOB_MAX;

  return (
    <BottomSheet open onClose={onClose} title={job ? "직무 고치기" : "직무 만들기"}>
      <p className="-mt-1 text-[13px] leading-relaxed text-muted">
        준비하는 직무에 필요한 역량을 {CUSTOM_JOB_MIN}~{CUSTOM_JOB_MAX}개 골라 주세요. 채용 공고의 자격 요건·우대 사항을
        보며 고르면 좋아요.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSave) return;
          const fields = { name, competencies };
          if (job) {
            updateCustomJob(job.id, fields);
          } else {
            setTargetJob(customTargetJob(addCustomJob(fields)));
          }
          onClose();
        }}
        className="mt-3 space-y-4"
      >
        <label className="block text-[13px] font-semibold">
          직무 이름
          <input
            value={name}
            maxLength={MAX_CUSTOM_JOB_NAME}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 인사(HR), 영업 관리, UX 디자인"
            className={receiptInputClass}
          />
        </label>
        <CompetencyPicker
          legend="필요한 역량"
          value={competencies}
          onChange={setCompetencies}
          max={CUSTOM_JOB_MAX}
          min={CUSTOM_JOB_MIN}
          extraGroups={jobSkillGroups()}
        />
        <Button type="submit" disabled={!canSave} className="w-full">
          {competencies.length < CUSTOM_JOB_MIN
            ? `역량을 ${CUSTOM_JOB_MIN - competencies.length}개 더 골라 주세요`
            : "저장"}
        </Button>
        {job && (
          <Button
            variant="secondary"
            onClick={() => {
              if (!confirm(`'${job.name}' 직무를 지울까요? 영수증은 그대로 남아요.`)) return;
              removeCustomJob(job.id);
              setTargetJob(PRESET_JOBS[0]);
              onClose();
            }}
            className="w-full"
          >
            이 직무 지우기
          </Button>
        )}
      </form>
    </BottomSheet>
  );
}
