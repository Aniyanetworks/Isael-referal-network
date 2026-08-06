import type { ReactNode } from "react";

type StatCardAccent = "primary" | "secondary" | "accent";

const ACCENT_CLASSES: Record<StatCardAccent, string> = {
  primary: "bg-brand-primary/10 text-brand-primary",
  secondary: "bg-brand-secondary/10 text-brand-secondary",
  accent: "bg-brand-accent/10 text-brand-accent",
};

interface StatCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
  accent?: StatCardAccent;
}

export function StatCard({ label, value, hint, icon, accent = "primary" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
