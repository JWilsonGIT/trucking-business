"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import { StatTile, DonutStat, LegendRow } from "@/components/charts";
import { BookingStatusBadge, PageSkeleton, LoadError } from "@/components/primitives";
import { useQuery } from "@/lib/db/hooks";
import { getBookings, getInvoices, getFuelLogs, getMaintenance, getTrucks, getCustomers } from "@/lib/db/queries";
import { TRUCK_STATUS_META, type TruckStatus } from "@/lib/db/types";
import { dashboardMetrics, fleetAlerts, indexBy } from "@/lib/selectors";
import { formatMoney, formatDate } from "@/lib/utils";

export default function DashboardPage() {
  const bookings = useQuery("bookings", getBookings);
  const invoices = useQuery("invoices", getInvoices);
  const fuel = useQuery("fuel", getFuelLogs);
  const maintenance = useQuery("maintenance", getMaintenance);
  const trucks = useQuery("trucks", getTrucks);
  const customers = useQuery("customers", getCustomers);

  const loading =
    bookings.loading || invoices.loading || fuel.loading || maintenance.loading || trucks.loading;
  const error = bookings.error || invoices.error || fuel.error || maintenance.error || trucks.error;

  const m = useMemo(
    () =>
      dashboardMetrics(
        bookings.data ?? [],
        invoices.data ?? [],
        fuel.data ?? [],
        maintenance.data ?? [],
        trucks.data ?? [],
      ),
    [bookings.data, invoices.data, fuel.data, maintenance.data, trucks.data],
  );
  const alerts = useMemo(() => fleetAlerts(trucks.data ?? []), [trucks.data]);
  const custMap = useMemo(() => indexBy(customers.data ?? []), [customers.data]);
  const recent = (bookings.data ?? []).slice(0, 6);

  const statuses = Object.keys(TRUCK_STATUS_META) as TruckStatus[];
  const truckTotal = statuses.reduce((s, k) => s + m.truckStatus[k], 0);

  return (
    <>
      <TopBar heading="Dashboard" />
      <div className="space-y-4 p-6">
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <LoadError message={error} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
              <StatTile label="Total Deliveries" value={m.totalDeliveries} />
              <StatTile label="Revenue Today" value={formatMoney(m.revenueToday)} accent="var(--color-fleet)" />
              <StatTile label="Revenue Monthly" value={formatMoney(m.revenueMonth)} accent="var(--color-fleet)" />
              <StatTile label="Fuel Cost (mo)" value={formatMoney(m.fuelCostMonth)} accent="var(--color-accent)" />
              <StatTile label="Maintenance (mo)" value={formatMoney(m.maintCostMonth)} accent="var(--color-accent)" />
              <StatTile label="Outstanding" value={formatMoney(m.outstanding)} accent="var(--color-hazard)" />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Truck status" href="/trucks" action="Manage">
                <div className="flex items-center gap-6">
                  <DonutStat
                    total={truckTotal}
                    centerLabel={String(truckTotal)}
                    segments={statuses.map((s) => ({
                      label: TRUCK_STATUS_META[s].label,
                      value: m.truckStatus[s],
                      color: TRUCK_STATUS_META[s].color,
                    }))}
                  />
                  <LegendRow
                    className="flex-1"
                    items={statuses.map((s) => ({
                      label: TRUCK_STATUS_META[s].label,
                      value: m.truckStatus[s],
                      color: TRUCK_STATUS_META[s].color,
                    }))}
                  />
                </div>
              </Panel>

              <Panel title="Fleet alerts" href="/maintenance" action="View">
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted">No expiry or scheduled-service alerts.</p>
                ) : (
                  <ul className="space-y-2">
                    {alerts.slice(0, 5).map((a, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm">
                        {a.severity === "danger" ? (
                          <ShieldAlert size={16} className="text-hazard" />
                        ) : (
                          <AlertTriangle size={16} className="text-accent" />
                        )}
                        <span className="font-mono font-medium text-ink">{a.plate}</span>
                        <span className={a.severity === "danger" ? "text-hazard" : "text-ink-500"}>
                          {a.message}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            </div>

            <Panel title="Recent bookings" href="/bookings" action="All bookings">
              <ul className="divide-y divide-line">
                {recent.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-2.5">
                    <span className="font-mono text-sm font-medium text-ink">{b.booking_no}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-500">
                      {b.customer_id ? custMap[b.customer_id]?.customer_name ?? "—" : "—"}
                      <span className="text-muted">
                        {" · "}
                        {b.pickup_location} <ArrowRight size={10} className="inline" /> {b.delivery_location}
                      </span>
                    </span>
                    <span className="hidden text-xs text-muted sm:block">{formatDate(b.booking_date)}</span>
                    <BookingStatusBadge status={b.status} />
                  </li>
                ))}
                {recent.length === 0 && <li className="py-3 text-sm text-muted">No bookings yet.</li>}
              </ul>
              <Link href="/bookings" className="mt-2 inline-block text-xs font-medium text-fleet hover:underline">
                Go to bookings →
              </Link>
            </Panel>
          </>
        )}
      </div>
    </>
  );
}
