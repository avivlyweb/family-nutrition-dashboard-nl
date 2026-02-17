import crypto from "node:crypto";

export function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function verifyPin(pin: string): boolean {
  const stored = process.env.FAMILY_PIN_HASH;
  if (!stored) {
    return false;
  }

  const pepper = process.env.FAMILY_PIN_PEPPER ?? "";
  const [algo, expected] = stored.split(":");

  if (algo !== "sha256" || !expected) {
    return false;
  }

  const actual = sha256Hex(`${pin}${pepper}`);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}
