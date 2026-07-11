"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Panel } from "@/components/Panel";
import { StatTile, BarChart } from "@/components/charts";
import {
  Button,
  Field,
  Modal,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import { getFuelLogs, getTrucks, getDrivers, createFuelLog } from "@/lib/db/queries";
import { useAuth } from "@/lib/auth";
import type { FuelLog } from "@/lib/db/types";
import { fuelReport, indexBy } from "@/lib/selectors";
import { formatDate, formatMoney, formatNumber } from "@/lib/utils";

export default function FuelPage() {
  const logs = useQuery("fuel", getFuelLogs);
  const trucks = useQuery("trucks", getTrucks);
  const drivers = useQuery("drivers", getDrivers);
  const [creating, setCreating] = useState(false);

  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);
  const driverMap = useMemo(() => indexBy(drivers.data ?? []), [drivers.data]);
  const report = useMemo(() => fuelReport(logs.data ?? []), [logs.data]);

  const columns: Column<FuelLog>[] = [
    { key: "date", header: "Date", render: (f) => formatDate(f.log_date) },
    { key: "truck", header: "Truck", render: (f) => (f.truck_id ? truckMap[f.truck_id]?.plate_number ?? "—" : "—") },
    { key: "driver", header: "Driver", render: (f) => (f.driver_id ? driverMap[f.driver_id]?.name ?? "—" : "—") },
    { key: "odo", header: "Odometer", align: "right", render: (f) => (f.odometer ? `${formatNumber(f.odometer)} km` : "—") },
    { key: "liters", header: "Liters", align: "right", render: (f) => `${formatNumber(f.liters, 1)} L` },
    { key: "cost", header: "Cost", align: "right", render: (f) => formatMoney(f.cost) },
  ];

  return (
    <>
      <TopBar
        heading="Fuel"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> Log fuel
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {logs.loading ? (
          <PageSkeleton />
        ) : logs.error ? (
          <LoadError message={logs.error} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Total fuel cost" value={formatMoney(report.totalCost)} accent="var(--color-accent)" />
              <StatTile label="Total liters" value={`${formatNumber(report.totalLiters, 0)} L`} />
              <StatTile label="Distance (odo)" value={`${formatNumber(report.totalDistanceKm)} km`} />
              <StatTile
                label="Cost per km"
                value={report.costPerKm > 0 ? formatMoney(report.costPerKm) : "—"}
                accent="var(--color-fleet)"
              />
            </div>

            {report.monthly.length > 0 && (
              <Panel title="Monthly fuel cost">
                <BarChart
                  data={report.monthly.map((m) => ({
                    label: m.month.slice(5),
                    value: Math.round(m.cost),
                    color: "var(--color-accent)",
                  }))}
                />
              </Panel>
            )}

            <DataTable
              columns={columns}
              rows={logs.data ?? []}
              empty={{ title: "No fuel logs", hint: "Record a fuel purchase to track consumption." }}
            />
          </>
        )}
      </div>

      {creating && (
        <FuelModal
          trucks={trucks.data ?? []}
          drivers={drivers.data ?? []}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function FuelModal({
  trucks,
  drivers,
  onClose,
}: {
  trucks: { id: string; plate_number: string }[];
  drivers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const create = useMutation(createFuelLog);
  const [form, setForm] = useState({
    log_date: new Date().toISOString().slice(0, 10),
    truck_id: trucks[0]?.id ?? "",
    driver_id: user?.driver_id ?? drivers[0]?.id ?? "",
    odometer: "",
    liters: "",
    cost: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutate({
      log_date: form.log_date,
      truck_id: form.truck_id || null,
      driver_id: form.driver_id || null,
      odometer: form.odometer ? Number(form.odometer) : null,
      liters: form.liters ? Number(form.liters) : 0,
      cost: form.cost ? Number(form.cost) : 0,
    });
    onClose();
  }

  return (
    <Modal title="Log fuel purchase" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <input className={inputCls} type="date" value={form.log_date} onChange={(e) => setForm({ ...form, log_date: e.target.value })} />
          </Field>
          <Field label="Truck">
            <select className={selectCls} value={form.truck_id} onChange={(e) => setForm({ ...form, truck_id: e.target.value })}>
              <option value="">— none —</option>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plate_number}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Driver">
          <select className={selectCls} value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">— none —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Odometer (km)">
            <input className={inputCls} type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
          </Field>
          <Field label="Liters">
            <input className={inputCls} type="number" step="0.1" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} />
          </Field>
          <Field label="Cost (₱)">
            <input className={inputCls} type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
        </div>
        {create.error && <p className="text-sm text-hazard">{create.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={create.pending}>
            {create.pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
