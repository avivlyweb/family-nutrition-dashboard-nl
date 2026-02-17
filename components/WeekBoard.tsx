import type { ProductItem, WeekPlan } from "@/lib/types";
import { MealCard } from "@/components/MealCard";
import { WorkoutBadge } from "@/components/WorkoutBadge";

interface Props {
  week: WeekPlan;
  products: ProductItem[];
}

export function WeekBoard({ week, products }: Props) {
  const productsById = new Map(products.map((item) => [item.id, item]));

  return (
    <section className="grid-board rounded-[1.25rem] border border-ring/25 bg-panel/45 p-3 sm:p-5">
      <div className="grid gap-4 xl:grid-cols-7">
        {week.days.map((day) => (
          <article key={day.day} className="rounded-xl2 border border-ring/20 bg-card/50 p-3">
            <header className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold capitalize">{day.day}</h3>
              <WorkoutBadge type={day.workoutType} />
            </header>
            <p className="mb-3 text-xs text-muted">Doelband: {day.kcalBand}</p>
            <div className="space-y-2">
              {day.meals.map((meal) => (
                <MealCard key={`${day.day}-${meal.mealType}`} meal={meal} productsById={productsById} />
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
