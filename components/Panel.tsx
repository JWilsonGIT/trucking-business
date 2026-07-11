"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export function Panel({
  title,
  action,
  href,
  right,
  children,
  className,
}: {
  title: string;
  action?: string;
  href?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-line bg-surface", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h2 className="font-display text-[15px] font-semibold text-ink">{title}</h2>
        {right}
        {href && action && (
          <Link href={href} className="text-xs font-medium text-fleet hover:underline">
            {action}
          </Link>
        )}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
