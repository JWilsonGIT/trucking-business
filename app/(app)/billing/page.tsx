"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import { StatTile } from "@/components/charts";
import {
  Button,
  Field,
  Modal,
  Pill,
  PaymentStatusBadge,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import {
  getInvoices,
  getCustomers,
  getBookings,
  getPayments,
  createInvoice,
  addPayment,
} from "@/lib/db/queries";
import type { Invoice } from "@/lib/db/types";
import { indexBy, isOverdue, outstandingBalance } from "@/lib/selectors";
import { formatDate, formatMoney } from "@/lib/utils";

export default function BillingPage() {
  const invoices = useQuery("invoices", getInvoices);
  const customers = useQuery("customers", getCustomers);
  const bookings = useQuery("bookings", getBookings);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const custMap = useMemo(() => indexBy(customers.data ?? []), [customers.data]);
  const data = invoices.data ?? [];
  const live = selected ? data.find((i) => i.id === selected.id) ?? selected : null;

  const totals = useMemo(() => {
    const outstanding = data.filter((i) => i.payment_status !== "paid").reduce((s, i) => s + outstandingBalance(i), 0);
    const overdue = data.filter(isOverdue).reduce((s, i) => s + outstandingBalance(i), 0);
    const collected = data.reduce((s, i) => s + Number(i.amount_paid), 0);
    return { outstanding, overdue, collected };
  }, [data]);

  const columns: Column<Invoice>[] = [
    { key: "no", header: "Invoice", render: (i) => <span className="font-mono font-medium text-ink">{i.invoice_number}</span> },
    { key: "customer", header: "Customer", render: (i) => (i.customer_id ? custMap[i.customer_id]?.customer_name ?? "—" : "—") },
    { key: "amount", header: "Amount", align: "right", render: (i) => formatMoney(i.amount) },
    { key: "paid", header: "Paid", align: "right", render: (i) => formatMoney(i.amount_paid) },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (i) => {
        const bal = outstandingBalance(i);
        return <span className={bal > 0 ? "font-medium text-hazard" : "text-muted"}>{formatMoney(bal)}</span>;
      },
    },
    { key: "due", header: "Due", render: (i) => formatDate(i.due_date) },
    {
      key: "status",
      header: "Status",
      render: (i) =>
        isOverdue(i) ? <Pill label="Overdue" color="#e23b3b" /> : <PaymentStatusBadge status={i.payment_status} />,
    },
  ];

  const loading = invoices.loading || customers.loading;
  const error = invoices.error || customers.error;

  return (
    <>
      <TopBar
        heading="Collections &amp; Billing"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> New invoice
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatTile label="Outstanding" value={formatMoney(totals.outstanding)} accent="var(--color-accent)" />
              <StatTile label="Overdue" value={formatMoney(totals.overdue)} accent="var(--color-hazard)" />
              <StatTile label="Collected" value={formatMoney(totals.collected)} accent="var(--color-fleet)" />
            </div>
            <DataTable
              columns={columns}
              rows={data}
              onRowClick={(i) => setSelected(i)}
              empty={{ title: "No invoices", hint: "Create an invoice to bill a customer." }}
            />
          </>
        )}
      </div>

      {creating && (
        <InvoiceModal
          customers={customers.data ?? []}
          bookings={bookings.data ?? []}
          onClose={() => setCreating(false)}
        />
      )}
      {live && (
        <PaymentModal
          invoice={live}
          customerName={live.customer_id ? custMap[live.customer_id]?.customer_name : undefined}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}

function InvoiceModal({
  customers,
  bookings,
  onClose,
}: {
  customers: { id: string; customer_name: string }[];
  bookings: { id: string; booking_no: string; customer_id: string | null; rate: number }[];
  onClose: () => void;
}) {
  const create = useMutation(createInvoice);
  const [form, setForm] = useState({
    customer_id: customers[0]?.id ?? "",
    booking_id: "",
    amount: "",
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    notes: "",
  });

  function pickBooking(id: string) {
    const b = bookings.find((x) => x.id === id);
    setForm((f) => ({
      ...f,
      booking_id: id,
      customer_id: b?.customer_id ?? f.customer_id,
      amount: b ? String(b.rate) : f.amount,
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_id) return;
    await create.mutate({
      customer_id: form.customer_id,
      booking_id: form.booking_id || null,
      amount: form.amount ? Number(form.amount) : 0,
      issue_date: form.issue_date,
      due_date: form.due_date || null,
      notes: form.notes || null,
    });
    onClose();
  }

  return (
    <Modal title="New invoice" subtitle="Invoice number is generated automatically." onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="From booking (optional)">
          <select className={selectCls} value={form.booking_id} onChange={(e) => pickBooking(e.target.value)}>
            <option value="">— none —</option>
            {bookings.map((b) => (
              <option key={b.id} value={b.id}>
                {b.booking_no}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Customer" required>
          <select className={selectCls} value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.customer_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Amount (₱)" required>
            <input className={inputCls} type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="Issue date">
            <input className={inputCls} type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })} />
          </Field>
          <Field label="Due date">
            <input className={inputCls} type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </Field>
        </div>
        <Field label="Notes">
          <input className={inputCls} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        {create.error && <p className="text-sm text-hazard">{create.error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={create.pending}>
            {create.pending ? "Creating…" : "Create invoice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function PaymentModal({
  invoice,
  customerName,
  onClose,
}: {
  invoice: Invoice;
  customerName?: string;
  onClose: () => void;
}) {
  const payments = useQuery(`payments-${invoice.id}`, () => getPayments(invoice.id));
  const pay = useMutation((amount: number, method: string, note: string) =>
    addPayment(invoice.id, amount, method || null, note || null),
  );
  const balance = outstandingBalance(invoice);
  const [amount, setAmount] = useState(balance > 0 ? String(balance) : "");
  const [method, setMethod] = useState("Cash");
  const [note, setNote] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    await pay.mutate(amt, method, note);
    onClose();
  }

  return (
    <Modal title={`Invoice ${invoice.invoice_number}`} subtitle={customerName} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="label-mono">Amount</p>
            <p className="font-mono text-ink">{formatMoney(invoice.amount)}</p>
          </div>
          <div>
            <p className="label-mono">Paid</p>
            <p className="font-mono text-fleet">{formatMoney(invoice.amount_paid)}</p>
          </div>
          <div>
            <p className="label-mono">Balance</p>
            <p className="font-mono text-hazard">{formatMoney(balance)}</p>
          </div>
        </div>

        <div>
          <p className="label-mono mb-1.5">Payments</p>
          {payments.loading ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : (payments.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No payments recorded.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(payments.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-ink-500">
                    {formatDate(p.payment_date)} · {p.method || "—"}
                  </span>
                  <span className="font-mono font-medium text-ink">{formatMoney(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {invoice.payment_status !== "paid" && (
          <form onSubmit={submit} className="space-y-3 border-t border-line pt-4">
            <p className="label-mono">Record a payment</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₱)" required>
                <input className={inputCls} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
              </Field>
              <Field label="Method">
                <select className={selectCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Check</option>
                  <option>GCash</option>
                </select>
              </Field>
            </div>
            <Field label="Note">
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            {pay.error && <p className="text-sm text-hazard">{pay.error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" variant="accent" disabled={pay.pending}>
                {pay.pending ? "Saving…" : "Record payment"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
