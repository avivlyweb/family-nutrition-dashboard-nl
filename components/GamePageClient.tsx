"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PinGate } from "@/components/PinGate";
import { isSessionUnlocked } from "@/lib/client/pin-auth";

type Mode = "start" | "play" | "win" | "lose";

interface Fruit {
  id: number;
  x: number;
  y: number;
  vy: number;
  good: boolean;
}

interface GameState {
  mode: Mode;
  playerX: number;
  playerSpeed: number;
  score: number;
  target: number;
  misses: number;
  maxMisses: number;
  fruits: Fruit[];
  spawnTimer: number;
  nextId: number;
  width: number;
  height: number;
}

const INITIAL: GameState = {
  mode: "start",
  playerX: 220,
  playerSpeed: 260,
  score: 0,
  target: 12,
  misses: 0,
  maxMisses: 8,
  fruits: [],
  spawnTimer: 0.3,
  nextId: 1,
  width: 440,
  height: 620,
};

export function GamePageClient() {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [hud, setHud] = useState({ score: 0, misses: 0, mode: "start" as Mode });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>({ ...INITIAL });
  const keysRef = useRef<Record<string, boolean>>({});
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);

  useEffect(() => {
    setUnlocked(isSessionUnlocked());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysRef.current[k] = true;
      if (k === "f") {
        toggleFullscreen();
      }
      if (k === "enter" && (stateRef.current.mode === "start" || stateRef.current.mode === "win" || stateRef.current.mode === "lose")) {
        resetGame();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    const loop = (ts: number) => {
      if (lastTsRef.current == null) {
        lastTsRef.current = ts;
      }
      const dt = Math.min(0.033, (ts - lastTsRef.current) / 1000);
      lastTsRef.current = ts;
      update(dt);
      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    rafRef.current = requestAnimationFrame(loop);

    // Hooks required by develop-web-game skill.
    (window as Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => void }).render_game_to_text =
      renderGameToText;
    (window as Window & { render_game_to_text?: () => string; advanceTime?: (ms: number) => void }).advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / (1000 / 60)));
      for (let i = 0; i < steps; i += 1) {
        update(1 / 60);
      }
      render();
    };

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      delete (window as Window & { render_game_to_text?: () => string }).render_game_to_text;
      delete (window as Window & { advanceTime?: (ms: number) => void }).advanceTime;
    };
  }, [unlocked]);

  function toggleFullscreen() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!document.fullscreenElement) {
      void canvas.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  }

  function resetGame() {
    stateRef.current = {
      ...INITIAL,
      mode: "play",
    };
    setHud({ score: 0, misses: 0, mode: "play" });
  }

  function spawnFruit() {
    const state = stateRef.current;
    const good = Math.random() > 0.3;
    state.fruits.push({
      id: state.nextId++,
      x: 24 + Math.random() * (state.width - 48),
      y: -20,
      vy: 90 + Math.random() * 120,
      good,
    });
  }

  function update(dt: number) {
    const state = stateRef.current;
    if (state.mode !== "play") {
      setHud({ score: state.score, misses: state.misses, mode: state.mode });
      return;
    }

    if (keysRef.current.arrowleft || keysRef.current.a) {
      state.playerX -= state.playerSpeed * dt;
    }
    if (keysRef.current.arrowright || keysRef.current.d) {
      state.playerX += state.playerSpeed * dt;
    }
    state.playerX = Math.max(32, Math.min(state.width - 32, state.playerX));

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnFruit();
      state.spawnTimer = 0.4 + Math.random() * 0.35;
    }

    const basketY = state.height - 48;
    state.fruits = state.fruits.filter((fruit) => {
      fruit.y += fruit.vy * dt;
      const catchDistance = Math.abs(fruit.x - state.playerX) < 36 && Math.abs(fruit.y - basketY) < 20;
      if (catchDistance) {
        if (fruit.good) {
          state.score += 1;
        } else {
          state.misses += 1;
        }
        return false;
      }

      if (fruit.y > state.height + 20) {
        if (fruit.good) {
          state.misses += 1;
        }
        return false;
      }

      return true;
    });

    if (state.score >= state.target) {
      state.mode = "win";
    }
    if (state.misses >= state.maxMisses) {
      state.mode = "lose";
    }

    setHud({ score: state.score, misses: state.misses, mode: state.mode });
  }

  function render() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = stateRef.current;
    ctx.clearRect(0, 0, s.width, s.height);

    const grad = ctx.createLinearGradient(0, 0, 0, s.height);
    grad.addColorStop(0, "#0f172a");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s.width, s.height);

    ctx.fillStyle = "#334155";
    ctx.fillRect(0, s.height - 72, s.width, 72);

    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(s.playerX - 38, s.height - 34, 76, 16);
    ctx.fillStyle = "#fde68a";
    ctx.fillRect(s.playerX - 28, s.height - 42, 56, 8);

    for (const fruit of s.fruits) {
      ctx.beginPath();
      ctx.arc(fruit.x, fruit.y, 12, 0, Math.PI * 2);
      ctx.fillStyle = fruit.good ? "#22c55e" : "#ef4444";
      ctx.fill();
      ctx.closePath();
    }

    if (s.mode === "start") {
      drawOverlay(ctx, s, "Fruit Catch", "Pak groene ballen, vermijd rode. Druk Enter om te starten.");
    }
    if (s.mode === "win") {
      drawOverlay(ctx, s, "Gewonnen!", "Top. Druk Enter voor nog een ronde.");
    }
    if (s.mode === "lose") {
      drawOverlay(ctx, s, "Bijna!", "Druk Enter om opnieuw te spelen.");
    }
  }

  function drawOverlay(ctx: CanvasRenderingContext2D, s: GameState, title: string, subtitle: string) {
    ctx.fillStyle = "rgba(2, 6, 23, 0.68)";
    ctx.fillRect(12, 200, s.width - 24, 140);
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 28px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, s.width / 2, 248);
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(subtitle, s.width / 2, 284);
  }

  function renderGameToText() {
    const s = stateRef.current;
    const payload = {
      coordinateSystem: "origin top-left, +x right, +y down",
      mode: s.mode,
      player: { x: Number(s.playerX.toFixed(1)), y: s.height - 34, basketWidth: 76 },
      fruit: s.fruits.map((f) => ({
        x: Number(f.x.toFixed(1)),
        y: Number(f.y.toFixed(1)),
        type: f.good ? "good" : "bad",
      })),
      score: s.score,
      misses: s.misses,
      target: s.target,
      maxMisses: s.maxMisses,
    };
    return JSON.stringify(payload);
  }

  if (!ready) {
    return <main className="min-h-screen" />;
  }

  if (!unlocked) {
    return <PinGate onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-ring/20 bg-card/60 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Speelmodus</p>
          <h1 className="text-2xl font-semibold">Fruit Catch</h1>
          <p className="text-sm text-muted">Besturing: pijltjes of A/D • Enter start/herstart • F fullscreen</p>
        </div>
        <Link href="/" className="rounded-full border border-ring/30 bg-panel px-3 py-1 text-sm hover:border-accent">
          Terug naar dashboard
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-xl border border-ring/20 bg-panel/65 p-3">
          <canvas ref={canvasRef} width={440} height={620} className="mx-auto block w-full max-w-[440px] rounded-lg border border-ring/20" />
        </div>
        <aside className="rounded-xl border border-ring/20 bg-card/55 p-3 text-sm">
          <p className="text-xs uppercase tracking-[0.16em] text-accentSoft">Status</p>
          <p className="mt-2">Score: {hud.score}</p>
          <p>Misses: {hud.misses}</p>
          <p>Mode: {hud.mode}</p>
          <p className="mt-4 text-xs text-muted">Doel: pak 12 groene ballen voordat je 8 missers hebt.</p>
        </aside>
      </section>
    </main>
  );
}
