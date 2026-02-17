"use client";

import { useEffect, useMemo, useState } from "react";
import products from "@/data/products.nl.json";
import { ComplianceMeter } from "@/components/ComplianceMeter";
import { LogoutButton } from "@/components/LogoutButton";
import { PinGate } from "@/components/PinGate";
import { StoreShoppingList } from "@/components/StoreShoppingList";
import { ThreeHero } from "@/components/ThreeHero";
import { WeekBoard } from "@/components/WeekBoard";
import { MealIcon } from "@/components/FriendlyIcons";
import { isSessionUnlocked } from "@/lib/client/pin-auth";
import { generateWeekPlan } from "@/lib/menu/generate-week-plan";
import type { ProductItem } from "@/lib/types";

type ProfileMode = "focus" | "balanced" | "calm";

const MODE_LABEL: Record<ProfileMode, string> = {
  focus: "Strak schema",
  balanced: "Gebalanceerd",
  calm: "Rustige week",
};

const MODE_TEXT: Record<ProfileMode, string> = {
  focus: "Accent op structuur en trainingsmomenten.",
  balanced: "Stabiel tempo met ruimte voor flexibiliteit.",
  calm: "Minder prikkels, duidelijk en overzichtelijk.",
};

const MODE_ACCENT: Record<ProfileMode, string> = {
  focus: "30 87% 58%",
  balanced: "164 64% 47%",
  calm: "201 90% 58%",
};

