import type {
  Category,
  MealOption,
  NutritionTip,
  TimeOfDay,
  TipType,
  WorkoutType,
} from "@/lib/types";

export interface TipContext {
  workoutType: WorkoutType;
  nextMealType: MealOption["mealType"];
  /** All categories present in today's meals */
  todayCategories: Category[];
  energy: number;
  hour: number;
}

function currentTimeOfDay(hour: number): TimeOfDay {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Score a single tip against the current dashboard context.
 * Higher score = more relevant to the user right now.
 */
function scoreTip(tip: NutritionTip, ctx: TipContext): number {
  const t = tip.triggers;
  let score = 0;

  // Workout type match (+3 — strongest signal)
  if (t.workoutTypes?.includes(ctx.workoutType)) {
    score += 3;
  }

  // Next meal type match (+2)
  if (t.mealTypes?.includes(ctx.nextMealType)) {
    score += 2;
  }

  // Category overlap with today's meals (+1 per matching category, max 3)
  if (t.categories) {
    const overlap = t.categories.filter((c) => ctx.todayCategories.includes(c)).length;
    score += Math.min(overlap, 3);
  }

  // Energy range match (+2 when user energy falls within the tip's target range)
  if (t.energyRange) {
    const [lo, hi] = t.energyRange;
    if (ctx.energy >= lo && ctx.energy <= hi) {
      score += 2;
    }
  }

  // Time of day match (+1)
  if (t.timeOfDay?.includes(currentTimeOfDay(ctx.hour))) {
    score += 1;
  }

  return score;
}

/**
 * Return the top N most-relevant tips, with at most one per TipType to ensure variety.
 * Falls back to the highest-scoring tips overall if deduplication leaves gaps.
 */
export function matchTips(
  allTips: NutritionTip[],
  ctx: TipContext,
  count: number = 3,
): NutritionTip[] {
  const scored = allTips
    .map((tip) => ({ tip, score: scoreTip(tip, ctx) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  // Pick top tip per type first to guarantee variety
  const seen = new Set<TipType>();
  const picked: NutritionTip[] = [];

  for (const { tip } of scored) {
    if (picked.length >= count) break;
    if (!seen.has(tip.type)) {
      seen.add(tip.type);
      picked.push(tip);
    }
  }

  // If we still have slots, fill with remaining high-scorers
  if (picked.length < count) {
    const pickedIds = new Set(picked.map((t) => t.id));
    for (const { tip } of scored) {
      if (picked.length >= count) break;
      if (!pickedIds.has(tip.id)) {
        picked.push(tip);
        pickedIds.add(tip.id);
      }
    }
  }

  return picked;
}
