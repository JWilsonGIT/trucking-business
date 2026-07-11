# Fleet Ops — Simple Trucking Management System

An internal fleet/logistics console for St. Joseph Group, built to the *Simple Trucking
Management System* spec. Manage deliveries, drivers, trucks, fuel, maintenance, expenses and
collections from one dispatch deck.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens — the "Dispatch Deck" identity)
- **Supabase** (PostgreSQL) via `@supabase/supabase-js`
- Icons `lucide-react`, dates `date-fns`

## Modules (all 10)

Dashboard · Customers · Bookings (full status flow) · Drivers · Trucks · Trip Monitor ·
Fuel (cost/km, monthly, trend) · Maintenance (scheduled alerts) · Expenses (monthly P&L) ·
Collections & Billing (invoices + payments).

## Roles (demo logins)

- **Owner** — full access to every module.
- **Driver** — a focused workspace (`/my-trips`): advance assigned trips to *Delivered*, upload
  delivery photos, log fuel and expenses.

Switch roles anytime from the **View as** control in the top bar. No passwords — this is a demo
auth layer (see *Security* below).

## Getting started

```bash
npm install
npm run dev      # http://localhost:3500
```

Environment (`.env.local`, git-ignored):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key>
```

The database schema + seed live in Supabase (tables prefixed `trucking_`). Types are in
`lib/db/database.types.ts` (regenerate with the Supabase type generator if the schema changes).

## Architecture

- `lib/supabase/client.ts` — typed Supabase client.
- `lib/db/queries.ts` — async CRUD + domain logic (booking status flow syncs truck status;
  payments recompute invoice status; fuel logs advance odometers).
- `lib/db/hooks.ts` — dependency-light `useQuery` / `useMutation` over a small invalidation bus
  (`lib/db/cache.ts`); any mutation refetches mounted queries.
- `lib/db/session.ts` — current demo user id, used to stamp `created_by` / `changed_by`.
- `lib/selectors.ts` — pure derivations: dashboard metrics, fleet alerts, fuel report, P&L.
- `lib/permissions.ts` — Owner/Driver action matrix; the sidebar and route guard use it.

## ⚠️ Security (internal-tool posture)

Because auth is demo-only, the app talks to Supabase with the **publishable/anon key** and every
`trucking_*` table has a **permissive RLS policy** (`using(true) with check(true)`). That means
anyone with the key can read/write all rows. This is acceptable **only** as an internal tool
behind a private/restricted URL.

**Next step to harden:** add Supabase Auth, map users to `trucking_users.role`, and replace the
permissive policies with `authenticated` + role-scoped policies (e.g. drivers limited to bookings
where `driver_id` matches their linked driver). The delivery-photos Storage bucket
(`trucking-photos`) uses the same permissive posture and should be tightened alongside.
