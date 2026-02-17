const SESSION_KEY = "family_dashboard_session";
const ATTEMPTS_KEY = "family_dashboard_attempts";
const SESSION_MS = 8 * 60 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptState {
  count: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

interface UnlockResult {
  ok: boolean;
  error?: string;
  lockedUntil?: number;
}

function readAttempts(): AttemptState {
  const raw = window.localStorage.getItem(ATTEMPTS_KEY);
  if (!raw) {
    return { count: 0, firstAttemptAt: Date.now(), lockedUntil: null };
  }
  try {
    const parsed = JSON.parse(raw) as AttemptState;
    return parsed;
  } catch {
    return { count: 0, firstAttemptAt: Date.now(), lockedUntil: null };
  }
}

function writeAttempts(state: AttemptState): void {
  window.localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(state));
}

function resetAttempts(): void {
  window.localStorage.removeItem(ATTEMPTS_KEY);
}

async function sha256Hex(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getConfiguredHash(): string | null {
  const value = process.env.NEXT_PUBLIC_FAMILY_PIN_HASH;
  if (!value) {
    return null;
  }
  const [algo, hash] = value.split(":");
  if (algo !== "sha256" || !hash) {
    return null;
  }
  return hash;
}

export function isSessionUnlocked(): boolean {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return false;
  }
  const expiresAt = Number(raw);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    window.localStorage.removeItem(SESSION_KEY);
    return false;
  }
  return true;
}

export function lockSession(): void {
  window.localStorage.removeItem(SESSION_KEY);
}

export function getLockUntil(): number | null {
  const attempts = readAttempts();
  if (attempts.lockedUntil && attempts.lockedUntil > Date.now()) {
    return attempts.lockedUntil;
  }
  return null;
}

export async function unlockWithPin(pin: string): Promise<UnlockResult> {
  const expected = getConfiguredHash();
  if (!expected) {
    return { ok: false, error: "PIN hash ontbreekt in configuratie." };
  }

  const now = Date.now();
  const attempts = readAttempts();

  if (attempts.lockedUntil && attempts.lockedUntil > now) {
    return { ok: false, error: "Te veel pogingen.", lockedUntil: attempts.lockedUntil };
  }

  if (now - attempts.firstAttemptAt > WINDOW_MS) {
    attempts.firstAttemptAt = now;
    attempts.count = 0;
    attempts.lockedUntil = null;
  }

  const pepper = process.env.NEXT_PUBLIC_FAMILY_PIN_PEPPER ?? "";
  const actual = await sha256Hex(`${pin}${pepper}`);

  if (actual !== expected) {
    attempts.count += 1;
    if (attempts.count >= MAX_ATTEMPTS) {
      attempts.lockedUntil = now + LOCK_MS;
      writeAttempts(attempts);
      return { ok: false, error: "Te veel pogingen.", lockedUntil: attempts.lockedUntil };
    }
    writeAttempts(attempts);
    return { ok: false, error: "Onjuiste pincode." };
  }

  resetAttempts();
  window.localStorage.setItem(SESSION_KEY, String(now + SESSION_MS));
  return { ok: true };
}
