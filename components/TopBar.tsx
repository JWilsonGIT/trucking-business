"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_META, type Role } from "@/lib/db/types";
import { formatLongDate } from "@/lib/utils";

export function TopBar({
  heading,
  subtitle,
  actions,
}: {
  heading: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const { user, users, login } = useAuth();
  const [roleOpen, setRoleOpen] = useState(false);

  const roles: Role[] = ["owner", "driver"];

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-line bg-paper/85 px-6 py-3 backdrop-blur">
      <div className="min-w-0 flex-1">
        <p className="label-mono">{subtitle ?? formatLongDate(new Date())}</p>
        <h1 className="font-display text-xl font-semibold text-ink">{heading}</h1>
      </div>

      {actions}

      <div className="relative">
        <button
          onClick={() => setRoleOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-2 text-xs text-ink-500 hover:bg-paper"
        >
          <span className="label-mono">View as</span>
          <span className="font-medium text-ink">
            {user ? ROLE_META[user.role].label : ""}
          </span>
          <ChevronDown size={13} />
        </button>
        {roleOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(false)} />
            <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
              <p className="label-mono px-3 py-1.5">Switch demo role</p>
              {roles.map((role) => {
                const u = users.find((x) => x.role === role);
                if (!u) return null;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      login(u.id);
                      setRoleOpen(false);
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-paper"
                  >
                    <span>
                      <span className="font-medium text-ink">{ROLE_META[role].label}</span>
                      <br />
                      <span className="text-xs text-muted">{u.name}</span>
                    </span>
                    {user?.role === role && <span className="text-accent">●</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
