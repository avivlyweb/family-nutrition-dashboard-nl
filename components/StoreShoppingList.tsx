"use client";

import { useEffect, useMemo, useState } from "react";
import type { ShoppingItem, Store } from "@/lib/types";

interface Props {
  list: Record<Store, ShoppingItem[]>;
}

function storeTitle(store: Store): string {
  return store === "jumbo" ? "Jumbo Hoofddorp" : "Lidl Hoofddorp";
}

export function StoreShoppingList({ list }: Props) {
  const [checked, setChecked] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const jumboItems = useMemo(() => list.jumbo, [list.jumbo]);
  const lidlItems = useMemo(() => list.lidl, [list.lidl]);

  useEffect(() => {
    const saved = window.localStorage.getItem("shopping_checked");
    if (saved) {
      try {
        setChecked(JSON.parse(saved) as string[]);
      } catch {
        setChecked([]);
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("shopping_checked", JSON.stringify(checked));
  }, [checked]);

  function toggleItem(id: string) {
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function copyJumboList() {
    const lines = jumboItems.map((item) => `- ${item.name} (${item.quantity} ${item.unit})`);
    const text = `Jumbo Hoofddorp - Weekboodschappen\n\n${lines.join("\n")}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const doneCount = jumboItems.filter((item) => checked.includes(item.productId)).length;

  return (
    <section className="rounded-xl2 border border-ring/20 bg-card/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm uppercase tracking-[0.16em] text-accentSoft">Boodschappen (Jumbo-focus)</h3>
        <button
          type="button"
          onClick={copyJumboList}
          className="rounded-full border border-ring/30 bg-panel px-3 py-1 text-xs text-text transition hover:border-accent"
        >
          {copied ? "Gekopieerd" : "Kopieer Jumbo lijst"}
        </button>
      </div>

      <article className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold">{storeTitle("jumbo")} - snel mee te nemen</h4>
          <span className="text-xs text-emerald-200">
            {doneCount}/{jumboItems.length} gepakt
          </span>
        </div>
        <ul className="mt-2 space-y-2 text-sm text-text/95">
          {jumboItems.map((item) => {
            const isChecked = checked.includes(item.productId);
            return (
              <li key={item.productId} className="rounded-lg border border-ring/10 bg-panel/55 px-3 py-2">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleItem(item.productId)}
                    className="mt-0.5 accent-emerald-400"
                  />
                  <span className={isChecked ? "text-muted line-through" : ""}>
                    {item.name} ({item.quantity} {item.unit})
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </article>

      <details className="mt-3 rounded-xl border border-ring/20 bg-panel/35 p-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted">Lidl alternatieven (als iets op is bij Jumbo)</summary>
        <ul className="mt-2 space-y-1 text-sm text-text/90">
          {lidlItems.map((item) => (
            <li key={item.productId}>
              • {item.name} ({item.quantity} {item.unit})
            </li>
          ))}
        </ul>
      </details>

      <div className="mt-3 rounded-lg border border-ring/15 bg-panel/45 p-2 text-xs text-muted">
        Tip: start bij zuivel, daarna brood, beleg, groente/fruit en als laatste avondeten producten. Dit bespaart loopwerk in de winkel.
      </div>
    </section>
  );
}
