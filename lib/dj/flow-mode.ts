export type FlowMode = "STRICT_PRO" | "BALANCED";

export type FlowActionType =
  | "ENERGY"
  | "SCENE"
  | "CRAFTED_PROMPT"
  | "VOCAL_DOWN"
  | "VOCAL_UP"
  | "MEGA_DROP";

const FLOW_QUANTIZE_BEATS: Record<FlowMode, Record<FlowActionType, number>> = {
  STRICT_PRO: {
    ENERGY: 2,
    SCENE: 8,
    CRAFTED_PROMPT: 4,
    VOCAL_DOWN: 2,
    VOCAL_UP: 2,
    MEGA_DROP: 8,
  },
  BALANCED: {
    ENERGY: 1,
    SCENE: 4,
    CRAFTED_PROMPT: 2,
    VOCAL_DOWN: 1,
    VOCAL_UP: 1,
    MEGA_DROP: 4,
  },
};

export function getFlowQuantizeBeats(mode: FlowMode, action: FlowActionType): number {
  return FLOW_QUANTIZE_BEATS[mode][action];
}

export function shouldAllowDuringDrop(action: FlowActionType): boolean {
  return action === "MEGA_DROP";
}

export function shouldQueueWhenDropLocked(mode: FlowMode, action: FlowActionType): boolean {
  if (action === "MEGA_DROP") return false;
  return mode === "STRICT_PRO";
}
