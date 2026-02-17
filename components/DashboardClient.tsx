"use client";

import { useEffect, useMemo, useState } from "react";
import products from "@/data/products.nl.json";
import { ComplianceMeter } from "@/components/ComplianceMeter";
import { LogoutButton } from "@/components/LogoutButton";
import { PinGate } from "@/components/PinGate";
import { StoreShoppingList } from "@/components/StoreShoppingList";
import { ThreeHero } from "@/components/ThreeHero";
import { WeekBoard } from "@/components/WeekBoard";
import { isSessionUnlocked } from "@/lib/client/pin-auth";
import { generateWeekPlan } from "@/lib/menu/generate-week-plan";
import type { ProductItem } from "@/lib/types";

export function DashboardClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUnlocked(isSessionUnlocked());
    setReady(true);
  }, []);

  const week = useMemo(() => generateWeekPlan(), []);
  const productList = products as ProductItem[];

  if (!ready) {
    return <main className="min-h-screen" />;
  }

  if (!unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <main className="mx-auto max-w-[1600px] space-y-6 px-3 py-4 sm:px-6 sm:py-8">
      <header className="rounded-[1.4rem] border border-ring/25 bg-panel/55 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Familie Planning</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Weekmenu + Beweging (NL)</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">
              Focus: veilig vetverlies met groeiruimte, plus extra koolhydraten op trainingsdagen. Producten zijn gekozen op basis
              van assortimenten bij Jumbo/Lidl (Hoofddorp) met vervangopties.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-400/35 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                Familieprive
              </span>
              <span className="rounded-full border border-cyan-400/35 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                Donkere modus
              </span>
              <LogoutButton />
            </div>
          </div>
          <ThreeHero />
        </div>
      </header>

      <WeekBoard week={week} products={productList} />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <StoreShoppingList list={week.shoppingListByStore} />
        <ComplianceMeter checks={week.complianceChecks} />
      </section>

      <footer className="rounded-xl2 border border-ring/20 bg-card/45 p-4 text-xs text-muted">
        Dit dashboard ondersteunt planning en is geen medisch advies. Bespreek energie-inname bij jongeren altijd met ouder/verzorger en
        een gekwalificeerde professional.
      </footer>
    </main>
  );
}
