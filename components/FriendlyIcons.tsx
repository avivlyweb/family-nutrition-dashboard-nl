import type { MealOption, WorkoutType } from "@/lib/types";

type MealType = MealOption["mealType"];

export function MealIcon({ type }: { type: MealType }) {
  if (type === "ontbijt") {
    return (
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#164e63" />
        <circle cx="32" cy="32" r="11" fill="#fef08a" />
        <path d="M14 42h36v6H14z" fill="#f8fafc" />
      </svg>
    );
  }

  if (type === "lunch") {
    return (
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
        <rect x="6" y="8" width="52" height="48" rx="14" fill="#14532d" />
        <rect x="16" y="20" width="32" height="8" rx="4" fill="#fde68a" />
        <rect x="16" y="34" width="32" height="8" rx="4" fill="#86efac" />
      </svg>
    );
  }

  if (type === "snack") {
    return (
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#92400e" />
        <path d="M20 18h24v28H20z" fill="#fed7aa" />
        <circle cx="26" cy="28" r="3" fill="#ea580c" />
        <circle cx="38" cy="28" r="3" fill="#ea580c" />
        <circle cx="32" cy="36" r="3" fill="#ea580c" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
      <rect x="4" y="8" width="56" height="48" rx="14" fill="#5b21b6" />
      <rect x="12" y="16" width="40" height="32" rx="10" fill="#d8b4fe" />
      <circle cx="22" cy="32" r="5" fill="#16a34a" />
      <circle cx="42" cy="32" r="5" fill="#f59e0b" />
    </svg>
  );
}

export function WorkoutIcon({ type }: { type: WorkoutType }) {
  if (type === "hiit") {
    return (
      <svg viewBox="0 0 64 64" className="h-4 w-4" aria-hidden="true">
        <rect x="6" y="6" width="52" height="52" rx="12" fill="#9f1239" />
        <path d="M28 12h8l-4 16h12L30 52l4-16H22z" fill="#fecdd3" />
      </svg>
    );
  }

  if (type === "run") {
    return (
      <svg viewBox="0 0 64 64" className="h-4 w-4" aria-hidden="true">
        <rect x="6" y="6" width="52" height="52" rx="12" fill="#155e75" />
        <circle cx="35" cy="17" r="6" fill="#67e8f9" />
        <path d="M20 44l10-12 8 4 7 10h-8l-5-7-6 7z" fill="#67e8f9" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 64 64" className="h-4 w-4" aria-hidden="true">
      <rect x="6" y="6" width="52" height="52" rx="12" fill="#166534" />
      <path d="M18 36c0-8 6-14 14-14h3v-6h7v6h4v5h-4v9H32c-4 0-7 3-7 7v5h-7v-6c0-3 1-5 3-7-2-2-3-4-3-7z" fill="#bbf7d0" />
    </svg>
  );
}
