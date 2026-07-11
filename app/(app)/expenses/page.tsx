"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { Panel } from "@/components/Panel";
import {
  Button,
  Field,
  Modal,
  Pill,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import {
  getExpenses,
  getBookings,
  getTrucks,
  getDrivers,
  getMaintenance,
  createExpense,
} from "@/lib/db/queries";
import { useAuth } from "@/lib/auth";
import { EXPENSE_TYPE_META, type Expense, type ExpenseType } from "@/lib/db/types";
import { monthlyProfit, indexBy } from "@/lib/selectors";
import { formatDate, formatMoney } from "@/lib/utils";
import { can } from "@/lib/permissions";

const TYPES = Object.keys(EXPENSE_TYPE_META) as ExpenseType[];

export default function ExpensesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";
  const expenses = useQuery("expenses", getExpenses);
  const bookings = useQuery("bookings", getBookings);
  const trucks = useQuery("trucks", getTrucks);
  const drivers = useQuery("drivers", getDrivers);
  const maintenance = useQuery("maintenance", isOwner ? getMaintenance : async () => []);
  const [creating, setCreating] = useState(false);

  const bookMap = useMemo(() => indexBy(bookings.data ?? []), [bookings.data]);
  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);
  const pnl = useMemo(
    () => monthlyProfit(bookings.data ?? [], expenses.data ?? [], maintenance.data ?? []),
    [bookings.data, expenses.data, maintenance.data],
  );

  const columns: Column<Expense>[] = [
    { key: "date", header: "Date", render: (e) => formatDate(e.expense_date) },
    {
      key: "type",
      header: "Type",
      render: (e) => <Pill label={EXPENSE_TYPE_META[e.expense_type].label} color={EXPENSE_TYPE_META[e.expense_type].color} />,
    },
    { key: "amount", header: "Amount", align: "right", render: (e) => <span className="font-medium">{formatMoney(e.amount)}</span> },
    { key: "link", header: "Linked to", render: (e) => (e.booking_id ? bookMap[e.booking_id]?.booking_no : e.truck_id ? truckMap[e.truck_id]?.plate_number : "—") },
    { key: "notes", header: "Notes", render: (e) => e.notes || "—" },
  ];

  return (
    <>
      <TopBar
        heading="Expenses"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add expense
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {expenses.loading ? (
          <PageSkeleton />
        ) : expenses.error ? (
          <LoadError message={expenses.error} />
        ) : (
          <>
            {can(user?.role, "view_reports") && (
              <Panel title="Monthly profit &amp; loss" right={<span className="label-mono">This month</span>}>
                <div className="mx-auto max-w-md space-y-1.5 text-sm">
                  <PnlRow label="Revenue" value={pnl.revenue} strong />
                  <PnlRow label="(−) Fuel" value={-pnl.fuel} />
                  <PnlRow label="(−) Maintenance" value={-pnl.maintenance} />
                  <PnlRow label="(−) Driver salary/allowance" value={-pnl.driverSalary} />
                  <PnlRow label="(−) Other expenses" value={-pnl.other} />
                  <div className="my-1 border-t border-dashed border-line" />
                  <PnlRow
                    label="Net profit"
                    value={pnl.net}
                    strong
                    accent={pnl.net >= 0 ? "var(--color-fleet)" : "var(--color-hazard)"}
                  />
                </div>
              </Panel>
            )}

            <DataTable
              columns={columns}
              rows={expenses.data ?? []}
              empty={{ title: "No expenses", hint: "Record tolls, allowances, repairs and more." }}
            />
          </>
        )}
      </div>

      {creating && (
        <ExpenseModal
          bookings={bookings.data ?? []}
          trucks={trucks.data ?? []}
          drivers={drivers.data ?? []}
          onClose={() => setCreating(false)}
        />
      )}
    </>
  );
}

function PnlRow({
  label,
  value,
  strong,
  accent,
}: {
  label: string;
  value: number;
  strong?: boolean;
  accent?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${strong ? "font-semibold" : ""}`}>
      <span className="text-ink-500">{label}</span>
      <span className="font-mono" style={{ color: accent ?? "var(--color-ink)" }}>
        {formatMoney(value)}
      </span>
    </div>
  );
}

function ExpenseModal({
  bookings,
  trucks,
  drivers,
  onClose,
}: {
  bookings: { id: string; booking_no: string }[];
  trucks: { id: string; plate_number: string }[];
  drivers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { user } = useAuth();
  const create = useMutation(createExpense);
  const [form, setForm] = useState({
    expense_type: "fuel" as ExpenseType,
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
    booking_id: "",
    truck_id: "",
    driver_id: user?.driver_id ?? "",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await create.mutate({
      expense_type: form.expense_type,
      amount: form.amount ? Number(form.amount) : 0,
      expense_date: form.expense_date,
      booking_id: form.booking_id || null,
      truck_id: form.truck_id || null,
      driver_id: form.driver_id || null,
      notes: form.notes || null,
    });
    onClose();
  }

  return (
    <Modal title="Add expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" required>
            <select className={selectCls} value={form.expense_type} onChange={(e) => setForm({ ...form, expense_type: e.target.value as ExpenseType })}>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {EXPENSE_TYPE_META[t].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Amount (₱)" required>
            <input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
          </Field>
        </div>
        <Field label="Date">
          <input className={inputCls} type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Booking (optional)">
            <select className={selectCls} value={form.booking_id} onChange={(e) => setForm({ ...form, booking_id: e.target.value })}>
              <option value="">— none —</option>
              {bookings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.booking_no}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Truck (optional)">
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
        <Field label="Driver (optional)">
          <select className={selectCls} value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })}>
            <option value="">— none —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {create.error && <p className="text-sm text-hazard">{create.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={create.pending}>
            {create.pending ? "Saving…" : "Add expense"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
