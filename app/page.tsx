"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
    else router.replace(user.role === "driver" ? "/my-trips" : "/dashboard");
  }, [ready, user, router]);

  return (
    <div className="flex h-screen items-center justify-center text-muted">
      <span className="label-mono">Loading Fleet Ops…</span>
    </div>
  );
}
