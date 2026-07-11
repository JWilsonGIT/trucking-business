// Types for the trucking_ tables in Supabase project rdogkyoftnhjoygbbzcv.
// Shaped to satisfy @supabase/supabase-js's GenericSchema (per-table Relationships +
// schema-level Views/Functions/Enums/CompositeTypes). Regenerate with the Supabase type
// generator if the schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TruckingEnums = {
  trucking_role: "owner" | "driver";
  trucking_user_status: "active" | "inactive";
  trucking_payment_terms: "cod" | "net_7" | "net_15" | "net_30" | "net_60";
  trucking_booking_status:
    | "pending"
    | "assigned"
    | "loaded"
    | "in_transit"
    | "delivered"
    | "completed"
    | "cancelled";
  trucking_truck_status: "available" | "on_delivery" | "maintenance" | "inactive";
  trucking_maint_type: "corrective" | "oil_change" | "preventive" | "tire" | "inspection";
  trucking_maint_status: "scheduled" | "reported" | "in_progress" | "completed";
  trucking_expense_type:
    | "fuel"
    | "toll"
    | "parking"
    | "repair"
    | "driver_allowance"
    | "miscellaneous";
  trucking_payment_status: "unpaid" | "partial" | "paid" | "overdue";
};

type Timestamps = { created_at: string };

