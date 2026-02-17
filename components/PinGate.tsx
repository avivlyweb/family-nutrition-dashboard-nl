"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { getLockUntil, unlockWithPin } from "@/lib/client/pin-auth";

interface Props {
  onUnlocked: () => void;
}

export function PinGate({ onUnlocked }: Props) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const lockedUntil = getLockUntil();
    if (lockedUntil) {
      setLoading(false);
      setError(`Te veel pogingen. Probeer opnieuw na ${new Date(lockedUntil).toLocaleTimeString("nl-NL")}.`);
      return;
    }

    const result = await unlockWithPin(pin);
    setLoading(false);

    if (!result.ok) {
      if (result.lockedUntil) {
        setError(`Te veel pogingen. Probeer opnieuw na ${new Date(result.lockedUntil).toLocaleTimeString("nl-NL")}.`);
      } else {
        setError(result.error ?? "Onjuiste pincode.");
      }
      return;
    }

    onUnlocked();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <section className="w-full max-w-md rounded-[1.25rem] border border-ring/35 bg-card/80 p-8 backdrop-blur-lg">
        <p className="text-sm uppercase tracking-[0.22em] text-accentSoft">Familie Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold">Privetoegang</h1>
        <p className="mt-2 text-sm text-muted">Alleen familieleden met pincode kunnen het weekmenu bekijken.</p>
        <p className="mt-2 text-xs text-amber-300">Let op: GitHub Pages gebruikt client-side PIN en biedt beperkte privacy.</p>

        <form onSubmit={submitPin} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-muted" htmlFor="pin">
            Pincode
          </label>
          <input
            id="pin"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="w-full rounded-xl border border-ring/35 bg-panel px-4 py-3 text-lg tracking-[0.25em] outline-none transition focus:border-accent"
            placeholder="••••"
            required
          />
          {error ? <p className="text-sm text-red-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-400 px-4 py-3 font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Controleren..." : "Ontgrendelen"}
          </button>
        </form>
      </section>
    </main>
  );
}
