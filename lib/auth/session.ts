import crypto from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "family_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

interface SessionPayload {
  exp: number;
  iat: number;
  nonce: string;
}

function getSecret(): string {
  const secret = process.env.FAMILY_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing FAMILY_SESSION_SECRET environment variable.");
  }
  return secret;
}

function sign(payloadRaw: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payloadRaw).digest("base64url");
}

function encode(payload: SessionPayload): string {
  const raw = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${raw}.${sign(raw)}`;
}

function decode(token: string): SessionPayload | null {
  const [raw, signature] = token.split(".");
  if (!raw || !signature) {
    return null;
  }

  const expected = sign(raw);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf-8")) as SessionPayload;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function createSessionCookieValue(): string {
  const now = Math.floor(Date.now() / 1000);
  return encode({
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    nonce: crypto.randomBytes(8).toString("hex"),
  });
}

export async function setSessionCookie() {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: createSessionCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set({
    name: SESSION_COOKIE,
    value: "",
    expires: new Date(0),
    path: "/",
  });
}

export async function hasValidSession(): Promise<boolean> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return decode(token) !== null;
}
