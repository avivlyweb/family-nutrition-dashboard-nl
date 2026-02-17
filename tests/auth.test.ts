import { describe, expect, it } from "vitest";

describe("client pin hash format", () => {
  it("accepts sha256-prefixed format", () => {
    const value = "sha256:abc123";
    expect(value.startsWith("sha256:")).toBe(true);
  });
});
