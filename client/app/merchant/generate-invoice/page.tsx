'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  Check,
  Calendar,
  Store,
  Receipt,
  ExternalLink,
  Sparkles,
  Loader2
} from "lucide-react";

export default function GenerateInvoicePage() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  const [merchantData, setMerchantData] = useState<{
    business_name: string;
    phone_number: string;
  }>({ business_name: "Quickie Merchant", phone_number: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdInvoice, setCreatedInvoice] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || (role !== "MERCHANT" && role !== "BUSINESS")) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/merchants/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.business_name) {
          setMerchantData({
            business_name: data.business_name,
            phone_number: data.phone_number || ""
          });
        }
      })
      .catch((err) => console.error("Error fetching merchant profile:", err));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount greater than 0");
      return;
    }

    setLoading(true);
    const token = sessionStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5001/api/merchants/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          customer_name: customerName.trim() || "Valued Customer",
          customer_phone: customerPhone.trim() || null,
          amount: numAmount,
          description: description.trim() || null,
          due_date: dueDate || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create invoice");
      }

      setCreatedInvoice(data.invoice);
    } catch (err: any) {
      setError(err.message || "Failed to generate invoice");
    } finally {
      setLoading(false);
    }
  };

  const paymentUrl = createdInvoice
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/make-payment?merchant=${merchantData.phone_number}&invoice=${createdInvoice.invoice_number}&amount=${createdInvoice.amount}`
    : "";

  const handleCopyLink = () => {
    if (!paymentUrl) return;
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/merchant/invoices"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Create Invoice</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Generate a customer invoice with instant payment link</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        {createdInvoice ? (
          /* SUCCESS VIEW */
          <div className="mx-auto max-w-lg rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-800 dark:bg-gray-950">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>

            <h2 className="mt-4 text-xl font-bold tracking-tight">Invoice Generated!</h2>
            <p className="mt-1 text-xs text-gray-500">
              Invoice #{createdInvoice.invoice_number} is ready for collection
            </p>

            {/* Slip details */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4 text-left space-y-2 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Customer</span>
                <span className="font-semibold text-gray-900 dark:text-white">{createdInvoice.customer_name}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Amount Due</span>
                <span className="font-bold text-pink-600 dark:text-pink-400">৳{parseFloat(createdInvoice.amount).toFixed(2)}</span>
              </div>
              {createdInvoice.due_date && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Due Date</span>
                  <span>{new Date(createdInvoice.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Payment link copy box */}
            <div className="mt-6 text-left">
              <label className="text-xs font-semibold text-gray-500">Customer Payment Link</label>
              <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-2 dark:border-gray-800 dark:bg-gray-900">
                <input
                  type="text"
                  readOnly
                  value={paymentUrl}
                  className="w-full bg-transparent px-2 text-xs font-mono text-gray-700 outline-none dark:text-gray-300"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl bg-pink-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-pink-700"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCreatedInvoice(null);
                  setAmount("");
                  setDescription("");
                  setCustomerName("");
                  setCustomerPhone("");
                }}
                className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
              >
                Create Another Invoice
              </button>
              <Link
                href="/merchant/invoices"
                className="w-full rounded-2xl bg-pink-600 py-3 text-sm font-semibold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700"
              >
                View All Invoices
              </Link>
            </div>
          </div>
        ) : (
          /* FORM + LIVE PREVIEW */
          <div className="grid gap-8 md:grid-cols-2">
            {/* Form Column */}
            <form onSubmit={handleSubmit} className="space-y-5 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-base font-semibold">Invoice Information</h2>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {/* Customer Name */}
              <div>
                <label className="text-xs font-semibold text-gray-500">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {/* Customer Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-500">Customer Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 01712345678"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  maxLength={11}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-gray-500">Invoice Amount (৳) *</label>
                <div className="mt-1 relative flex items-center">
                  <span className="absolute left-4 font-bold text-gray-400">৳</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-base font-bold outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-gray-500">Due Date (Optional)</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {/* Description / Memo */}
              <div>
                <label className="text-xs font-semibold text-gray-500">Notes / Items Description</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Monthly maintenance fee, 2x Premium T-Shirts"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !amount || parseFloat(amount) <= 0}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-pink-600/20 transition hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                <span>Generate Invoice</span>
              </button>
            </form>

            {/* Live Preview Slip */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-sm rounded-3xl border border-dashed border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-950">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Store className="size-5 text-pink-600" />
                    <span className="font-bold text-sm tracking-tight">{merchantData.business_name}</span>
                  </div>
                  <span className="rounded-full bg-pink-50 px-2 py-0.5 text-[10px] font-bold text-pink-600 dark:bg-pink-950/50">
                    PREVIEW
                  </span>
                </div>

                <div className="mt-5 space-y-3 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Invoice #</span>
                    <span className="font-mono text-gray-900 dark:text-white">INV-PREVIEW</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Customer</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {customerName.trim() || "Customer Name"}
                    </span>
                  </div>
                  {customerPhone && (
                    <div className="flex justify-between text-gray-500">
                      <span>Phone</span>
                      <span className="text-gray-900 dark:text-white">{customerPhone}</span>
                    </div>
                  )}
                  {dueDate && (
                    <div className="flex justify-between text-gray-500">
                      <span>Due Date</span>
                      <span className="text-amber-600">{new Date(dueDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {description && (
                    <div className="border-t border-gray-100 pt-2 dark:border-gray-800">
                      <span className="text-gray-400">Description:</span>
                      <p className="mt-0.5 text-gray-700 dark:text-gray-300 italic">{description}</p>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t-2 border-gray-100 pt-4 dark:border-gray-800">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-gray-500">TOTAL DUE</span>
                    <span className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                      ৳{parseFloat(amount || "0").toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-gray-50 p-3 text-center text-[11px] text-gray-400 dark:bg-gray-900">
                  Customer will receive a direct payment link upon creation
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
