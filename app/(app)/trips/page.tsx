"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Field,
  Modal,
  PageSkeleton,
  LoadError,
  inputCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import { getTrips, getBookings, getTrucks, getDrivers, upsertTrip } from "@/lib/db/queries";
import type { Trip } from "@/lib/db/types";
import { indexBy } from "@/lib/selectors";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default function TripsPage() {
  const trips = useQuery("trips", getTrips);
  const bookings = useQuery("bookings", getBookings);
  const trucks = useQuery("trucks", getTrucks);
  const drivers = useQuery("drivers", getDrivers);
  const [editing, setEditing] = useState<Trip | null>(null);

  const bookMap = useMemo(() => indexBy(bookings.data ?? []), [bookings.data]);
  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);
  const driverMap = useMemo(() => indexBy(drivers.data ?? []), [drivers.data]);

  const columns: Column<Trip>[] = [
    {
      key: "booking",
      header: "Booking",
      render: (t) => (
        <span className="font-mono font-medium text-ink">
          {bookMap[t.booking_id]?.booking_no ?? "—"}
        </span>
      ),
    },
    { key: "route", header: "Route", render: (t) => t.route || "—" },
    { key: "truck", header: "Truck", render: (t) => (t.truck_id ? truckMap[t.truck_id]?.plate_number ?? "—" : "—") },
    { key: "driver", header: "Driver", render: (t) => (t.driver_id ? driverMap[t.driver_id]?.name ?? "—" : "—") },
    { key: "dep", header: "Departure", render: (t) => formatDateTime(t.departure_time) },
    { key: "arr", header: "Arrival", render: (t) => formatDateTime(t.arrival_time) },
    {
      key: "dist",
      header: "Distance",
      align: "right",
      render: (t) => (t.distance_km ? `${formatNumber(t.distance_km, 1)} km` : "—"),
    },
    {
      key: "fuel",
      header: "Fuel",
      align: "right",
      render: (t) => (t.fuel_consumed_liters ? `${formatNumber(t.fuel_consumed_liters, 1)} L` : "—"),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (t) => (
        <button
          onClick={() => setEditing(t)}
          className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
          aria-label="Edit trip"
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  const loading = trips.loading || bookings.loading;
  const error = trips.error || bookings.error;

  return (
    <>
      <TopBar heading="Trip Monitor" />
      <div className="space-y-4 p-6">
        {loading ? (
          <PageSkeleton />
        ) : error ? (
          <LoadError message={error} />
        ) : (
          <DataTable
            columns={columns}
            rows={trips.data ?? []}
            empty={{ title: "No trips yet", hint: "Trips appear once bookings are assigned and dispatched." }}
          />
        )}
      </div>

      {editing && <TripModal trip={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function TripModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const save = useMutation((patch: Partial<Trip>) =>
    upsertTrip(trip.booking_id, {
      driver_id: trip.driver_id,
      truck_id: trip.truck_id,
      route: patch.route ?? trip.route,
      departure_time: patch.departure_time ?? trip.departure_time,
      arrival_time: patch.arrival_time ?? trip.arrival_time,
      distance_km: patch.distance_km ?? trip.distance_km,
      fuel_consumed_liters: patch.fuel_consumed_liters ?? trip.fuel_consumed_liters,
    }),
  );

  const toLocal = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
  const [form, setForm] = useState({
    route: trip.route ?? "",
    departure_time: toLocal(trip.departure_time),
    arrival_time: toLocal(trip.arrival_time),
    distance_km: trip.distance_km?.toString() ?? "",
    fuel_consumed_liters: trip.fuel_consumed_liters?.toString() ?? "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutate({
      route: form.route || null,
      departure_time: form.departure_time ? new Date(form.departure_time).toISOString() : null,
      arrival_time: form.arrival_time ? new Date(form.arrival_time).toISOString() : null,
      distance_km: form.distance_km ? Number(form.distance_km) : null,
      fuel_consumed_liters: form.fuel_consumed_liters ? Number(form.fuel_consumed_liters) : null,
    });
    onClose();
  }

  return (
    <Modal title="Update trip" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Route">
          <input className={inputCls} value={form.route} onChange={(e) => setForm({ ...form, route: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Departure">
            <input className={inputCls} type="datetime-local" value={form.departure_time} onChange={(e) => setForm({ ...form, departure_time: e.target.value })} />
          </Field>
          <Field label="Arrival">
            <input className={inputCls} type="datetime-local" value={form.arrival_time} onChange={(e) => setForm({ ...form, arrival_time: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Distance (km)">
            <input className={inputCls} type="number" step="0.1" value={form.distance_km} onChange={(e) => setForm({ ...form, distance_km: e.target.value })} />
          </Field>
          <Field label="Fuel consumed (L)">
            <input className={inputCls} type="number" step="0.1" value={form.fuel_consumed_liters} onChange={(e) => setForm({ ...form, fuel_consumed_liters: e.target.value })} />
          </Field>
        </div>
        {save.error && <p className="text-sm text-hazard">{save.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={save.pending}>
            {save.pending ? "Saving…" : "Save trip"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
