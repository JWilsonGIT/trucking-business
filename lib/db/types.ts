import type { Tables, Enums } from "./database.types";

// Row aliases
export type User = Tables<"trucking_users">;
export type Driver = Tables<"trucking_drivers">;
export type Customer = Tables<"trucking_customers">;
export type Truck = Tables<"trucking_trucks">;
export type Booking = Tables<"trucking_bookings">;
export type BookingStatusHistory = Tables<"trucking_booking_status_history">;
export type Trip = Tables<"trucking_trips">;
export type DeliveryPhoto = Tables<"trucking_delivery_photos">;
export type FuelLog = Tables<"trucking_fuel_logs">;
export type Maintenance = Tables<"trucking_maintenance">;
export type Expense = Tables<"trucking_expenses">;
export type Invoice = Tables<"trucking_invoices">;
export type Payment = Tables<"trucking_payments">;

// Enum aliases
export type Role = Enums<"trucking_role">;
export type BookingStatus = Enums<"trucking_booking_status">;
export type TruckStatus = Enums<"trucking_truck_status">;
export type PaymentTerms = Enums<"trucking_payment_terms">;
export type MaintType = Enums<"trucking_maint_type">;
export type MaintStatus = Enums<"trucking_maint_status">;
export type ExpenseType = Enums<"trucking_expense_type">;
export type PaymentStatus = Enums<"trucking_payment_status">;

type Meta = { label: string; color: string };

export const ROLE_META: Record<Role, Meta> = {
  owner: { label: "Owner", color: "#f5a623" },
  driver: { label: "Driver", color: "#2f8f5b" },
};

// Booking status flow (in order) — see PDF Module 3.
export const BOOKING_FLOW: BookingStatus[] = [
  "pending",
  "assigned",
  "loaded",
  "in_transit",
  "delivered",
  "completed",
];

export const BOOKING_STATUS_META: Record<BookingStatus, Meta> = {
  pending: { label: "Pending", color: "#94a3b8" },
  assigned: { label: "Assigned", color: "#2563eb" },
  loaded: { label: "Loaded", color: "#7c3aed" },
  in_transit: { label: "In Transit", color: "#f5a623" },
  delivered: { label: "Delivered", color: "#0ea5e9" },
  completed: { label: "Completed", color: "#2f8f5b" },
  cancelled: { label: "Cancelled", color: "#e23b3b" },
};

export const TRUCK_STATUS_META: Record<TruckStatus, Meta> = {
  available: { label: "Available", color: "#2f8f5b" },
  on_delivery: { label: "On Delivery", color: "#f5a623" },
  maintenance: { label: "Maintenance", color: "#e23b3b" },
  inactive: { label: "Inactive", color: "#94a3b8" },
};

export const PAYMENT_STATUS_META: Record<PaymentStatus, Meta> = {
  unpaid: { label: "Unpaid", color: "#94a3b8" },
  partial: { label: "Partial", color: "#f5a623" },
  paid: { label: "Paid", color: "#2f8f5b" },
  overdue: { label: "Overdue", color: "#e23b3b" },
};

export const MAINT_STATUS_META: Record<MaintStatus, Meta> = {
  scheduled: { label: "Scheduled", color: "#2563eb" },
  reported: { label: "Reported", color: "#f5a623" },
  in_progress: { label: "In Progress", color: "#7c3aed" },
  completed: { label: "Completed", color: "#2f8f5b" },
};

export const MAINT_TYPE_LABELS: Record<MaintType, string> = {
  corrective: "Corrective",
  oil_change: "Oil Change",
  preventive: "Preventive",
  tire: "Tire",
  inspection: "Inspection",
};

export const EXPENSE_TYPE_META: Record<ExpenseType, Meta> = {
  fuel: { label: "Fuel", color: "#f5a623" },
  toll: { label: "Toll", color: "#2563eb" },
  parking: { label: "Parking", color: "#0ea5e9" },
  repair: { label: "Repair", color: "#e23b3b" },
  driver_allowance: { label: "Driver Allowance", color: "#7c3aed" },
  miscellaneous: { label: "Miscellaneous", color: "#94a3b8" },
};

export const PAYMENT_TERMS_LABELS: Record<PaymentTerms, string> = {
  cod: "Cash on Delivery",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_60: "Net 60",
};

// Scheduled-maintenance thresholds (PDF Module 8)
export const OIL_CHANGE_KM = 5000;
export const PREVENTIVE_KM = 10000;
