"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Truck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_META, type Role } from "@/lib/db/types";
import { Avatar } from "@/components/primitives";

const BLURB: Record<Role, string> = {
  owner: "Full fleet — bookings, trucks, drivers, fuel, maintenance, billing & reports",
  driver: "Your assigned trips — update status, upload delivery photos, log fuel & expenses",
};

export default function LoginPage() {
  const { user, users, ready, login } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "driver" ? "/my-trips" : "/dashboard");
    }
  }, [ready, user, router]);

  function handleLogin(userId: string, role: Role) {
    login(userId);
    router.replace(role === "driver" ? "/my-trips" : "/dashboard");
  }

  const demoUsers = (["owner", "driver"] as Role[])
    .map((role) => users.find((u) => u.role === role))
    .filter(Boolean);

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <section className="relative hidden flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent font-display text-xl font-bold text-ink">
            F
          </span>
          <span className="font-display text-lg font-semibold">Fleet Ops</span>
        </div>
        <div className="max-w-md">
          <p className="label-mono mb-4 text-accent">Trucking management system</p>
          <h1 className="font-display text-4xl font-semibold leading-tight">
            Run every delivery from one dispatch deck.
          </h1>
          <p className="mt-4 text-white/60">
            Track bookings from pickup to collection, keep trucks and drivers moving, and
            watch fuel, maintenance and cash in one place.
          </p>
          <ul className="mt-8 space-y-2 text-sm text-white/70">
            {[
              "Bookings with a full status flow",
              "Fuel, maintenance & expense tracking",
              "Invoices, collections & profit reports",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/40">St. Joseph Group · Internal logistics system</p>
      </section>

      {/* Login panel */}
      <section className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-ink">
              F
            </span>
            <span className="font-display text-lg font-semibold text-ink">Fleet Ops</span>
          </div>
          <p className="label-mono">Choose a demo account</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">
            Pick a role to explore the system. You can switch anytime from the top bar.
          </p>

          <div className="mt-6 space-y-3">
            {!ready && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Truck size={16} /> Loading accounts…
              </div>
            )}
            {demoUsers.map((u) => (
              <button
                key={u!.id}
                onClick={() => handleLogin(u!.id, u!.role)}
                className="group flex w-full items-center gap-3 rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:border-accent hover:bg-paper"
              >
                <Avatar name={u!.name} color={u!.avatar_color} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {u!.name}
                    <span className="label-mono">{ROLE_META[u!.role].label}</span>
                  </p>
                  <p className="truncate text-xs text-muted">{BLURB[u!.role]}</p>
                </div>
                <ArrowRight
                  size={18}
                  className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                />
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