type TruckingTables = {
  trucking_users: {
    Row: {
      id: string;
      name: string;
      email: string | null;
      role: TruckingEnums["trucking_role"];
      contact_number: string | null;
      driver_id: string | null;
      status: TruckingEnums["trucking_user_status"];
      avatar_color: string;
    } & Timestamps;
    Insert: {
      id?: string;
      name: string;
      email?: string | null;
      role?: TruckingEnums["trucking_role"];
      contact_number?: string | null;
      driver_id?: string | null;
      status?: TruckingEnums["trucking_user_status"];
      avatar_color?: string;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_users"]["Insert"]>;
  };
  trucking_drivers: {
    Row: {
      id: string;
      name: string;
      license_number: string | null;
      license_expiration: string | null;
      contact_number: string | null;
      emergency_contact: string | null;
      status: string;
    } & Timestamps;
    Insert: {
      id?: string;
      name: string;
      license_number?: string | null;
      license_expiration?: string | null;
      contact_number?: string | null;
      emergency_contact?: string | null;
      status?: string;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_drivers"]["Insert"]>;
  };
  trucking_customers: {
    Row: {
      id: string;
      customer_name: string;
      company_name: string | null;
      contact_number: string | null;
      email: string | null;
      address: string | null;
      payment_terms: TruckingEnums["trucking_payment_terms"];
      notes: string | null;
      created_by: string | null;
      updated_at: string;
    } & Timestamps;
    Insert: {
      id?: string;
      customer_name: string;
      company_name?: string | null;
      contact_number?: string | null;
      email?: string | null;
      address?: string | null;
      payment_terms?: TruckingEnums["trucking_payment_terms"];
      notes?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<TruckingTables["trucking_customers"]["Insert"]>;
  };
  trucking_trucks: {
    Row: {
      id: string;
      plate_number: string;
      truck_type: string | null;
      model: string | null;
      capacity: number | null;
      registration_expiry: string | null;
      insurance_expiry: string | null;
      odometer: number;
      status: TruckingEnums["trucking_truck_status"];
      last_oil_change_odometer: number;
      last_preventive_odometer: number;
    } & Timestamps;
    Insert: {
      id?: string;
      plate_number: string;
      truck_type?: string | null;
      model?: string | null;
      capacity?: number | null;
      registration_expiry?: string | null;
      insurance_expiry?: string | null;
      odometer?: number;
      status?: TruckingEnums["trucking_truck_status"];
      last_oil_change_odometer?: number;
      last_preventive_odometer?: number;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_trucks"]["Insert"]>;
  };
  trucking_bookings: {
    Row: {
      id: string;
      booking_no: string;
      customer_id: string | null;
      pickup_location: string | null;
      delivery_location: string | null;
      booking_date: string;
      truck_id: string | null;
      driver_id: string | null;
      cargo_description: string | null;
      weight: number | null;
      rate: number;
      status: TruckingEnums["trucking_booking_status"];
      notes: string | null;
      created_by: string | null;
      updated_at: string;
    } & Timestamps;
    Insert: {
      id?: string;
      booking_no?: string;
      customer_id?: string | null;
      pickup_location?: string | null;
      delivery_location?: string | null;
      booking_date?: string;
      truck_id?: string | null;
      driver_id?: string | null;
      cargo_description?: string | null;
      weight?: number | null;
      rate?: number;
      status?: TruckingEnums["trucking_booking_status"];
      notes?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<TruckingTables["trucking_bookings"]["Insert"]>;
  };
  trucking_booking_status_history: {
    Row: {
      id: string;
      booking_id: string;
      from_status: TruckingEnums["trucking_booking_status"] | null;
      to_status: TruckingEnums["trucking_booking_status"];
      changed_by: string | null;
      note: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      booking_id: string;
      from_status?: TruckingEnums["trucking_booking_status"] | null;
      to_status: TruckingEnums["trucking_booking_status"];
      changed_by?: string | null;
      note?: string | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_booking_status_history"]["Insert"]>;
  };
  trucking_trips: {
    Row: {
      id: string;
      booking_id: string;
      driver_id: string | null;
      truck_id: string | null;
      route: string | null;
      departure_time: string | null;
      arrival_time: string | null;
      distance_km: number | null;
      fuel_consumed_liters: number | null;
    } & Timestamps;
    Insert: {
      id?: string;
      booking_id: string;
      driver_id?: string | null;
      truck_id?: string | null;
      route?: string | null;
      departure_time?: string | null;
      arrival_time?: string | null;
      distance_km?: number | null;
      fuel_consumed_liters?: number | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_trips"]["Insert"]>;
  };
  trucking_delivery_photos: {
    Row: {
      id: string;
      booking_id: string;
      uploaded_by: string | null;
      storage_path: string;
      caption: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      booking_id: string;
      uploaded_by?: string | null;
      storage_path: string;
      caption?: string | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_delivery_photos"]["Insert"]>;
  };
  trucking_fuel_logs: {
    Row: {
      id: string;
      log_date: string;
      driver_id: string | null;
      truck_id: string | null;
      odometer: number | null;
      liters: number;
      cost: number;
      created_by: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      log_date?: string;
      driver_id?: string | null;
      truck_id?: string | null;
      odometer?: number | null;
      liters?: number;
      cost?: number;
      created_by?: string | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_fuel_logs"]["Insert"]>;
  };
  trucking_maintenance: {
    Row: {
      id: string;
      truck_id: string | null;
      maintenance_type: TruckingEnums["trucking_maint_type"];
      issue: string | null;
      date_reported: string;
      scheduled_date: string | null;
      mechanic: string | null;
      cost: number;
      odometer_at_service: number | null;
      status: TruckingEnums["trucking_maint_status"];
      notes: string | null;
      created_by: string | null;
      updated_at: string;
    } & Timestamps;
    Insert: {
      id?: string;
      truck_id?: string | null;
      maintenance_type?: TruckingEnums["trucking_maint_type"];
      issue?: string | null;
      date_reported?: string;
      scheduled_date?: string | null;
      mechanic?: string | null;
      cost?: number;
      odometer_at_service?: number | null;
      status?: TruckingEnums["trucking_maint_status"];
      notes?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<TruckingTables["trucking_maintenance"]["Insert"]>;
  };
  trucking_expenses: {
    Row: {
      id: string;
      expense_type: TruckingEnums["trucking_expense_type"];
      amount: number;
      expense_date: string;
      booking_id: string | null;
      truck_id: string | null;
      driver_id: string | null;
      notes: string | null;
      created_by: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      expense_type: TruckingEnums["trucking_expense_type"];
      amount?: number;
      expense_date?: string;
      booking_id?: string | null;
      truck_id?: string | null;
      driver_id?: string | null;
      notes?: string | null;
      created_by?: string | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_expenses"]["Insert"]>;
  };
  trucking_invoices: {
    Row: {
      id: string;
      invoice_number: string;
      customer_id: string | null;
      booking_id: string | null;
      amount: number;
      amount_paid: number;
      issue_date: string;
      due_date: string | null;
      payment_status: TruckingEnums["trucking_payment_status"];
      notes: string | null;
      created_by: string | null;
      updated_at: string;
    } & Timestamps;
    Insert: {
      id?: string;
      invoice_number?: string;
      customer_id?: string | null;
      booking_id?: string | null;
      amount?: number;
      amount_paid?: number;
      issue_date?: string;
      due_date?: string | null;
      payment_status?: TruckingEnums["trucking_payment_status"];
      notes?: string | null;
      created_by?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: Partial<TruckingTables["trucking_invoices"]["Insert"]>;
  };
  trucking_payments: {
    Row: {
      id: string;
      invoice_id: string;
      amount: number;
      payment_date: string;
      method: string | null;
      note: string | null;
    } & Timestamps;
    Insert: {
      id?: string;
      invoice_id: string;
      amount?: number;
      payment_date?: string;
      method?: string | null;
      note?: string | null;
      created_at?: string;
    };
    Update: Partial<TruckingTables["trucking_payments"]["Insert"]>;
  };
};

// Inject the Relationships key supabase-js expects on every table.
type WithRelationships<T> = {
  [K in keyof T]: T[K] & { Relationships: [] };
};

export type Database = {
  public: {
    Tables: WithRelationships<TruckingTables>;
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: TruckingEnums;
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
export type Enums<T extends keyof TruckingEnums> = TruckingEnums[T];
