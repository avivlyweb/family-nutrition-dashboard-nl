"use client";

import { useMemo, useState } from "react";
import type { Category, MealOption, NutritionTip, ProductItem, WorkoutType } from "@/lib/types";
import { matchTips, type TipContext } from "@/lib/tips/match-tips";
import allTipsData from "@/data/tips.nl.json";

const TYPE_BADGE: Record<NutritionTip["type"], { label: string; cls: string }> = {
  voeding: { label: "Voeding", cls: "border-emerald-400/35 bg-emerald-500/20 text-emerald-200" },
  bereiding: { label: "Bereiding", cls: "border-amber-400/35 bg-amber-500/20 text-amber-200" },
  training: { label: "Training", cls: "border-cyan-400/35 bg-cyan-500/20 text-cyan-200" },
};

const GRADE_CLS: Record<NutritionTip["evidenceGrade"], string> = {
  A: "text-emerald-300",
  B: "text-sky-300",
  C: "text-orange-300",
};

interface Props {
  workoutType: WorkoutType;
  nextMealType: MealOption["mealType"];
  todayMeals: MealOption[];
  products: ProductItem[];
  energy: number;
}

export function TipsPanel({ workoutType, nextMealType, todayMeals, products, energy }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const tips = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const todayCategories = new Set<Category>();
    for (const meal of todayMeals) {
      for (const id of meal.items) {
        const product = productMap.get(id);
        if (product) todayCategories.add(product.category);
      }
    }

    const ctx: TipContext = {
      workoutType,
      nextMealType,
      todayCategories: [...todayCategories],
      energy,
      hour: new Date().getHours(),
    };

    return matchTips(allTipsData as NutritionTip[], ctx, 3);
  }, [workoutType, nextMealType, todayMeals, products, energy]);

  if (tips.length === 0) return null;

  return (
    <section className="rounded-[1.25rem] border border-ring/25 bg-panel/45 p-3 sm:p-5">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Tips &amp; Tricks</p>
        <span className="text-xs text-muted">{collapsed ? "Toon" : "Verberg"}</span>
      </button>

      {!collapsed && (
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {tips.map((tip) => {
            const badge = TYPE_BADGE[tip.type];
            return (
              <article
                key={tip.id}
                className="card-lift rounded-xl2 border border-ring/20 bg-card/50 p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}
                  >
                    {badge.label}
                  </span>
                  <span className={`ml-auto text-[10px] font-semibold ${GRADE_CLS[tip.evidenceGrade]}`}>
                    Bewijs: {tip.evidenceGrade}
                  </span>
                </div>
                <h4 className="mt-2 text-sm font-semibold">{tip.title}</h4>
                <p className="mt-1 text-xs leading-relaxed text-muted">{tip.body}</p>
                <p className="mt-2 text-[10px] text-muted/60">{tip.source}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
