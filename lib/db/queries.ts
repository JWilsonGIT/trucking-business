import { supabase } from "@/lib/supabase/client";
import { getActor } from "./session";
import type { TablesInsert, TablesUpdate } from "./database.types";
import type {
  Booking,
  BookingStatus,
  BookingStatusHistory,
  Customer,
  DeliveryPhoto,
  Driver,
  Expense,
  FuelLog,
  Invoice,
  Maintenance,
  Payment,
  Trip,
  Truck,
  User,
} from "./types";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

const nowISO = () => new Date().toISOString();

/* ---------------- Users ---------------- */
export async function getUsers(): Promise<User[]> {
  return unwrap(await supabase.from("trucking_users").select("*").order("role"));
}

/* ---------------- Customers ---------------- */
export async function getCustomers(): Promise<Customer[]> {
  return unwrap(
    await supabase.from("trucking_customers").select("*").order("customer_name"),
  );
}
export async function createCustomer(
  input: Omit<TablesInsert<"trucking_customers">, "created_by">,
): Promise<Customer> {
  return unwrap(
    await supabase
      .from("trucking_customers")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
}
export async function updateCustomer(
  id: string,
  patch: TablesUpdate<"trucking_customers">,
): Promise<Customer> {
  return unwrap(
    await supabase
      .from("trucking_customers")
      .update({ ...patch, updated_at: nowISO() })
      .eq("id", id)
      .select()
      .single(),
  );
}
export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("trucking_customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Drivers ---------------- */
export async function getDrivers(): Promise<Driver[]> {
  return unwrap(await supabase.from("trucking_drivers").select("*").order("name"));
}
export async function createDriver(
  input: TablesInsert<"trucking_drivers">,
): Promise<Driver> {
  return unwrap(await supabase.from("trucking_drivers").insert(input).select().single());
}
export async function updateDriver(
  id: string,
  patch: TablesUpdate<"trucking_drivers">,
): Promise<Driver> {
  return unwrap(
    await supabase.from("trucking_drivers").update(patch).eq("id", id).select().single(),
  );
}
export async function deleteDriver(id: string): Promise<void> {
  const { error } = await supabase.from("trucking_drivers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Trucks ---------------- */
export async function getTrucks(): Promise<Truck[]> {
  return unwrap(await supabase.from("trucking_trucks").select("*").order("plate_number"));
}
export async function createTruck(
  input: TablesInsert<"trucking_trucks">,
): Promise<Truck> {
  return unwrap(await supabase.from("trucking_trucks").insert(input).select().single());
}
export async function updateTruck(
  id: string,
  patch: TablesUpdate<"trucking_trucks">,
): Promise<Truck> {
  return unwrap(
    await supabase.from("trucking_trucks").update(patch).eq("id", id).select().single(),
  );
}
export async function deleteTruck(id: string): Promise<void> {
  const { error } = await supabase.from("trucking_trucks").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ---------------- Bookings ---------------- */
export async function getBookings(): Promise<Booking[]> {
  return unwrap(
    await supabase
      .from("trucking_bookings")
      .select("*")
      .order("booking_date", { ascending: false })
      .order("booking_no", { ascending: false }),
  );
}
export async function createBooking(
  input: Omit<TablesInsert<"trucking_bookings">, "created_by">,
): Promise<Booking> {
  const created = unwrap<Booking>(
    await supabase
      .from("trucking_bookings")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
  await supabase.from("trucking_booking_status_history").insert({
    booking_id: created.id,
    from_status: null,
    to_status: created.status,
    changed_by: getActor(),
  });
  return created;
}
export async function updateBooking(
  id: string,
  patch: TablesUpdate<"trucking_bookings">,
): Promise<Booking> {
  return unwrap(
    await supabase
      .from("trucking_bookings")
      .update({ ...patch, updated_at: nowISO() })
      .eq("id", id)
      .select()
      .single(),
  );
}

/** Assign a truck + driver and move a pending booking to "assigned". */
export async function assignBooking(
  id: string,
  truckId: string | null,
  driverId: string | null,
): Promise<Booking> {
  const current = unwrap<Booking>(
    await supabase.from("trucking_bookings").select("*").eq("id", id).single(),
  );
  const to: BookingStatus =
    current.status === "pending" && truckId && driverId ? "assigned" : current.status;
  const updated = await updateBooking(id, {
    truck_id: truckId,
    driver_id: driverId,
    status: to,
  });
  if (to !== current.status) {
    await supabase.from("trucking_booking_status_history").insert({
      booking_id: id,
      from_status: current.status,
      to_status: to,
      changed_by: getActor(),
    });
  }
  return updated;
}

/** Advance/repoint a booking's status, writing history + syncing the truck's status. */
export async function setBookingStatus(
  id: string,
  to: BookingStatus,
  from: BookingStatus,
): Promise<void> {
  const booking = unwrap<Booking>(
    await supabase.from("trucking_bookings").select("*").eq("id", id).single(),
  );
  const { error } = await supabase
    .from("trucking_bookings")
    .update({ status: to, updated_at: nowISO() })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.from("trucking_booking_status_history").insert({
    booking_id: id,
    from_status: from,
    to_status: to,
    changed_by: getActor(),
  });

  // Keep the assigned truck's status coherent with the trip.
  if (booking.truck_id) {
    let truckStatus: Truck["status"] | null = null;
    if (to === "loaded" || to === "in_transit") truckStatus = "on_delivery";
    else if (to === "delivered" || to === "completed" || to === "cancelled")
      truckStatus = "available";
    if (truckStatus) {
      await supabase
        .from("trucking_trucks")
        .update({ status: truckStatus })
        .eq("id", booking.truck_id);
    }
  }
}

export async function getBookingHistory(
  bookingId: string,
): Promise<BookingStatusHistory[]> {
  return unwrap(
    await supabase
      .from("trucking_booking_status_history")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true }),
  );
}

/* ---------------- Trips ---------------- */
export async function getTrips(): Promise<Trip[]> {
  return unwrap(
    await supabase.from("trucking_trips").select("*").order("created_at", { ascending: false }),
  );
}
export async function upsertTrip(
  bookingId: string,
  patch: Omit<TablesInsert<"trucking_trips">, "booking_id">,
): Promise<Trip> {
  return unwrap(
    await supabase
      .from("trucking_trips")
      .upsert({ booking_id: bookingId, ...patch }, { onConflict: "booking_id" })
      .select()
      .single(),
  );
}

/* ---------------- Fuel ---------------- */
export async function getFuelLogs(): Promise<FuelLog[]> {
  return unwrap(
    await supabase.from("trucking_fuel_logs").select("*").order("log_date", { ascending: false }),
  );
}
export async function createFuelLog(
  input: Omit<TablesInsert<"trucking_fuel_logs">, "created_by">,
): Promise<FuelLog> {
  const row = unwrap<FuelLog>(
    await supabase
      .from("trucking_fuel_logs")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
  // Advance the truck odometer if this reading is higher.
  if (row.truck_id && row.odometer) {
    const truck = unwrap<Truck>(
      await supabase.from("trucking_trucks").select("*").eq("id", row.truck_id).single(),
    );
    if (row.odometer > truck.odometer) {
      await supabase
        .from("trucking_trucks")
        .update({ odometer: row.odometer })
        .eq("id", row.truck_id);
    }
  }
  return row;
}

/* ---------------- Maintenance ---------------- */
export async function getMaintenance(): Promise<Maintenance[]> {
  return unwrap(
    await supabase
      .from("trucking_maintenance")
      .select("*")
      .order("date_reported", { ascending: false }),
  );
}
export async function createMaintenance(
  input: Omit<TablesInsert<"trucking_maintenance">, "created_by">,
): Promise<Maintenance> {
  return unwrap(
    await supabase
      .from("trucking_maintenance")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
}
export async function updateMaintenance(
  id: string,
  patch: TablesUpdate<"trucking_maintenance">,
): Promise<Maintenance> {
  return unwrap(
    await supabase
      .from("trucking_maintenance")
      .update({ ...patch, updated_at: nowISO() })
      .eq("id", id)
      .select()
      .single(),
  );
}

/* ---------------- Expenses ---------------- */
export async function getExpenses(): Promise<Expense[]> {
  return unwrap(
    await supabase.from("trucking_expenses").select("*").order("expense_date", { ascending: false }),
  );
}
export async function createExpense(
  input: Omit<TablesInsert<"trucking_expenses">, "created_by">,
): Promise<Expense> {
  return unwrap(
    await supabase
      .from("trucking_expenses")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
}

/* ---------------- Invoices & Payments ---------------- */
export async function getInvoices(): Promise<Invoice[]> {
  return unwrap(
    await supabase.from("trucking_invoices").select("*").order("issue_date", { ascending: false }),
  );
}
export async function createInvoice(
  input: Omit<TablesInsert<"trucking_invoices">, "created_by">,
): Promise<Invoice> {
  return unwrap(
    await supabase
      .from("trucking_invoices")
      .insert({ ...input, created_by: getActor() })
      .select()
      .single(),
  );
}
export async function getPayments(invoiceId: string): Promise<Payment[]> {
  return unwrap(
    await supabase
      .from("trucking_payments")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("payment_date", { ascending: true }),
  );
}
export async function addPayment(
  invoiceId: string,
  amount: number,
  method: string | null,
  note: string | null,
): Promise<void> {
  const invoice = unwrap<Invoice>(
    await supabase.from("trucking_invoices").select("*").eq("id", invoiceId).single(),
  );
  const { error: payErr } = await supabase.from("trucking_payments").insert({
    invoice_id: invoiceId,
    amount,
    method,
    note,
  });
  if (payErr) throw new Error(payErr.message);

  const paid = Number(invoice.amount_paid) + amount;
  const status =
    paid >= Number(invoice.amount) ? "paid" : paid > 0 ? "partial" : "unpaid";
  const { error: invErr } = await supabase
    .from("trucking_invoices")
    .update({ amount_paid: paid, payment_status: status, updated_at: nowISO() })
    .eq("id", invoiceId);
  if (invErr) throw new Error(invErr.message);
}

/* ---------------- Delivery photos ---------------- */
export async function getDeliveryPhotos(bookingId: string): Promise<DeliveryPhoto[]> {
  return unwrap(
    await supabase
      .from("trucking_delivery_photos")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: false }),
  );
}
export async function addDeliveryPhoto(
  bookingId: string,
  file: File,
  caption: string | null,
): Promise<DeliveryPhoto> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${bookingId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("trucking-photos")
    .upload(path, file, { upsert: false });
  if (upErr) throw new Error(upErr.message);
  return unwrap(
    await supabase
      .from("trucking_delivery_photos")
      .insert({
        booking_id: bookingId,
        uploaded_by: getActor(),
        storage_path: path,
        caption,
      })
      .select()
      .single(),
  );
}
export function photoPublicUrl(path: string): string {
  return supabase.storage.from("trucking-photos").getPublicUrl(path).data.publicUrl;
}
