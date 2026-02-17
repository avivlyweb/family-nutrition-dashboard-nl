const WINDOW_MS = 10 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

interface AttemptState {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const attemptsByIp = new Map<string, AttemptState>();

function getState(ip: string): AttemptState {
  const current = attemptsByIp.get(ip);
  if (current) {
    return current;
  }
  const seed: AttemptState = {
    attempts: 0,
    firstAttemptAt: Date.now(),
    lockedUntil: null,
  };
  attemptsByIp.set(ip, seed);
  return seed;
}

export function checkPinLimit(ip: string): { allowed: boolean; lockedUntil?: string } {
  const state = getState(ip);

  if (state.lockedUntil && state.lockedUntil > Date.now()) {
    return {
      allowed: false,
      lockedUntil: new Date(state.lockedUntil).toISOString(),
    };
  }

  if (Date.now() - state.firstAttemptAt > WINDOW_MS) {
    state.firstAttemptAt = Date.now();
    state.attempts = 0;
    state.lockedUntil = null;
  }

  return { allowed: true };
}

export function recordFailedPinAttempt(ip: string): { lockedUntil?: string } {
  const state = getState(ip);
  if (Date.now() - state.firstAttemptAt > WINDOW_MS) {
    state.firstAttemptAt = Date.now();
    state.attempts = 0;
  }

  state.attempts += 1;
  if (state.attempts >= MAX_ATTEMPTS) {
    state.lockedUntil = Date.now() + LOCK_MS;
    return { lockedUntil: new Date(state.lockedUntil).toISOString() };
  }

  return {};
}

export function resetPinAttempts(ip: string): void {
  attemptsByIp.delete(ip);
}
