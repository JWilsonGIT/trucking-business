"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  IdCard,
  Truck,
  Route,
  Fuel,
  Wrench,
  Receipt,
  FileText,
  MapPin,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { ROLE_META, type Role } from "@/lib/db/types";
import { Avatar } from "./primitives";
import { cn } from "@/lib/utils";

const NAV: { href: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  { href: "/my-trips", label: "My Trips", icon: MapPin, roles: ["driver"] },
  { href: "/bookings", label: "Bookings", icon: ClipboardList, roles: ["owner"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["owner"] },
  { href: "/drivers", label: "Drivers", icon: IdCard, roles: ["owner"] },
  { href: "/trucks", label: "Trucks", icon: Truck, roles: ["owner"] },
  { href: "/trips", label: "Trip Monitor", icon: Route, roles: ["owner"] },
  { href: "/fuel", label: "Fuel", icon: Fuel, roles: ["owner", "driver"] },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, roles: ["owner"] },
  { href: "/expenses", label: "Expenses", icon: Receipt, roles: ["owner", "driver"] },
  { href: "/billing", label: "Billing", icon: FileText, roles: ["owner"] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  if (!user) return null;

  const items = NAV.filter((n) => n.roles.includes(user.role));

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-ink text-white/80">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-lg font-bold text-ink">
          F
        </span>
        <div className="leading-tight">
          <p className="font-display text-[15px] font-semibold text-white">Fleet Ops</p>
          <p className="text-[10px] tracking-wide text-white/45">TRUCKING SYSTEM</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-white/10 font-medium text-white"
                  : "hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon size={17} className={active ? "text-accent" : ""} />
              <span className="flex-1">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <Avatar name={user.name} color={user.avatar_color} size={32} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-[11px] text-white/45">{ROLE_META[user.role].label}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
