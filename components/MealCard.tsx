import type { MealOption, ProductItem } from "@/lib/types";
import { MealIcon } from "@/components/FriendlyIcons";

interface Props {
  meal: MealOption;
  productsById: Map<string, ProductItem>;
}

const TITLE: Record<MealOption["mealType"], string> = {
  ontbijt: "Ontbijt",
  lunch: "Lunch",
  snack: "Snack",
  avondeten: "Avondeten",
};

const TONE: Record<MealOption["mealType"], string> = {
  ontbijt: "border-cyan-400/35 bg-cyan-500/10",
  lunch: "border-emerald-400/35 bg-emerald-500/10",
  snack: "border-amber-400/35 bg-amber-500/10",
  avondeten: "border-violet-400/35 bg-violet-500/10",
};

export function MealCard({ meal, productsById }: Props) {
  const itemsPreview = meal.items.slice(0, 2);
  const extraItems = meal.items.length - itemsPreview.length;

  return (
    <article className={`card-lift rounded-xl2 border border-ring/20 bg-panel/60 p-3 ${TONE[meal.mealType]}`}>
      <div className="flex items-center gap-2">
        <MealIcon type={meal.mealType} />
        <h4 className="text-sm font-semibold uppercase tracking-wide text-accentSoft">{TITLE[meal.mealType]}</h4>
      </div>

      <ul className="mt-2 space-y-1 text-sm text-text/90">
        {itemsPreview.map((id) => {
          const product = productsById.get(id);
          return <li key={id}>• {product?.name?.split(" ").slice(0, 4).join(" ") ?? id}</li>;
        })}
        {extraItems > 0 ? <li className="text-xs text-muted">+{extraItems} extra</li> : null}
      </ul>

      <details className="mt-2 text-xs text-muted">
        <summary className="cursor-pointer text-accentSoft">Details</summary>
        <div className="mt-1">
          {Object.entries(meal.portions).map(([k, v]) => (
            <p key={k}>
              {k}: {v}
            </p>
          ))}
        </div>
      </details>

      {meal.notes ? <p className="mt-2 text-xs text-accentSoft">{meal.notes}</p> : null}
    </article>
  );
}
