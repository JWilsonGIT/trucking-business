"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { DataTable, type Column } from "@/components/DataTable";
import {
  Button,
  Field,
  Modal,
  PageSkeleton,
  LoadError,
  inputCls,
  selectCls,
  textareaCls,
} from "@/components/primitives";
import { useQuery, useMutation } from "@/lib/db/hooks";
import {
  getCustomers,
  getInvoices,
  createCustomer,
  updateCustomer,
} from "@/lib/db/queries";
import { PAYMENT_TERMS_LABELS, type Customer, type PaymentTerms } from "@/lib/db/types";
import { outstandingBalance } from "@/lib/selectors";
import { formatMoney } from "@/lib/utils";

const TERMS = Object.keys(PAYMENT_TERMS_LABELS) as PaymentTerms[];

export default function CustomersPage() {
  const customers = useQuery("customers", getCustomers);
  const invoices = useQuery("invoices", getInvoices);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);

  const outstandingByCustomer = (id: string) =>
    (invoices.data ?? [])
      .filter((i) => i.customer_id === id && i.payment_status !== "paid")
      .reduce((s, i) => s + outstandingBalance(i), 0);

  const columns: Column<Customer>[] = [
    {
      key: "name",
      header: "Customer",
      render: (c) => (
        <div>
          <p className="font-medium text-ink">{c.customer_name}</p>
          {c.company_name && <p className="text-xs text-muted">{c.company_name}</p>}
        </div>
      ),
    },
    { key: "contact", header: "Contact", render: (c) => c.contact_number || "—" },
    { key: "email", header: "Email", render: (c) => c.email || "—" },
    {
      key: "terms",
      header: "Terms",
      render: (c) => <span className="label-mono">{PAYMENT_TERMS_LABELS[c.payment_terms]}</span>,
    },
    {
      key: "outstanding",
      header: "Outstanding",
      align: "right",
      render: (c) => {
        const bal = outstandingByCustomer(c.id);
        return (
          <span className={bal > 0 ? "font-medium text-hazard" : "text-muted"}>
            {formatMoney(bal)}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (c) => (
        <button
          onClick={() => setEditing(c)}
          className="rounded-lg p-1.5 text-muted hover:bg-paper hover:text-ink"
          aria-label="Edit customer"
        >
          <Pencil size={15} />
        </button>
      ),
    },
  ];

  return (
    <>
      <TopBar
        heading="Customers"
        actions={
          <Button variant="accent" onClick={() => setCreating(true)}>
            <Plus size={16} /> Add customer
          </Button>
        }
      />
      <div className="space-y-4 p-6">
        {customers.loading ? (
          <PageSkeleton />
        ) : customers.error ? (
          <LoadError message={customers.error} />
        ) : (
          <DataTable
            columns={columns}
            rows={customers.data ?? []}
            empty={{ title: "No customers yet", hint: "Add your first customer to start booking." }}
          />
        )}
      </div>

      {(creating || editing) && (
        <CustomerModal customer={editing} onClose={() => (setCreating(false), setEditing(null))} />
      )}
    </>
  );
}

function CustomerModal({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const create = useMutation(createCustomer);
  const update = useMutation(
    (id: string, patch: Partial<Customer>) => updateCustomer(id, patch),
  );
  const [form, setForm] = useState({
    customer_name: customer?.customer_name ?? "",
    company_name: customer?.company_name ?? "",
    contact_number: customer?.contact_number ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    payment_terms: (customer?.payment_terms ?? "cod") as PaymentTerms,
    notes: customer?.notes ?? "",
  });
  const busy = create.pending || update.pending;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer_name.trim()) return;
    if (customer) await update.mutate(customer.id, form);
    else await create.mutate(form);
    onClose();
  }

  return (
    <Modal
      title={customer ? "Edit customer" : "New customer"}
      onClose={onClose}
      subtitle={customer ? customer.customer_name : "Add a client to book deliveries for."}
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="Customer name" required>
          <input
            className={inputCls}
            value={form.customer_name}
            onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            autoFocus
          />
        </Field>
        <Field label="Company">
          <input
            className={inputCls}
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact number">
            <input
              className={inputCls}
              value={form.contact_number}
              onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              className={inputCls}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Address">
          <input
            className={inputCls}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
        <Field label="Payment terms">
          <select
            className={selectCls}
            value={form.payment_terms}
            onChange={(e) => setForm({ ...form, payment_terms: e.target.value as PaymentTerms })}
          >
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {PAYMENT_TERMS_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes">
          <textarea
            className={textareaCls}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        {(create.error || update.error) && (
          <p className="text-sm text-hazard">{create.error || update.error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" disabled={busy}>
            {busy ? "Saving…" : customer ? "Save changes" : "Add customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
