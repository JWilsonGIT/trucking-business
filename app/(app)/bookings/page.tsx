"use client";

import { useMemo, useState } from "react";
import { Plus, ArrowRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Field,
  Modal,
  BookingStatusBadge,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import {
  getBookings,
  getCustomers,
  getTrucks,
  getDrivers,
  getBookingHistory,
  createBooking,
  assignBooking,
  setBookingStatus,
} from "@/lib/db/queries";
import {
  BOOKING_FLOW,
  BOOKING_STATUS_META,
  type Booking,
  type BookingStatus,
} from "@/lib/db/types";
import { indexBy } from "@/lib/selectors";
import { formatDate, formatMoney, formatDateTime } from "@/lib/utils";

export default function BookingsPage() {
  const bookings = useQuery("bookings", getBookings);
  const customers = useQuery("customers", getCustomers);
  const trucks = useQuery("trucks", getTrucks);
  const drivers = useQuery("drivers", getDrivers);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [filter, setFilter] = useState<BookingStatus | "all">("all");

  const custMap = useMemo(() => indexBy(customers.data ?? []), [customers.data]);
  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);
  const driverMap = useMemo(() => indexBy(drivers.data ?? []), [drivers.data]);

  const rows = (bookings.data ?? []).filter((b) => filter === "all" || b.status === filter);
  // keep the selected booking in sync with refetched data
  const live = selected ? (bookings.data ?? []).find((b) => b.id === selected.id) ?? selected : null;

  const columns: Column<Booking>[] = [
    { key: "no", header: "Booking", render: (b) => <span className="font-mono font-medium text-ink">{b.booking_no}</span> },
    {
      key: "customer",
      header: "Customer",
      render: (b) => (b.customer_id ? custMap[b.customer_id]?.customer_name ?? "—" : "—"),
    },
    {
      key: "route",
      header: "Route",
      render: (b) => (
        <span className="text-ink-500">
          {b.pickup_location || "?"} <ArrowRight size={11} className="inline" /> {b.delivery_location || "?"}
        </span>
      ),
    },
    { key: "date", header: "Date", render: (b) => formatDate(b.booking_date) },
    {
      key: "assigned",
      header: "Truck / Driver",
      render: (b) => (
        <div className="text-xs">
          <p className="font-mono text-ink">{b.truck_id ? truckMap[b.truck_id]?.plate_number ?? "—" : "—"}</p>
          <p className="text-muted">{b.driver_id ? driverMap[b.driver_id]?.name ?? "—" : "Unassigned"}</p>
        </div>
      ),
    },
    { key: "rate", header: "Rate", align: "right", render: (b) => formatMoney(b.rate) },
    { key: "status", header: "Status", render: (b) => <BookingStatusBadge status={b.status} /> },
  ];

  const loading = bookings.loading || customers.loading || trucks.loading || drivers.loading;
  const error = bookings.error || customers.error || trucks.error || drivers.error;

  return (
    <>
      <TopBar
        heading="Bookings"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> New booking
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
            <div className="flex flex-wrap gap-1.5">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                All ({bookings.data?.length ?? 0})
              </FilterChip>
              {BOOKING_FLOW.map((s) => (
                <FilterChip key={s} active={filter === s} onClick={() => setFilter(s)}>
                  {BOOKING_STATUS_META[s].label}
                </FilterChip>
              ))}
            </div>
            <DataTable
              columns={columns}
              rows={rows}
              onRowClick={(b) => setSelected(b)}
              empty={{ title: "No bookings", hint: "Create a booking to dispatch a delivery." }}
            />
          </>
        )}
      </div>

      {creating && (
        <BookingModal
          customers={customers.data ?? []}
          onClose={() => setCreating(false)}
        />
      )}
      {live && (
        <BookingDetailModal
          booking={live}
          custName={live.customer_id ? custMap[live.customer_id]?.customer_name : undefined}
          trucks={trucks.data ?? []}
          drivers={drivers.data ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? "border-ink bg-ink text-white" : "border-line bg-surface text-ink-500 hover:bg-paper"
      }`}
    >
      {children}
    </button>
  );
}

function BookingModal({
  customers,
  onClose,
}: {
  customers: { id: string; customer_name: string }[];
  onClose: () => void;
}) {
  const create = useMutation(createBooking);
  const [form, setForm] = useState({
    customer_id: customers[0]?.id ?? "",
    pickup_location: "",
    delivery_location: "",
    booking_date: new Date().toISOString().slice(0, 10),
    cargo_description: "",
    weight: "",
    rate: "",
    notes: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_id) return;
    await create.mutate({
      customer_id: form.customer_id,
      pickup_location: form.pickup_location || null,
      delivery_location: form.delivery_location || null,
      booking_date: form.booking_date,
      cargo_description: form.cargo_description || null,
      weight: form.weight ? Number(form.weight) : null,
      rate: form.rate ? Number(form.rate) : 0,
      notes: form.notes || null,
    });
    onClose();
  }

  return (
    <Modal title="New booking" subtitle="A booking number is generated automatically." onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Customer" required>
          <select
            className={selectCls}
            value={form.customer_id}
            onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pickup location">
            <input className={inputCls} value={form.pickup_location} onChange={(e) => setForm({ ...form, pickup_location: e.target.value })} />
          </Field>
          <Field label="Delivery location">
            <input className={inputCls} value={form.delivery_location} onChange={(e) => setForm({ ...form, delivery_location: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date">
            <input className={inputCls} type="date" value={form.booking_date} onChange={(e) => setForm({ ...form, booking_date: e.target.value })} />
          </Field>
          <Field label="Weight (tons)">
            <input className={inputCls} type="number" step="0.1" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Field>
          <Field label="Rate (₱)">
            <input className={inputCls} type="number" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
          </Field>
        </div>
        <Field label="Cargo description">
          <input className={inputCls} value={form.cargo_description} onChange={(e) => setForm({ ...form, cargo_description: e.target.value })} />
        </Field>
        <Field label="Notes">
          <textarea className={textareaCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {create.error && <p className="text-sm text-hazard">{create.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={create.pending}>
            {create.pending ? "Creating…" : "Create booking"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function BookingDetailModal({
  booking,
  custName,
  trucks,
  drivers,
  onClose,
}: {
  booking: Booking;
  custName?: string;
  trucks: { id: string; plate_number: string }[];
  drivers: { id: string; name: string }[];
  onClose: () => void;
}) {
  const history = useQuery(`history-${booking.id}`, () => getBookingHistory(booking.id));
  const assign = useMutation((t: string | null, d: string | null) => assignBooking(booking.id, t, d));
  const advance = useMutation((to: BookingStatus, from: BookingStatus) =>
    setBookingStatus(booking.id, to, from),
  );
  const [truckId, setTruckId] = useState(booking.truck_id ?? "");
  const [driverId, setDriverId] = useState(booking.driver_id ?? "");

  const idx = BOOKING_FLOW.indexOf(booking.status);
  const next = idx >= 0 && idx < BOOKING_FLOW.length - 1 ? BOOKING_FLOW[idx + 1] : null;

  return (
    <Modal title={`Booking ${booking.booking_no}`} subtitle={custName} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Info label="Route" value={`${booking.pickup_location || "?"} → ${booking.delivery_location || "?"}`} />
          <Info label="Date" value={formatDate(booking.booking_date)} />
          <Info label="Cargo" value={booking.cargo_description || "—"} />
          <Info label="Weight" value={booking.weight ? `${booking.weight} t` : "—"} />
          <Info label="Rate" value={formatMoney(booking.rate)} />
          <Info label="Status" value={<BookingStatusBadge status={booking.status} />} />
        </div>

        {/* Assign */}
        <div className="rounded-xl border border-line p-4">
          <p className="label-mono mb-2">Assign truck &amp; driver</p>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Truck</span>
              <select className={selectCls} value={truckId} onChange={(e) => setTruckId(e.target.value)}>
                <option value="">— none —</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.plate_number}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-xs text-muted">Driver</span>
              <select className={selectCls} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">— none —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="outline"
              disabled={assign.pending}
              onClick={() => assign.mutate(truckId || null, driverId || null)}
            >
              {assign.pending ? "Saving…" : "Save assignment"}
            </Button>
          </div>
        </div>

        {/* Status flow */}
        <div className="rounded-xl border border-line p-4">
          <p className="label-mono mb-2">Status flow</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {BOOKING_FLOW.map((s, i) => (
              <span key={s} className="flex items-center gap-1.5">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    i <= idx ? "text-white" : "text-muted"
                  }`}
                  style={{ background: i <= idx ? BOOKING_STATUS_META[s].color : "var(--color-line)" }}
                >
                  {BOOKING_STATUS_META[s].label}
                </span>
                {i < BOOKING_FLOW.length - 1 && <ArrowRight size={12} className="text-muted" />}
              </span>
            ))}
          </div>
          {next && (
            <Button
              variant="accent"
              className="mt-3"
              disabled={advance.pending}
              onClick={() => advance.mutate(next, booking.status)}
            >
              {advance.pending ? "Updating…" : `Advance to ${BOOKING_STATUS_META[next].label}`}
            </Button>
          )}
          {advance.error && <p className="mt-2 text-sm text-hazard">{advance.error}</p>}
        </div>

        {/* History */}
        <div>
          <p className="label-mono mb-2">Status history</p>
          {history.loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (
            <ul className="space-y-1.5">
              {(history.data ?? []).map((h) => (
                <li key={h.id} className="flex items-center gap-2 text-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <span className="text-ink">
                    {h.from_status ? `${BOOKING_STATUS_META[h.from_status].label} → ` : ""}
                    <span className="font-medium">{BOOKING_STATUS_META[h.to_status].label}</span>
                  </span>
                  <span className="ml-auto text-xs text-muted">{formatDateTime(h.created_at)}</span>
                </li>
              ))}
              {(history.data ?? []).length === 0 && <li className="text-sm text-muted">No history yet.</li>}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className="text-ink">{value}</p>
    </div>
  );
}
