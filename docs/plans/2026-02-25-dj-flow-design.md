# DJ Flow Engine Design

## Goal
Preserve the current DJ UX while making all Simple mode performance actions feel musically synced and coherent, especially during rapid scene/prompt/vocal/drop interaction.

## Scope
- Keep existing controls and layout.
- Add a Simple mode `Flow Mode` switch with `Strict Pro` and `Balanced`.
- Default to `Strict Pro` on every session.
- Route key live actions through one flow scheduler:
  - Scenes
  - Inject Crafted Prompt
  - Vocal Chops Lite (down/up)
  - Mega Drop
  - Energy apply

## Behavioral Design
- `Strict Pro`:
  - Larger quantize windows (phrase-oriented).
  - During Mega Drop lock, blocked actions are queued (latest intent wins) and replayed after lock release.
- `Balanced`:
  - Shorter quantize windows.
  - During lock, blocked actions are discarded (current behavior-like responsiveness).

## Non-goals
- No redesign of Advanced mode.
- No change to existing Mega Drop synthesis profile internals.
- No backend/API contract changes.
