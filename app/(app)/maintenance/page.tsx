"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, AlertTriangle, ShieldAlert } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Panel } from "@/components/Panel";
import {
  Button,
  Field,
  Modal,
  MaintStatusBadge,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import { getMaintenance, getTrucks, createMaintenance, updateMaintenance } from "@/lib/db/queries";
import {
  MAINT_STATUS_META,
  MAINT_TYPE_LABELS,
  type Maintenance,
  type MaintStatus,
  type MaintType,
} from "@/lib/db/types";
import { fleetAlerts, indexBy } from "@/lib/selectors";
import { formatDate, formatMoney } from "@/lib/utils";

const TYPES = Object.keys(MAINT_TYPE_LABELS) as MaintType[];
const STATUSES = Object.keys(MAINT_STATUS_META) as MaintStatus[];

export default function MaintenancePage() {
  const records = useQuery("maintenance", getMaintenance);
  const trucks = useQuery("trucks", getTrucks);
  const [editing, setEditing] = useState<Maintenance | null>(null);
  const [creating, setCreating] = useState(false);

  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);
  const alerts = useMemo(() => fleetAlerts(trucks.data ?? []), [trucks.data]);

  const columns: Column<Maintenance>[] = [
    { key: "truck", header: "Truck", render: (m) => <span className="font-mono">{m.truck_id ? truckMap[m.truck_id]?.plate_number ?? "—" : "—"}</span> },
    { key: "type", header: "Type", render: (m) => MAINT_TYPE_LABELS[m.maintenance_type] },
    { key: "issue", header: "Issue", render: (m) => m.issue || "—" },
    { key: "reported", header: "Reported", render: (m) => formatDate(m.date_reported) },
    { key: "mechanic", header: "Mechanic", render: (m) => m.mechanic || "—" },
    { key: "cost", header: "Cost", align: "right", render: (m) => formatMoney(m.cost) },
    { key: "status", header: "Status", render: (m) => <MaintStatusBadge status={m.status} /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (m) => (
        <button onClick={() => setEditing(m)} className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink" aria-label="Edit">
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  const loading = records.loading || trucks.loading;
  const error = records.error || trucks.error;

  return (
    <>
      <TopBar
        heading="Maintenance"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> New request
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <LoadError message={error} />
        ) : (
          <>
            <Panel title="Fleet alerts" right={<span className="label-mono">{alerts.length} active</span>}>
              {alerts.length === 0 ? (
                <p className="text-sm text-muted">No registration, insurance, or scheduled-service alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {alerts.map((a, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm">
                      {a.severity === "danger" ? (
                        <ShieldAlert size={16} className="text-hazard" />
                      ) : (
                        <AlertTriangle size={16} className="text-accent" />
                      )}
                      <span className="font-mono font-medium text-ink">{a.plate}</span>
                      <span className="label-mono">{a.kind}</span>
                      <span className={a.severity === "danger" ? "text-hazard" : "text-ink-500"}>
                        {a.message}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <DataTable
              columns={columns}
              rows={records.data ?? []}
              empty={{ title: "No maintenance records", hint: "Log a repair or schedule preventive service." }}
            />
          </>
        )}
      </div>

      {(creating || editing) && (
        <MaintModal
          record={editing}
          trucks={trucks.data ?? []}
          onClose={() => (setCreating(false), setEditing(null))}
        />
      )}
    </>
  );
}

function MaintModal({
  record,
  trucks,
  onClose,
}: {
  record: Maintenance | null;
  trucks: { id: string; plate_number: string }[];
  onClose: () => void;
}) {
  const create = useMutation(createMaintenance);
  const update = useMutation((id: string, patch: Partial<Maintenance>) => updateMaintenance(id, patch));
  const [form, setForm] = useState({
    truck_id: record?.truck_id ?? trucks[0]?.id ?? "",
    maintenance_type: (record?.maintenance_type ?? "corrective") as MaintType,
    issue: record?.issue ?? "",
    date_reported: record?.date_reported ?? new Date().toISOString().slice(0, 10),
    scheduled_date: record?.scheduled_date ?? "",
    mechanic: record?.mechanic ?? "",
    cost: record?.cost?.toString() ?? "",
    status: (record?.status ?? "reported") as MaintStatus,
  });
  const busy = create.pending || update.pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      truck_id: form.truck_id || null,
      maintenance_type: form.maintenance_type,
      issue: form.issue || null,
      date_reported: form.date_reported,
      scheduled_date: form.scheduled_date || null,
      mechanic: form.mechanic || null,
      cost: form.cost ? Number(form.cost) : 0,
      status: form.status,
    };
    if (record) await update.mutate(record.id, payload);
    else await create.mutate(payload);
    onClose();
  }

  return (
    <Modal title={record ? "Update maintenance" : "New maintenance request"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Truck">
            <select className={selectCls} value={form.truck_id} onChange={(e) => setForm({ ...form, truck_id: e.target.value })}>
              {trucks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.plate_number}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Type">
            <select className={selectCls} value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value as MaintType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {MAINT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Issue">
          <input className={inputCls} value={form.issue} onChange={(e) => setForm({ ...form, issue: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date reported">
            <input className={inputCls} type="date" value={form.date_reported} onChange={(e) => setForm({ ...form, date_reported: e.target.value })} />
          </Field>
          <Field label="Scheduled date">
            <input className={inputCls} type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mechanic">
            <input className={inputCls} value={form.mechanic} onChange={(e) => setForm({ ...form, mechanic: e.target.value })} />
          </Field>
          <Field label="Cost (₱)">
            <input className={inputCls} type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
          </Field>
        </div>
        <Field label="Status">
          <select className={selectCls} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MaintStatus })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {MAINT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </Field>
        {(create.error || update.error) && <p className="text-sm text-hazard">{create.error || update.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : record ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
