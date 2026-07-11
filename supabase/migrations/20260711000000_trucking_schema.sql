-- Fleet Ops — Simple Trucking Management System
-- Full schema: enums, sequences, tables, indexes, and RLS policies.
-- Internal-tool posture: permissive RLS (using(true)) with the publishable/anon key.
-- Harden with Supabase Auth + role-scoped policies before any public exposure.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type trucking_booking_status as enum ('pending','assigned','loaded','in_transit','delivered','completed','cancelled');
create type trucking_expense_type   as enum ('fuel','toll','parking','repair','driver_allowance','miscellaneous');
create type trucking_maint_status   as enum ('scheduled','reported','in_progress','completed');
create type trucking_maint_type     as enum ('corrective','oil_change','preventive','tire','inspection');
create type trucking_payment_status as enum ('unpaid','partial','paid','overdue');
create type trucking_payment_terms  as enum ('cod','net_7','net_15','net_30','net_60');
create type trucking_role           as enum ('owner','driver');
create type trucking_truck_status   as enum ('available','on_delivery','maintenance','inactive');
create type trucking_user_status    as enum ('active','inactive');

-- ---------------------------------------------------------------------------
-- Sequences (drive booking_no / invoice_number defaults)
-- ---------------------------------------------------------------------------
create sequence trucking_booking_seq;
create sequence trucking_invoice_seq;

-- ---------------------------------------------------------------------------
-- Tables (declared in FK-dependency order)
-- ---------------------------------------------------------------------------
create table trucking_drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license_number text,
  license_expiration date,
  contact_number text,
  emergency_contact text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table trucking_users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  role trucking_role not null default 'driver',
  contact_number text,
  driver_id uuid references trucking_drivers(id) on delete set null,
  status trucking_user_status not null default 'active',
  avatar_color text not null default '#f5a623',
  created_at timestamptz not null default now()
);

create table trucking_customers (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  company_name text,
  contact_number text,
  email text,
  address text,
  payment_terms trucking_payment_terms not null default 'cod',
  notes text,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trucking_trucks (
  id uuid primary key default gen_random_uuid(),
  plate_number text not null unique,
  truck_type text,
  model text,
  capacity numeric(10,2),
  registration_expiry date,
  insurance_expiry date,
  odometer integer not null default 0,
  status trucking_truck_status not null default 'available',
  last_oil_change_odometer integer not null default 0,
  last_preventive_odometer integer not null default 0,
  created_at timestamptz not null default now()
);

create table trucking_bookings (
  id uuid primary key default gen_random_uuid(),
  booking_no text not null unique default ('BK-' || lpad(nextval('trucking_booking_seq')::text, 4, '0')),
  customer_id uuid references trucking_customers(id) on delete set null,
  pickup_location text,
  delivery_location text,
  booking_date date not null default CURRENT_DATE,
  truck_id uuid references trucking_trucks(id) on delete set null,
  driver_id uuid references trucking_drivers(id) on delete set null,
  cargo_description text,
  weight numeric(10,2),
  rate numeric(12,2) not null default 0,
  status trucking_booking_status not null default 'pending',
  notes text,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trucking_booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references trucking_bookings(id) on delete cascade,
  from_status trucking_booking_status,
  to_status trucking_booking_status not null,
  changed_by uuid references trucking_users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table trucking_trips (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references trucking_bookings(id) on delete cascade,
  driver_id uuid references trucking_drivers(id) on delete set null,
  truck_id uuid references trucking_trucks(id) on delete set null,
  route text,
  departure_time timestamptz,
  arrival_time timestamptz,
  distance_km numeric(10,2),
  fuel_consumed_liters numeric(10,2),
  created_at timestamptz not null default now()
);

create table trucking_delivery_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references trucking_bookings(id) on delete cascade,
  uploaded_by uuid references trucking_users(id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table trucking_fuel_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null default CURRENT_DATE,
  driver_id uuid references trucking_drivers(id) on delete set null,
  truck_id uuid references trucking_trucks(id) on delete set null,
  odometer integer,
  liters numeric(10,2) not null default 0,
  cost numeric(12,2) not null default 0,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table trucking_maintenance (
  id uuid primary key default gen_random_uuid(),
  truck_id uuid references trucking_trucks(id) on delete cascade,
  maintenance_type trucking_maint_type not null default 'corrective',
  issue text,
  date_reported date not null default CURRENT_DATE,
  scheduled_date date,
  mechanic text,
  cost numeric(12,2) not null default 0,
  odometer_at_service integer,
  status trucking_maint_status not null default 'reported',
  notes text,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trucking_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_type trucking_expense_type not null,
  amount numeric(12,2) not null default 0,
  expense_date date not null default CURRENT_DATE,
  booking_id uuid references trucking_bookings(id) on delete set null,
  truck_id uuid references trucking_trucks(id) on delete set null,
  driver_id uuid references trucking_drivers(id) on delete set null,
  notes text,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table trucking_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default ('INV-' || lpad(nextval('trucking_invoice_seq')::text, 4, '0')),
  customer_id uuid references trucking_customers(id) on delete set null,
  booking_id uuid references trucking_bookings(id) on delete set null,
  amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  issue_date date not null default CURRENT_DATE,
  due_date date,
  payment_status trucking_payment_status not null default 'unpaid',
  notes text,
  created_by uuid references trucking_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table trucking_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references trucking_invoices(id) on delete cascade,
  amount numeric(12,2) not null default 0,
  payment_date date not null default CURRENT_DATE,
  method text,
  note text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_trucking_bookings_date on trucking_bookings (booking_date);
create index idx_trucking_bookings_driver on trucking_bookings (driver_id);
create index idx_trucking_bookings_status on trucking_bookings (status);
create index idx_trucking_fuel_truck_date on trucking_fuel_logs (truck_id, log_date);
create index idx_trucking_invoices_status_due on trucking_invoices (payment_status, due_date);
create index idx_trucking_maint_truck on trucking_maintenance (truck_id);
create index idx_trucking_trips_booking on trucking_trips (booking_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — permissive policy per table (internal-tool posture)
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'trucking_drivers','trucking_users','trucking_customers','trucking_trucks',
    'trucking_bookings','trucking_booking_status_history','trucking_trips',
    'trucking_delivery_photos','trucking_fuel_logs','trucking_maintenance',
    'trucking_expenses','trucking_invoices','trucking_payments'
  ]
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('create policy %I on %I for all to public using (true) with check (true);', t || '_all', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for delivery photos (same permissive posture)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('trucking-photos', 'trucking-photos', true)
on conflict (id) do nothing;

do $$
begin
  begin
    execute $p$create policy "trucking_photos_all" on storage.objects for all to public
      using (bucket_id = 'trucking-photos') with check (bucket_id = 'trucking-photos')$p$;
  exception when duplicate_object then null;
  end;
end $$;
