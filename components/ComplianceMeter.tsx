import type { ComplianceChecks } from "@/lib/types";

const LINES: Array<{ key: keyof ComplianceChecks; label: string }> = [
  { key: "lunchFourWholegrainSlices", label: "Lunch = 4 volkoren boterhammen" },
  { key: "dinnerPlateRatioValid", label: "Avondbordverdeling compleet" },
  { key: "noPorkProducts", label: "Geen varkensproducten" },
  { key: "rotatingSnackRule", label: "Snackrotatie aanwezig" },
];

export function ComplianceMeter({ checks }: { checks: ComplianceChecks }) {
  return (
    <section className="rounded-xl2 border border-ring/20 bg-card/50 p-4">
      <h3 className="text-sm uppercase tracking-[0.16em] text-accentSoft">Naleving</h3>
      <ul className="mt-3 space-y-2 text-sm">
        {LINES.map((line) => {
          const ok = checks[line.key];
          return (
            <li key={line.key} className="flex items-center justify-between gap-4 rounded-lg border border-ring/10 bg-panel/55 px-3 py-2">
              <span>{line.label}</span>
              <span className={ok ? "text-emerald-300" : "text-rose-300"}>{ok ? "OK" : "Check"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
