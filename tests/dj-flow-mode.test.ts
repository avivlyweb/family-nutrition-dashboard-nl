import { describe, expect, it } from "vitest";
import {
  getFlowQuantizeBeats,
  shouldAllowDuringDrop,
  shouldQueueWhenDropLocked,
  type FlowMode,
  type FlowActionType,
} from "@/lib/dj/flow-mode";

describe("flow mode quantization", () => {
  it("uses larger windows in strict pro than balanced for key actions", () => {
    const actions: FlowActionType[] = ["SCENE", "CRAFTED_PROMPT", "VOCAL_DOWN", "VOCAL_UP", "MEGA_DROP"];

    for (const action of actions) {
      const strictBeats = getFlowQuantizeBeats("STRICT_PRO", action);
      const balancedBeats = getFlowQuantizeBeats("BALANCED", action);
      expect(strictBeats).toBeGreaterThanOrEqual(balancedBeats);
    }
  });

  it("keeps strict scene transitions phrase-locked", () => {
    expect(getFlowQuantizeBeats("STRICT_PRO", "SCENE")).toBe(8);
    expect(getFlowQuantizeBeats("BALANCED", "SCENE")).toBe(4);
  });
});

describe("flow mode lock handling", () => {
  it("allows mega drop scheduling during drop lock", () => {
    expect(shouldAllowDuringDrop("MEGA_DROP")).toBe(true);
    expect(shouldAllowDuringDrop("SCENE")).toBe(false);
  });

  it("queues blocked actions only in strict mode", () => {
    const blockedActions: FlowActionType[] = ["SCENE", "CRAFTED_PROMPT", "VOCAL_DOWN", "VOCAL_UP", "ENERGY"];

    for (const action of blockedActions) {
      expect(shouldQueueWhenDropLocked("STRICT_PRO", action)).toBe(true);
      expect(shouldQueueWhenDropLocked("BALANCED", action)).toBe(false);
    }
  });

  it("never queues mega drop as deferred action", () => {
    const modes: FlowMode[] = ["STRICT_PRO", "BALANCED"];
    for (const mode of modes) {
      expect(shouldQueueWhenDropLocked(mode, "MEGA_DROP")).toBe(false);
    }
  });
});
