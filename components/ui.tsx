// Small presentational pieces shared across screens.

import type { PaceStatus } from "@/lib/progress";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{children}</h2>;
}

export function Chip({
  active,
  onClick,
  disabled,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-10 rounded-full px-4 text-sm font-medium transition disabled:opacity-50 ${
        active ? "bg-foreground text-background" : "bg-chip text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function ProgressBar({ value, max, color }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-chip">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color ?? "var(--good)" }} />
    </div>
  );
}

const PACE_STYLE: Record<PaceStatus, { label: string; className: string }> = {
  done: { label: "Done", className: "bg-good-soft text-good" },
  ahead: { label: "Ahead", className: "bg-good-soft text-good" },
  on_pace: { label: "On pace", className: "bg-chip text-foreground" },
  behind: { label: "Behind", className: "bg-bad-soft text-bad" },
};

export function PaceBadge({ status }: { status: PaceStatus }) {
  const { label, className } = PACE_STYLE[status];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}>{label}</span>;
}
