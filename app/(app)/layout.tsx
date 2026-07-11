"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";

const DRIVER_PATHS = ["/my-trips", "/fuel", "/expenses"];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    // Route-guard: drivers only reach their workspace.
    if (user.role === "driver" && !DRIVER_PATHS.some((p) => pathname.startsWith(p))) {
      router.replace("/my-trips");
    }
  }, [ready, user, pathname, router]);

  if (!ready || !user) {
    return (
      <div className="flex h-screen items-center justify-center text-muted">
        <span className="label-mono">Loading Fleet Ops…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-y-auto scrollbar-thin">{children}</div>
    </div>
  );
}
