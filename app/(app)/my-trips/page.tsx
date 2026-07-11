"use client";

import { useMemo, useState } from "react";
import { Camera, ArrowRight, CheckCircle2, ImageIcon } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { Panel } from "@/components/Panel";
import {
  Button,
  Field,
  Modal,
  BookingStatusBadge,
  EmptyState,
  PageSkeleton,
  LoadError,
  inputCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import {
  getBookings,
  getCustomers,
  getTrucks,
  getDeliveryPhotos,
  addDeliveryPhoto,
  setBookingStatus,
  photoPublicUrl,
} from "@/lib/db/queries";
import { useAuth } from "@/lib/auth";
import {
  BOOKING_FLOW,
  BOOKING_STATUS_META,
  type Booking,
  type BookingStatus,
} from "@/lib/db/types";
import { indexBy } from "@/lib/selectors";
import { formatDate } from "@/lib/utils";

// Drivers may advance up to "delivered"; the owner marks "completed".
const DRIVER_MAX = BOOKING_FLOW.indexOf("delivered");

export default function MyTripsPage() {
  const { user } = useAuth();
  const bookings = useQuery("bookings", getBookings);
  const customers = useQuery("customers", getCustomers);
  const trucks = useQuery("trucks", getTrucks);
  const [photoFor, setPhotoFor] = useState<Booking | null>(null);

  const custMap = useMemo(() => indexBy(customers.data ?? []), [customers.data]);
  const truckMap = useMemo(() => indexBy(trucks.data ?? []), [trucks.data]);

  const mine = (bookings.data ?? []).filter((b) => {
    if (user?.driver_id) return b.driver_id === user.driver_id;
    return true; // owner previewing sees all
  });
  const active = mine.filter((b) => !["completed", "cancelled"].includes(b.status));
  const done = mine.filter((b) => b.status === "completed");

  return (
    <>
      <TopBar heading="My Trips" subtitle={user ? `Driver · ${user.name}` : undefined} />
      <div className="space-y-4 p-6">
        {bookings.loading ? (
          <PageSkeleton />
        ) : bookings.error ? (
          <LoadError message={bookings.error} />
        ) : (
          <>
            <Panel title={`Active trips (${active.length})`}>
              {active.length === 0 ? (
                <EmptyState title="No active trips" hint="Assigned deliveries will appear here." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {active.map((b) => (
                    <TripCard
                      key={b.id}
                      booking={b}
                      customerName={b.customer_id ? custMap[b.customer_id]?.customer_name : undefined}
                      plate={b.truck_id ? truckMap[b.truck_id]?.plate_number : undefined}
                      onPhoto={() => setPhotoFor(b)}
                    />
                  ))}
                </div>
              )}
            </Panel>

            {done.length > 0 && (
              <Panel title={`Completed (${done.length})`}>
                <ul className="divide-y divide-line">
                  {done.map((b) => (
                    <li key={b.id} className="flex items-center gap-3 py-2.5 text-sm">
                      <CheckCircle2 size={16} className="text-fleet" />
                      <span className="font-mono font-medium text-ink">{b.booking_no}</span>
                      <span className="min-w-0 flex-1 truncate text-ink-500">
                        {b.pickup_location} <ArrowRight size={10} className="inline" /> {b.delivery_location}
                      </span>
                      <span className="text-xs text-muted">{formatDate(b.booking_date)}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </>
        )}
      </div>

      {photoFor && <PhotoModal booking={photoFor} onClose={() => setPhotoFor(null)} />}
    </>
  );
}

function TripCard({
  booking,
  customerName,
  plate,
  onPhoto,
}: {
  booking: Booking;
  customerName?: string;
  plate?: string;
  onPhoto: () => void;
}) {
  const advance = useMutation((to: BookingStatus, from: BookingStatus) =>
    setBookingStatus(booking.id, to, from),
  );
  const idx = BOOKING_FLOW.indexOf(booking.status);
  const next = idx >= 0 && idx < DRIVER_MAX ? BOOKING_FLOW[idx + 1] : null;

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-mono font-medium text-ink">{booking.booking_no}</p>
          <p className="text-sm text-ink-500">{customerName ?? "—"}</p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>
      <p className="mt-2 text-sm text-ink">
        {booking.pickup_location} <ArrowRight size={12} className="inline text-muted" />{" "}
        {booking.delivery_location}
      </p>
      <p className="mt-1 text-xs text-muted">
        {booking.cargo_description || "—"}
        {plate ? ` · ${plate}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <Button variant="accent" disabled={advance.pending} onClick={() => advance.mutate(next, booking.status)}>
            {advance.pending ? "Updating…" : `Mark ${BOOKING_STATUS_META[next].label}`}
          </Button>
        )}
        <Button variant="outline" onClick={onPhoto}>
          <Camera size={15} /> Delivery photo
        </Button>
      </div>
      {advance.error && <p className="mt-2 text-sm text-hazard">{advance.error}</p>}
    </div>
  );
}

function PhotoModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const photos = useQuery(`photos-${booking.id}`, () => getDeliveryPhotos(booking.id));
  const upload = useMutation((file: File, caption: string) =>
    addDeliveryPhoto(booking.id, file, caption || null),
  );
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    await upload.mutate(file, caption);
    setFile(null);
    setCaption("");
  }

  return (
    <Modal title={`Delivery photos · ${booking.booking_no}`} onClose={onClose}>
      <div className="space-y-4">
        {photos.loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : (photos.data ?? []).length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <ImageIcon size={16} /> No photos uploaded yet.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {(photos.data ?? []).map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p.id}
                src={photoPublicUrl(p.storage_path)}
                alt={p.caption ?? "Delivery photo"}
                className="aspect-square w-full rounded-lg border border-line object-cover"
              />
            ))}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3 border-t border-line pt-4">
          <Field label="Add a photo">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-ink-500 file:mr-3 file:rounded-lg file:border-0 file:bg-paper file:px-3 file:py-2 file:text-sm file:font-medium file:text-ink hover:file:bg-line"
            />
          </Field>
          <Field label="Caption">
            <input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. Delivered to receiving dock" />
          </Field>
          {upload.error && <p className="text-sm text-hazard">{upload.error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit" variant="accent" disabled={!file || upload.pending}>
              {upload.pending ? "Uploading…" : "Upload photo"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
