"use client";

import { useState } from "react";
import type { SavedDeadline } from "@/lib/deadline-store";
import TaskFormSheet, { confirmRemoveTask } from "./task-form-sheet";

export default function TaskActions({ task }: { task: SavedDeadline }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="flex justify-end gap-2">
        <button type="button" aria-label={`${task.title} 수정`} onClick={() => setEditing(true)}
          className="min-h-11 px-3 text-sm font-semibold text-brand">수정</button>
        <button type="button" aria-label={`${task.title} 삭제`} onClick={() => confirmRemoveTask(task)}
          className="min-h-11 px-3 text-sm font-semibold text-review">삭제</button>
      </div>
      {editing && <TaskFormSheet task={task} onClose={() => setEditing(false)} />}
    </>
  );
}
