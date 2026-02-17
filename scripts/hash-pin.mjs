import crypto from "node:crypto";

const pin = process.argv[2];
const pepper = process.argv[3] ?? "";

if (!pin) {
  console.error("Usage: node scripts/hash-pin.mjs <pin> [pepper]");
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(`${pin}${pepper}`).digest("hex");
console.log(`sha256:${hash}`);
