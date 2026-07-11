"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  BOOKING_STATUS_META,
  MAINT_STATUS_META,
  PAYMENT_STATUS_META,
  TRUCK_STATUS_META,
  type BookingStatus,
  type MaintStatus,
  type PaymentStatus,
  type TruckStatus,
} from "@/lib/db/types";
import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  color,
  size = 28,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full font-medium text-white shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.38 }}
      title={name}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

/** Generic status pill. */
export function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: `${color}1a`, color }}
    >
      {label}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const m = BOOKING_STATUS_META[status];
  return <Pill label={m.label} color={m.color} />;
}
export function TruckStatusBadge({ status }: { status: TruckStatus }) {
  const m = TRUCK_STATUS_META[status];
  return <Pill label={m.label} color={m.color} />;
}
export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const m = PAYMENT_STATUS_META[status];
  return <Pill label={m.label} color={m.color} />;
}
export function MaintStatusBadge({ status }: { status: MaintStatus }) {
  const m = MAINT_STATUS_META[status];
  return <Pill label={m.label} color={m.color} />;
}

type ButtonVariant = "primary" | "accent" | "ghost" | "outline" | "subtle" | "danger";

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed";
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-ink text-white hover:bg-ink-700",
    accent: "bg-accent text-ink hover:bg-accent-600",
    outline: "border border-line bg-surface text-ink hover:bg-paper",
    ghost: "text-ink-500 hover:bg-paper",
    subtle: "bg-paper text-ink hover:bg-line",
    danger: "border border-hazard/30 bg-surface text-hazard hover:bg-hazard/10",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 p-4 sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "w-full rounded-xl border border-line bg-surface shadow-2xl",
          wide ? "max-w-3xl" : "max-w-lg",
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted hover:bg-paper"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto scrollbar-thin px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-hazard"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none";
export const selectCls = inputCls + " appearance-none";
export const textareaCls = inputCls + " min-h-[76px]";

export function EmptyState({
  title,
  hint,
  icon,
}: {
  title: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-muted">{icon}</div>}
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="mt-1 max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-3 p-6">
      <div className="h-6 w-40 animate-pulse rounded bg-line" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-line" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-line" />
    </div>
  );
}

export function LoadError({ message }: { message: string }) {
  return (
    <div className="m-6">
      <EmptyState title="Couldn't load data" hint={message} />
    </div>
  );
}
