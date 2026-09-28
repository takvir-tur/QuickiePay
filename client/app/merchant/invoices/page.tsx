'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Filter,
  DollarSign,
  Calendar,
  Loader2,
  Store
} from "lucide-react";

interface Invoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  customer_phone: string;
  amount: string;
  description: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  due_date: string;
  created_at: string;
  paid_at?: string;
}

export default function MerchantInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [merchantPhone, setMerchantPhone] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || (role !== "MERCHANT" && role !== "BUSINESS")) {
      router.push("/login");
      return;
    }

    // Load merchant profile to get merchant's phone number for payment links
    fetch("http://localhost:5001/api/merchants/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.phone_number) setMerchantPhone(data.phone_number);
      })
      .catch((err) => console.error("Error fetching merchant phone:", err));

    fetchInvoices();
  }, [router]);

  const fetchInvoices = () => {
    const token = sessionStorage.getItem("token");
    setLoading(true);
    fetch("http://localhost:5001/api/merchants/invoices", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setInvoices(data);
      })
      .catch((err) => console.error("Error fetching invoices:", err))
      .finally(() => setLoading(false));
  };

  const handleStatusChange = async (invoiceId: string, newStatus: "PAID" | "CANCELLED") => {
    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5001/api/merchants/invoices/${invoiceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchInvoices();
      }
    } catch (err) {
      console.error("Error updating invoice status:", err);
    }
  };

  const copyPaymentLink = (invoice: Invoice) => {
    const link = `${window.location.origin}/make-payment?merchant=${merchantPhone}&invoice=${invoice.invoice_number}&amount=${invoice.amount}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invoice.invoice_id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(query) ||
      (inv.customer_name && inv.customer_name.toLowerCase().includes(query)) ||
      (inv.customer_phone && inv.customer_phone.includes(query)) ||
      (inv.description && inv.description.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const totalAmount = invoices.reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
  const paidAmount = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);
  const pendingAmount = invoices
    .filter((inv) => inv.status === "PENDING")
    .reduce((sum, inv) => sum + parseFloat(inv.amount || "0"), 0);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/merchant"
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Invoice Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Track and generate customer billing links</p>
            </div>
          </div>
          <Link
            href="/merchant/generate-invoice"
            className="flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700"
          >
            <Plus className="size-4" />
            <span>Create Invoice</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-gray-500 dark:text-gray-400">Total Invoiced</p>
            <p className="mt-2 text-2xl font-bold">৳{totalAmount.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">{invoices.length} invoices generated</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-emerald-600 dark:text-emerald-400">Paid & Collected</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">৳{paidAmount.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {invoices.filter((i) => i.status === "PAID").length} settled
            </p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-amber-600 dark:text-amber-400">Pending Dues</p>
            <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">৳{pendingAmount.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {invoices.filter((i) => i.status === "PENDING").length} awaiting payment
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Status Tabs */}
          <div className="flex rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
            {["ALL", "PENDING", "PAID", "CANCELLED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                  statusFilter === status
                    ? "bg-white text-pink-600 shadow-sm dark:bg-gray-950 dark:text-pink-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {status.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer or invoice..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-pink-500 dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </div>

        {/* Invoice List */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-pink-600" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900">
                <FileSpreadsheet className="size-7" />
              </div>
              <p className="mt-4 text-base font-semibold">No invoices found</p>
              <p className="mt-1 text-xs text-gray-500">
                {searchQuery || statusFilter !== "ALL"
                  ? "Try changing your search query or filter"
                  : "Generate your first customer invoice to start receiving payments"}
              </p>
              <Link
                href="/merchant/generate-invoice"
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-pink-700"
              >
                <Plus className="size-3.5" />
                <span>Create Invoice</span>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Invoice #</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date / Due</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.invoice_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                      <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{inv.invoice_number}</span>
                          <button
                            title="Copy payment link"
                            onClick={() => copyPaymentLink(inv)}
                            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-pink-600 dark:hover:bg-gray-800"
                          >
                            {copiedId === inv.invoice_id ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">{inv.customer_name}</p>
                        <p className="text-xs text-gray-500">{inv.customer_phone || "No phone provided"}</p>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        ৳{parseFloat(inv.amount).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        <p>Issued: {new Date(inv.created_at).toLocaleDateString()}</p>
                        {inv.due_date && <p className="text-amber-600">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                      </td>
                      <td className="px-6 py-4">
                        {inv.status === "PAID" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Paid
                          </span>
                        )}
                        {inv.status === "PENDING" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            <Clock className="size-3" /> Pending
                          </span>
                        )}
                        {inv.status === "CANCELLED" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                            <XCircle className="size-3" /> Cancelled
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => copyPaymentLink(inv)}
                            className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-2.5 py-1 text-xs font-medium hover:border-pink-300 hover:text-pink-600 dark:border-gray-800"
                          >
                            {copiedId === inv.invoice_id ? "Copied!" : "Pay Link"}
                          </button>
                          {inv.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleStatusChange(inv.invoice_id, "PAID")}
                                className="rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => handleStatusChange(inv.invoice_id, "CANCELLED")}
                                className="rounded-xl px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
