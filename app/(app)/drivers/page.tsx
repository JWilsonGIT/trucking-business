"use client";

import { useState } from "react";
import { Plus, Pencil, AlertTriangle } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Field,
  Modal,
  Pill,
  PageSkeleton,
  LoadError,
  inputCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import { getDrivers, createDriver, updateDriver } from "@/lib/db/queries";
import type { Driver } from "@/lib/db/types";
import { formatDate, daysUntil } from "@/lib/utils";

export default function DriversPage() {
  const drivers = useQuery("drivers", getDrivers);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [creating, setCreating] = useState(false);

  const columns: Column<Driver>[] = [
    { key: "name", header: "Driver", render: (d) => <span className="font-medium text-ink">{d.name}</span> },
    { key: "license", header: "License #", render: (d) => <span className="font-mono">{d.license_number || "—"}</span> },
    {
      key: "exp",
      header: "License expiry",
      render: (d) => {
        const days = daysUntil(d.license_expiration);
        const warn = days !== null && days <= 30;
        return (
          <span className={warn ? "flex items-center gap-1 font-medium text-hazard" : "text-ink"}>
            {warn && <AlertTriangle size={13} />}
            {formatDate(d.license_expiration)}
          </span>
        );
      },
    },
    { key: "contact", header: "Contact", render: (d) => d.contact_number || "—" },
    { key: "emergency", header: "Emergency contact", render: (d) => d.emergency_contact || "—" },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <Pill label={d.status === "active" ? "Active" : "Inactive"} color={d.status === "active" ? "#2f8f5b" : "#94a3b8"} />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (d) => (
        <button
          onClick={() => setEditing(d)}
          className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
          aria-label="Edit driver"
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  return (
    <>
      <TopBar
        heading="Drivers"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add driver
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {drivers.loading ? (
          <PageSkeleton />
        ) : drivers.error ? (
          <LoadError message={drivers.error} />
        ) : (
          <DataTable
            columns={columns}
            rows={drivers.data ?? []}
            empty={{ title: "No drivers yet", hint: "Add drivers to assign them to bookings." }}
          />
        )}
      </div>

      {(creating || editing) && (
        <DriverModal driver={editing} onClose={() => (setCreating(false), setEditing(null))} />
      )}
    </>
  );
}

function DriverModal({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const create = useMutation(createDriver);
  const update = useMutation((id: string, patch: Partial<Driver>) => updateDriver(id, patch));
  const [form, setForm] = useState({
    name: driver?.name ?? "",
    license_number: driver?.license_number ?? "",
    license_expiration: driver?.license_expiration ?? "",
    contact_number: driver?.contact_number ?? "",
    emergency_contact: driver?.emergency_contact ?? "",
    status: driver?.status ?? "active",
  });
  const busy = create.pending || update.pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      license_number: form.license_number || null,
      license_expiration: form.license_expiration || null,
      contact_number: form.contact_number || null,
      emergency_contact: form.emergency_contact || null,
      status: form.status,
    };
    if (driver) await update.mutate(driver.id, payload);
    else await create.mutate(payload);
    onClose();
  }

  return (
    <Modal title={driver ? "Edit driver" : "New driver"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Name" required>
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            autoFocus
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="License number">
            <input
              className={inputCls}
              value={form.license_number}
              onChange={(e) => setForm({ ...form, license_number: e.target.value })}
            />
          </Field>
          <Field label="License expiry">
            <input
              className={inputCls}
              type="date"
              value={form.license_expiration}
              onChange={(e) => setForm({ ...form, license_expiration: e.target.value })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact number">
            <input
              className={inputCls}
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            />
          </Field>
          <Field label="Emergency contact">
            <input
              className={inputCls}
              value={form.emergency_contact}
              onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            className={inputCls}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
        {(create.error || update.error) && (
          <p className="text-sm text-hazard">{create.error || update.error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : driver ? "Save changes" : "Add driver"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
