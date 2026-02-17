"use client";

import { useState } from "react";
import { lockSession } from "@/lib/client/pin-auth";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);

  function onLogout() {
    setBusy(true);
    lockSession();
    window.location.reload();
  }

  return (
    <button
      onClick={onLogout}
      disabled={busy}
      className="rounded-lg border border-ring/35 bg-panel px-3 py-2 text-sm text-text transition hover:border-accent disabled:opacity-70"
      type="button"
    >
      {busy ? "Vergrendelen..." : "Vergrendelen"}
    </button>
  );
}
