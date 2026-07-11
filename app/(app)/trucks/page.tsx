"use client";

import { useState } from "react";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Field,
  Modal,
  TruckStatusBadge,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import { getTrucks, createTruck, updateTruck } from "@/lib/db/queries";
import { TRUCK_STATUS_META, type Truck, type TruckStatus } from "@/lib/db/types";
import { formatDate, formatNumber, daysUntil } from "@/lib/utils";

const STATUSES = Object.keys(TRUCK_STATUS_META) as TruckStatus[];

function ExpiryCell({ date }: { date: string | null }) {
  const d = daysUntil(date);
  const warn = d !== null && d <= 30;
  return (
    <span className={warn ? "flex items-center gap-1 font-medium text-hazard" : "text-ink"}>
      {warn && <AlertTriangle size={13} />}
      {formatDate(date)}
    </span>
  );
}

export default function TrucksPage() {
  const trucks = useQuery("trucks", getTrucks);
  const [editing, setEditing] = useState<Truck | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Truck>[] = [
    {
      key: "plate",
      header: "Plate / Model",
      render: (t) => (
        <div>
          <p className="font-mono font-medium text-ink">{t.plate_number}</p>
          <p className="text-xs text-muted">
            {t.truck_type}
            {t.model ? ` · ${t.model}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "capacity",
      header: "Capacity",
      render: (t) => (t.capacity ? `${formatNumber(t.capacity, 2)} t` : "—"),
    },
    {
      key: "odo",
      header: "Odometer",
      align: "right",
      render: (t) => <span className="font-mono">{formatNumber(t.odometer)} km</span>,
    },
    { key: "reg", header: "Registration", render: (t) => <ExpiryCell date={t.registration_expiry} /> },
    { key: "ins", header: "Insurance", render: (t) => <ExpiryCell date={t.insurance_expiry} /> },
    { key: "status", header: "Status", render: (t) => <TruckStatusBadge status={t.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <button
          onClick={() => setEditing(t)}
          className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
          aria-label="Edit truck"
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  return (
    <>
      <TopBar
        heading="Trucks"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add truck
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {trucks.loading ? (
          <PageSkeleton />
        ) : trucks.error ? (
          <LoadError message={trucks.error} />
        ) : (
          <DataTable
            columns={columns}
            rows={trucks.data ?? []}
            empty={{ title: "No trucks yet", hint: "Add a vehicle to your fleet." }}
          />
        )}
      </div>

      {(creating || editing) && (
        <TruckModal truck={editing} onClose={() => (setCreating(false), setEditing(null))} />
      )}
    </>
  );
}

function TruckModal({ truck, onClose }: { truck: Truck | null; onClose: () => void }) {
  const create = useMutation(createTruck);
  const update = useMutation((id: string, patch: Partial<Truck>) => updateTruck(id, patch));
  const [form, setForm] = useState({
    plate_number: truck?.plate_number ?? "",
    truck_type: truck?.truck_type ?? "",
    model: truck?.model ?? "",
    capacity: truck?.capacity?.toString() ?? "",
    registration_expiry: truck?.registration_expiry ?? "",
    insurance_expiry: truck?.insurance_expiry ?? "",
    odometer: truck?.odometer?.toString() ?? "0",
    status: (truck?.status ?? "available") as TruckStatus,
  });
  const busy = create.pending || update.pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plate_number.trim()) return;
    const payload = {
      plate_number: form.plate_number.trim(),
      truck_type: form.truck_type || null,
      model: form.model || null,
      capacity: form.capacity ? Number(form.capacity) : null,
      registration_expiry: form.registration_expiry || null,
      insurance_expiry: form.insurance_expiry || null,
      odometer: Number(form.odometer) || 0,
      status: form.status,
    };
    if (truck) await update.mutate(truck.id, payload);
    else await create.mutate(payload);
    onClose();
  }

  return (
    <Modal title={truck ? "Edit truck" : "New truck"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Plate number" required>
            <input
              className={inputCls}
              value={form.plate_number}
              onChange={(e) => setForm({ ...form, plate_number: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="Truck type">
            <input
              className={inputCls}
              placeholder="6-Wheeler"
              value={form.truck_type}
              onChange={(e) => setForm({ ...form, truck_type: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Model">
            <input
              className={inputCls}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
          </Field>
          <Field label="Capacity (tons)">
            <input
              className={inputCls}
              type="number"
              step="0.1"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Registration expiry">
            <input
              className={inputCls}
              type="date"
              value={form.registration_expiry}
              onChange={(e) => setForm({ ...form, registration_expiry: e.target.value })}
            />
          </Field>
          <Field label="Insurance expiry">
            <input
              className={inputCls}
              type="date"
              value={form.insurance_expiry}
              onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Odometer (km)">
            <input
              className={inputCls}
              type="number"
              value={form.odometer}
              onChange={(e) => setForm({ ...form, odometer: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <select
              className={selectCls}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TruckStatus })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {TRUCK_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {(create.error || update.error) && (
          <p className="text-sm text-hazard">{create.error || update.error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : truck ? "Save changes" : "Add truck"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
