export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Local calendar date as yyyy-mm-dd (avoids UTC off-by-one from toISOString). */
export function localISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return localISO(new Date());
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // yyyy-mm
}

export function thisMonthKey(): string {
  return todayISO().slice(0, 7);
}

export function isToday(iso: string | null): boolean {
  return !!iso && iso === todayISO();
}

export function isThisMonth(iso: string | null): boolean {
  return !!iso && monthKey(iso) === thisMonthKey();
}

/** Whole days from today until `iso` (negative if in the past). */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`).getTime();
  const today = new Date(`${todayISO()}T00:00:00`).getTime();
  return Math.round((target - today) / 86400000);
}

export function formatDate(
  iso: string | null,
  opts?: Intl.DateTimeFormatOptions,
): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return d.toLocaleDateString("en-US", opts ?? { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLongDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});

export function formatMoney(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return peso.format(v || 0);
}

export function formatNumber(n: number | null | undefined, digits = 0): string {
  return (n ?? 0).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
