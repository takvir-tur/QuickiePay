'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  XCircle,
  FileSpreadsheet,
  Download,
  Calendar,
  Loader2,
  Store,
  DollarSign
} from "lucide-react";

interface MerchantTx {
  transaction_id: string;
  reference_no: string;
  amount: string;
  fee: string;
  transaction_type: string;
  transaction_status: string;
  remarks?: string;
  transaction_time: string;
  direction: "RECEIVED" | "SENT";
  customer_name?: string;
  customer_phone?: string;
  invoice_number?: string;
}

export default function MerchantTransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<MerchantTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "RECEIVED" | "SENT">("ALL");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || (role !== "MERCHANT" && role !== "BUSINESS")) {
      router.push("/login");
      return;
    }

    fetchTransactions();
  }, [router]);

  const fetchTransactions = () => {
    const token = sessionStorage.getItem("token");
    setLoading(true);
    fetch("http://localhost:5001/api/merchants/transactions", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
      })
      .catch((err) => console.error("Error fetching transactions:", err))
      .finally(() => setLoading(false));
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesDir = directionFilter === "ALL" || tx.direction === directionFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      tx.reference_no.toLowerCase().includes(q) ||
      (tx.customer_name && tx.customer_name.toLowerCase().includes(q)) ||
      (tx.customer_phone && tx.customer_phone.includes(q)) ||
      (tx.invoice_number && tx.invoice_number.toLowerCase().includes(q)) ||
      (tx.remarks && tx.remarks.toLowerCase().includes(q));
    return matchesDir && matchesSearch;
  });

  const totalSalesReceived = transactions
    .filter((tx) => tx.direction === "RECEIVED" && tx.transaction_status === "SUCCESS")
    .reduce((sum, tx) => sum + parseFloat(tx.amount || "0"), 0);

  const receivedCount = transactions.filter(
    (tx) => tx.direction === "RECEIVED" && tx.transaction_status === "SUCCESS"
  ).length;

  const avgSales = receivedCount > 0 ? totalSalesReceived / receivedCount : 0;

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
              <h1 className="text-xl font-semibold tracking-tight">Store Sales & Transactions</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Complete record of payments received and transfers</p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-emerald-600 dark:text-emerald-400">Total Sales Collected</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">৳{totalSalesReceived.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">{receivedCount} successful customer payments</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-gray-500">Average Order Size</p>
            <p className="mt-2 text-2xl font-bold">৳{avgSales.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-500">Per customer payment</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-pink-600 dark:text-pink-400">Total Activity</p>
            <p className="mt-2 text-2xl font-bold text-pink-600 dark:text-pink-400">{transactions.length}</p>
            <p className="mt-1 text-xs text-gray-500">Total operations recorded</p>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex rounded-2xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900">
            {(["ALL", "RECEIVED", "SENT"] as const).map((dir) => (
              <button
                key={dir}
                onClick={() => setDirectionFilter(dir)}
                className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition ${
                  directionFilter === dir
                    ? "bg-white text-pink-600 shadow-sm dark:bg-gray-950 dark:text-pink-400"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {dir === "ALL" ? "All Activity" : dir === "RECEIVED" ? "Sales (In)" : "Payouts (Out)"}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, phone, or ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-pink-500 dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-pink-600" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900">
                <CreditCard className="size-7" />
              </div>
              <p className="mt-4 text-base font-semibold">No transactions recorded</p>
              <p className="mt-1 text-xs text-gray-500">
                Customer payments and store sales will automatically show up here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Transaction / Ref</th>
                    <th className="px-6 py-4">Customer / Counterparty</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Date & Time</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white font-mono text-xs">
                          {tx.reference_no}
                        </p>
                        {tx.invoice_number && (
                          <span className="mt-0.5 inline-block text-[11px] font-medium text-pink-600 dark:text-pink-400">
                            Inv: {tx.invoice_number}
                          </span>
                        )}
                        {tx.remarks && (
                          <p className="text-xs text-gray-400 italic">{tx.remarks}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {tx.customer_name || "QuickiePay User"}
                        </p>
                        <p className="text-xs text-gray-500">{tx.customer_phone || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {tx.direction === "RECEIVED" ? (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <ArrowDownLeft className="size-3.5" /> Customer Payment
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <ArrowUpRight className="size-3.5" /> Transfer / Cash Out
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500">
                        {new Date(tx.transaction_time).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`font-bold ${
                            tx.direction === "RECEIVED"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {tx.direction === "RECEIVED" ? "+" : "-"}৳{parseFloat(tx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {tx.transaction_status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            <XCircle className="size-3" /> Failed
                          </span>
                        )}
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
