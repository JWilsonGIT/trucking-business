"use client";

import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: number | string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <p className="label-mono">{label}</p>
      <p
        className="mt-1 font-display text-3xl font-semibold"
        style={{ color: accent ?? "var(--color-ink)" }}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function BarChart({
  data,
  height = 180,
}: {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-3" style={{ height }}>
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-md transition-[height]"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? 6 : 0,
                background: d.color ?? "var(--color-accent)",
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="font-mono text-xs font-medium text-ink">{d.value}</span>
          <span
            className="w-full truncate text-center text-[11px] text-muted"
            title={d.label}
          >
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function DonutStat({
  segments,
  total,
  centerLabel,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
  centerLabel: string;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const safeTotal = Math.max(1, total);
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" className="shrink-0">
      <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
      {segments.map((s) => {
        const dash = (s.value / safeTotal) * c;
        const el = (
          <circle
            key={s.label}
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="10"
            strokeDasharray={`${dash} ${c - dash}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 44 44)"
          />
        );
        offset += dash;
        return el;
      })}
      <text
        x="44"
        y="49"
        textAnchor="middle"
        className="font-mono"
        fontSize="18"
        fill="var(--color-ink)"
        fontWeight="600"
      >
        {centerLabel}
      </text>
    </svg>
  );
}

export function LegendRow({
  items,
  className,
}: {
  items: { label: string; value: number | string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2 text-sm">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          <span className="flex-1 text-ink-500">{i.label}</span>
          <span className="font-mono font-medium text-ink">{i.value}</span>
        </li>
      ))}
    </ul>
  );
}