export function DashboardClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<ProfileMode>("balanced");
  const [energy, setEnergy] = useState(72);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [juniorMode, setJuniorMode] = useState(false);

  useEffect(() => {
    setUnlocked(isSessionUnlocked());
    const savedMode = window.localStorage.getItem("dashboard_mode") as ProfileMode | null;
    const savedEnergy = Number(window.localStorage.getItem("dashboard_energy"));
    const savedMotion = window.localStorage.getItem("dashboard_reduce_motion");
    const savedJunior = window.localStorage.getItem("dashboard_junior_mode");
    if (savedMode && ["focus", "balanced", "calm"].includes(savedMode)) {
      setMode(savedMode);
    }
    if (Number.isFinite(savedEnergy) && savedEnergy >= 30 && savedEnergy <= 100) {
      setEnergy(savedEnergy);
    }
    if (savedMotion === "true") {
      setReduceMotion(true);
    }
    if (savedJunior === "true") {
      setJuniorMode(true);
    }
    setReady(true);
  }, []);

  const week = useMemo(() => generateWeekPlan(), []);
  const productList = products as ProductItem[];
  const todayKey = new Intl.DateTimeFormat("nl-NL", { weekday: "long" }).format(new Date()).toLowerCase();
  const today = week.days.find((day) => day.day === todayKey) ?? week.days[0];
  const trainingCount = week.days.filter((d) => d.workoutType !== "rest").length;
  const complianceScore =
    Object.values(week.complianceChecks).filter(Boolean).length / Object.values(week.complianceChecks).length;
  const hourNow = new Date().getHours();
  const nextMealType =
    hourNow < 10 ? "ontbijt" : hourNow < 14 ? "lunch" : hourNow < 18 ? "snack" : "avondeten";
  const nextMeal = today.meals.find((meal) => meal.mealType === nextMealType) ?? today.meals[0];

  useEffect(() => {
    if (!ready) {
      return;
    }
    window.localStorage.setItem("dashboard_mode", mode);
    window.localStorage.setItem("dashboard_energy", String(energy));
    window.localStorage.setItem("dashboard_reduce_motion", String(reduceMotion));
    window.localStorage.setItem("dashboard_junior_mode", String(juniorMode));
  }, [mode, energy, reduceMotion, juniorMode, ready]);

  if (!ready) {
    return <main className="min-h-screen" />;
  }

  if (!unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <main
      className={`mx-auto max-w-[1600px] space-y-6 px-3 py-4 sm:px-6 sm:py-8 ${reduceMotion ? "" : "animate-enter"}`}
      style={{ ["--accent" as string]: MODE_ACCENT[mode] }}
    >
      <header className="rounded-[1.4rem] border border-ring/25 bg-panel/55 p-4 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-accentSoft">Huishoud Planning</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{juniorMode ? "Junior Modus" : "Weekmenu + Beweging (NL)"}</h1>
            <p className="mt-3 max-w-2xl text-sm text-muted sm:text-base">Duidelijk weekritme met makkelijke keuzes en rustige visuals.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-400/35 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                Prive board
              </span>
              <span className="rounded-full border border-cyan-400/35 bg-cyan-500/20 px-3 py-1 text-xs font-semibold text-cyan-200">
                Donkere modus
              </span>
              {juniorMode ? (
                <span className="rounded-full border border-yellow-300/40 bg-yellow-400/20 px-3 py-1 text-xs font-semibold text-yellow-100">
                  Junior
                </span>
              ) : null}
              <LogoutButton />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                ["ontbijt", "Ontbijt"],
                ["lunch", "Lunch"],
                ["snack", "Snack"],
                ["avondeten", "Avond"],
              ].map(([type, label]) => (
                <span key={type} className="inline-flex items-center gap-1.5 rounded-full border border-ring/20 bg-panel/60 px-2.5 py-1 text-xs">
                  <MealIcon type={type as "ontbijt" | "lunch" | "snack" | "avondeten"} />
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-ring/20 bg-card/50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Persoonlijke stijl zonder namen</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(MODE_LABEL) as ProfileMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMode(item)}
                    className={`rounded-full border px-3 py-1 text-xs transition ${
                      mode === item ? "border-accent bg-accent/20 text-text" : "border-ring/25 bg-panel text-muted"
                    }`}
                  >
                    {MODE_LABEL[item]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">{MODE_TEXT[mode]}</p>
              <div className="mt-3">
                <label className="text-xs text-muted">Dagenergie: {energy}%</label>
                <input
                  type="range"
                  min={30}
                  max={100}
                  value={energy}
                  onChange={(e) => setEnergy(Number(e.target.value))}
                  className="mt-1 w-full accent-orange-400"
                />
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={reduceMotion}
                  onChange={(e) => setReduceMotion(e.target.checked)}
                  className="accent-orange-400"
                />
                Minder animatie
              </label>
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={juniorMode}
                  onChange={(e) => setJuniorMode(e.target.checked)}
                  className="accent-orange-400"
                />
                Junior mode (eenvoudig)
              </label>
            </div>
          </div>
          <ThreeHero />
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="card-lift rounded-xl2 border border-ring/20 bg-card/50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Vandaag in beeld</p>
          <h2 className="mt-1 text-xl font-semibold capitalize">{today.day}</h2>
          <p className="mt-1 text-sm text-muted">Workout: {today.workoutType.toUpperCase()}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {today.meals.map((meal) => (
              <div key={meal.mealType} className="rounded-lg border border-ring/15 bg-panel/55 p-2 text-xs">
                <p className="font-semibold text-accentSoft">{meal.mealType}</p>
                <p className="mt-1 text-muted">{meal.items.length} items</p>
              </div>
            ))}
          </div>
        </article>
        <article className="card-lift rounded-xl2 border border-ring/20 bg-card/50 p-4">
          {juniorMode ? (
            <>
              <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Volgende stap</p>
              <div className="mt-3 rounded-lg border border-ring/15 bg-panel/55 p-3">
                <div className="flex items-center gap-2">
                  <MealIcon type={nextMeal.mealType} />
                  <p className="font-semibold capitalize">{nextMeal.mealType}</p>
                </div>
                <p className="mt-2 text-sm text-muted">Kies 1 van deze producten:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  {nextMeal.items.slice(0, 3).map((id) => {
                    const product = productList.find((p) => p.id === id);
                    return <li key={id}>• {product?.name ?? id}</li>;
                  })}
                </ul>
              </div>
            </>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Ritme status</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-ring/15 bg-panel/55 p-3">
                  <p className="text-lg font-semibold">{trainingCount}</p>
                  <p className="text-xs text-muted">Trainingsdagen</p>
                </div>
                <div className="rounded-lg border border-ring/15 bg-panel/55 p-3">
                  <p className="text-lg font-semibold">{Math.round(complianceScore * 100)}%</p>
                  <p className="text-xs text-muted">Naleving</p>
                </div>
                <div className="rounded-lg border border-ring/15 bg-panel/55 p-3">
                  <p className="text-lg font-semibold">{energy}%</p>
                  <p className="text-xs text-muted">Energie</p>
                </div>
              </div>
            </div>
          )}
        </article>
      </section>

      {juniorMode ? (
        <section className="rounded-xl2 border border-ring/20 bg-card/50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Deze week</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {week.days.map((day) => (
              <div key={day.day} className="rounded-lg border border-ring/15 bg-panel/55 p-2">
                <p className="text-sm font-semibold capitalize">{day.day}</p>
                <p className="text-xs text-muted mt-1">Workout: {day.workoutType.toUpperCase()}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <>
          <WeekBoard week={week} products={productList} />

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <StoreShoppingList list={week.shoppingListByStore} />
            <ComplianceMeter checks={week.complianceChecks} />
          </section>
        </>
      )}

      <footer className="rounded-xl2 border border-ring/20 bg-card/45 p-4 text-xs text-muted">
        Dit dashboard ondersteunt planning en is geen medisch advies. Bespreek energie-inname bij jongeren altijd met ouder/verzorger en
        een gekwalificeerde professional.
      </footer>
    </main>
  );
}
