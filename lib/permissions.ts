import type { Role } from "./db/types";

// Access-control matrix. Owner runs the whole fleet; Driver has a focused workspace.
export type Action =
  | "view_dashboard"
  | "manage_customers"
  | "manage_bookings"
  | "assign_booking"
  | "manage_drivers"
  | "manage_trucks"
  | "view_trips"
  | "manage_maintenance"
  | "manage_billing"
  | "view_reports"
  | "view_my_trips"
  | "update_trip_status"
  | "upload_delivery_photo"
  | "record_fuel"
  | "record_expense";

export const MATRIX: Record<Action, Role[]> = {
  view_dashboard: ["owner"],
  manage_customers: ["owner"],
  manage_bookings: ["owner"],
  assign_booking: ["owner"],
  manage_drivers: ["owner"],
  manage_trucks: ["owner"],
  view_trips: ["owner"],
  manage_maintenance: ["owner"],
  manage_billing: ["owner"],
  view_reports: ["owner"],
  view_my_trips: ["owner", "driver"],
  update_trip_status: ["owner", "driver"],
  upload_delivery_photo: ["owner", "driver"],
  record_fuel: ["owner", "driver"],
  record_expense: ["owner", "driver"],
};

export function can(role: Role | undefined, action: Action): boolean {
  if (!role) return false;
  return MATRIX[action].includes(role);
}
