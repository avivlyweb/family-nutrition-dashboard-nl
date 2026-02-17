import type { WorkoutType } from "@/lib/types";

const LABEL: Record<WorkoutType, string> = {
  hiit: "HIIT",
  run: "Run",
  rest: "Rust",
};

const CLASS_BY_TYPE: Record<WorkoutType, string> = {
  hiit: "bg-rose-500/20 text-rose-200 border-rose-400/35",
  run: "bg-cyan-500/20 text-cyan-200 border-cyan-400/35",
  rest: "bg-emerald-500/20 text-emerald-200 border-emerald-400/35",
};

export function WorkoutBadge({ type }: { type: WorkoutType }) {
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${CLASS_BY_TYPE[type]}`}>{LABEL[type]}</span>;
}
