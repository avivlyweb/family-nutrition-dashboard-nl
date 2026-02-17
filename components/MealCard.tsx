import type { MealOption, ProductItem } from "@/lib/types";

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

export function MealCard({ meal, productsById }: Props) {
  return (
    <article className="rounded-xl2 border border-ring/20 bg-panel/60 p-3">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-accentSoft">{TITLE[meal.mealType]}</h4>
      <ul className="mt-2 space-y-1 text-sm text-text/90">
        {meal.items.map((id) => {
          const product = productsById.get(id);
          return <li key={id}>• {product?.name ?? id}</li>;
        })}
      </ul>
      <div className="mt-2 text-xs text-muted">
        {Object.entries(meal.portions).map(([k, v]) => (
          <p key={k}>
            {k}: {v}
          </p>
        ))}
      </div>
      {meal.notes ? <p className="mt-2 text-xs text-accentSoft">{meal.notes}</p> : null}
    </article>
  );
}
