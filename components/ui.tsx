// Small presentational pieces shared across screens.

import type { PaceStatus } from "@/lib/progress";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card p-4 ${className}`}>{children}</div>;
}

export function SectionTitle({ children, aside }: { children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="label">{children}</h2>
      {aside}
    </div>
  );
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
      className={`min-h-10 rounded-full px-4 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${
        active ? "bg-accent text-on-accent" : "bg-chip text-foreground hover:bg-line"
      }`}
    >
      {children}
    </button>
  );
}

/** Pill-shaped action on the right of a row ("Done", "+ Log", "+1"). */
export function ActionPill({
  onClick,
  active,
  disabled,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition active:scale-95 disabled:opacity-40 ${
        active ? "bg-good text-card" : "bg-accent-soft text-accent hover:brightness-95"
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
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color ?? "var(--accent)" }}
      />
    </div>
  );
}

/** Circular progress, used for the day's completion and around habit icons. */
export function ProgressRing({
  value,
  max,
  size = 64,
  stroke = 5,
  color = "var(--accent)",
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--chip)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

/** Emoji (or first letter) on a soft tint of the area colour. */
export function IconBubble({ icon, name, color, size = 44 }: { icon?: string; name: string; color?: string; size?: number }) {
  const tint = color ?? "var(--accent)";
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full text-xl"
      style={{
        width: size,
        height: size,
        background: `color-mix(in srgb, ${tint} 16%, transparent)`,
        color: tint,
      }}
      aria-hidden
    >
      {icon ?? <span className="text-base font-semibold">{name.slice(0, 1)}</span>}
    </span>
  );
}

const PACE_STYLE: Record<PaceStatus, { label: string; className: string }> = {
  done: { label: "Done", className: "bg-good-soft text-good" },
  ahead: { label: "Ahead", className: "bg-good-soft text-good" },
  on_pace: { label: "On pace", className: "bg-chip text-muted" },
  behind: { label: "Behind", className: "bg-bad-soft text-bad" },
};

export function PaceBadge({ status }: { status: PaceStatus }) {
  const { label, className } = PACE_STYLE[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{label}</span>;
}
