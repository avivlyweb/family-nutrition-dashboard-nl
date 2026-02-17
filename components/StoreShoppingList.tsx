import type { ShoppingItem, Store } from "@/lib/types";

interface Props {
  list: Record<Store, ShoppingItem[]>;
}

function storeTitle(store: Store): string {
  return store === "jumbo" ? "Jumbo Hoofddorp" : "Lidl Hoofddorp";
}

export function StoreShoppingList({ list }: Props) {
  return (
    <section className="rounded-xl2 border border-ring/20 bg-card/50 p-4">
      <h3 className="text-sm uppercase tracking-[0.16em] text-accentSoft">Boodschappen per winkel</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {(Object.keys(list) as Store[]).map((store) => (
          <article key={store} className="rounded-lg border border-ring/10 bg-panel/55 p-3">
            <h4 className="font-semibold">{storeTitle(store)}</h4>
            <ul className="mt-2 space-y-1 text-sm text-text/90">
              {list[store].map((item) => (
                <li key={item.productId}>
                  • {item.name} ({item.quantity} {item.unit})
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
