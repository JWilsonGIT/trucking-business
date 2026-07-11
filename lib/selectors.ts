import {
  OIL_CHANGE_KM,
  PREVENTIVE_KM,
  type Booking,
  type Expense,
  type FuelLog,
  type Invoice,
  type Maintenance,
  type Truck,
  type TruckStatus,
} from "./db/types";
import { daysUntil, isThisMonth, isToday, monthKey } from "./utils";

export function indexBy<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}

const num = (n: number | string | null | undefined) => Number(n ?? 0);

/* ---------------- Dashboard (Module 1) ---------------- */
export interface DashboardMetrics {
  totalDeliveries: number;
  revenueToday: number;
  revenueMonth: number;
  fuelCostMonth: number;
  maintCostMonth: number;
  outstanding: number;
  truckStatus: Record<TruckStatus, number>;
}

export function dashboardMetrics(
  bookings: Booking[],
  invoices: Invoice[],
  fuelLogs: FuelLog[],
  maintenance: Maintenance[],
  trucks: Truck[],
): DashboardMetrics {
  const completed = bookings.filter((b) => b.status === "completed");
  const truckStatus: Record<TruckStatus, number> = {
    available: 0,
    on_delivery: 0,
    maintenance: 0,
    inactive: 0,
  };
  for (const t of trucks) truckStatus[t.status] += 1;

  return {
    totalDeliveries: completed.length,
    revenueToday: completed
      .filter((b) => isToday(b.booking_date))
      .reduce((s, b) => s + num(b.rate), 0),
    revenueMonth: completed
      .filter((b) => isThisMonth(b.booking_date))
      .reduce((s, b) => s + num(b.rate), 0),
    fuelCostMonth: fuelLogs
      .filter((f) => isThisMonth(f.log_date))
      .reduce((s, f) => s + num(f.cost), 0),
    maintCostMonth: maintenance
      .filter((m) => isThisMonth(m.date_reported))
      .reduce((s, m) => s + num(m.cost), 0),
    outstanding: invoices
      .filter((i) => i.payment_status !== "paid")
      .reduce((s, i) => s + (num(i.amount) - num(i.amount_paid)), 0),
    truckStatus,
  };
}

/** An invoice is overdue if unpaid past its due date (computed, not stored). */
export function isOverdue(inv: Invoice): boolean {
  if (inv.payment_status === "paid") return false;
  const d = daysUntil(inv.due_date);
  return d !== null && d < 0;
}

export function outstandingBalance(inv: Invoice): number {
  return num(inv.amount) - num(inv.amount_paid);
}

/* ---------------- Maintenance alerts (Module 8) ---------------- */
export type AlertSeverity = "danger" | "warning";
export interface FleetAlert {
  truckId: string;
  plate: string;
  kind: string;
  message: string;
  severity: AlertSeverity;
}

export function fleetAlerts(trucks: Truck[], withinDays = 30): FleetAlert[] {
  const alerts: FleetAlert[] = [];
  for (const t of trucks) {
    const reg = daysUntil(t.registration_expiry);
    if (reg !== null && reg <= withinDays) {
      alerts.push({
        truckId: t.id,
        plate: t.plate_number,
        kind: "Registration",
        message: reg < 0 ? `Registration expired ${Math.abs(reg)}d ago` : `Registration expires in ${reg}d`,
        severity: reg < 0 ? "danger" : "warning",
      });
    }
    const ins = daysUntil(t.insurance_expiry);
    if (ins !== null && ins <= withinDays) {
      alerts.push({
        truckId: t.id,
        plate: t.plate_number,
        kind: "Insurance",
        message: ins < 0 ? `Insurance expired ${Math.abs(ins)}d ago` : `Insurance expires in ${ins}d`,
        severity: ins < 0 ? "danger" : "warning",
      });
    }
    const sinceOil = t.odometer - t.last_oil_change_odometer;
    if (sinceOil >= OIL_CHANGE_KM) {
      alerts.push({
        truckId: t.id,
        plate: t.plate_number,
        kind: "Oil change",
        message: `Oil change due (${sinceOil.toLocaleString()} km since last)`,
        severity: "warning",
      });
    }
    const sincePrev = t.odometer - t.last_preventive_odometer;
    if (sincePrev >= PREVENTIVE_KM) {
      alerts.push({
        truckId: t.id,
        plate: t.plate_number,
        kind: "Preventive",
        message: `Preventive maintenance due (${sincePrev.toLocaleString()} km since last)`,
        severity: "warning",
      });
    }
  }
  return alerts;
}

/* ---------------- Fuel report (Module 7) ---------------- */
export interface FuelReport {
  totalCost: number;
  totalLiters: number;
  totalDistanceKm: number;
  costPerKm: number;
  monthly: { month: string; cost: number }[];
}

export function fuelReport(fuelLogs: FuelLog[]): FuelReport {
  const totalCost = fuelLogs.reduce((s, f) => s + num(f.cost), 0);
  const totalLiters = fuelLogs.reduce((s, f) => s + num(f.liters), 0);

  // Distance per truck = span of odometer readings.
  const byTruck: Record<string, number[]> = {};
  for (const f of fuelLogs) {
    if (f.truck_id && f.odometer) (byTruck[f.truck_id] ??= []).push(f.odometer);
  }
  let totalDistanceKm = 0;
  for (const readings of Object.values(byTruck)) {
    if (readings.length >= 2) {
      totalDistanceKm += Math.max(...readings) - Math.min(...readings);
    }
  }

  const monthMap: Record<string, number> = {};
  for (const f of fuelLogs) {
    const k = monthKey(f.log_date);
    monthMap[k] = (monthMap[k] ?? 0) + num(f.cost);
  }
  const monthly = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, cost]) => ({ month, cost }));

  return {
    totalCost,
    totalLiters,
    totalDistanceKm,
    costPerKm: totalDistanceKm > 0 ? totalCost / totalDistanceKm : 0,
    monthly,
  };
}

/* ---------------- Monthly P&L (Module 9) ---------------- */
export interface ProfitReport {
  revenue: number;
  fuel: number;
  maintenance: number;
  driverSalary: number;
  other: number;
  net: number;
}

/** This-month profit & loss, per PDF Module 9 statement. */
export function monthlyProfit(
  bookings: Booking[],
  expenses: Expense[],
  maintenance: Maintenance[],
): ProfitReport {
  const revenue = bookings
    .filter((b) => b.status === "completed" && isThisMonth(b.booking_date))
    .reduce((s, b) => s + num(b.rate), 0);
  const mExp = expenses.filter((e) => isThisMonth(e.expense_date));
  const fuel = mExp.filter((e) => e.expense_type === "fuel").reduce((s, e) => s + num(e.amount), 0);
  const driverSalary = mExp
    .filter((e) => e.expense_type === "driver_allowance")
    .reduce((s, e) => s + num(e.amount), 0);
  const other = mExp
    .filter((e) => !["fuel", "driver_allowance", "repair"].includes(e.expense_type))
    .reduce((s, e) => s + num(e.amount), 0);
  const maint = maintenance
    .filter((m) => isThisMonth(m.date_reported))
    .reduce((s, m) => s + num(m.cost), 0);
  return {
    revenue,
    fuel,
    maintenance: maint,
    driverSalary,
    other,
    net: revenue - fuel - maint - driverSalary - other,
  };
}
