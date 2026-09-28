'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Receipt, Search, Filter, CheckCircle2, Clock } from "lucide-react";

interface BillItem {
  transaction_id: string;
  reference_no: string;
  amount: string;
  transaction_status: string;
  transaction_time: string;
  billing_month: string;
  customer_name: string;
  customer_phone: string;
}

export default function BillerBillsPage() {
  const router = useRouter();
  const [bills, setBills] = useState<BillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/billers/bills", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setBills(data);
      })
      .catch((err) => console.error("Error loading bills:", err))
      .finally(() => setLoading(false));
  }, [router]);

  const filteredBills = bills.filter(
    (b) =>
      b.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_phone?.includes(search) ||
      b.reference_no?.includes(search)
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/biller"
            aria-label="Back to Biller Dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Utility Bills Collection</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Payments collected from consumers across electricity, water, and gas
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        {/* Search Bar */}
        <div className="mb-6 flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <Search className="size-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, or reference number..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>

        {/* Bills Table */}
        <div className="rounded-3xl border border-gray-200 bg-white overflow-hidden shadow-sm dark:border-gray-800 dark:bg-gray-900">
          {loading ? (
            <p className="py-16 text-center text-sm text-gray-500">Loading bill payments...</p>
          ) : filteredBills.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="mx-auto size-10 text-gray-400 opacity-60" />
              <p className="mt-3 text-sm font-semibold">No bill collections found</p>
              <p className="text-xs text-gray-500 mt-1">Utility bill payments made by customers will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-gray-200 bg-gray-50 uppercase text-[10px] font-semibold text-gray-500 dark:border-gray-800 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-5 py-3.5">Ref No</th>
                    <th className="px-5 py-3.5">Customer</th>
                    <th className="px-5 py-3.5">Billing Month</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredBills.map((b) => (
                    <tr key={b.transaction_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                      <td className="px-5 py-4 font-mono font-medium">{b.reference_no}</td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">{b.customer_name}</p>
                        <p className="text-gray-400 text-[11px]">{b.customer_phone}</p>
                      </td>
                      <td className="px-5 py-4">{b.billing_month || "Current Month"}</td>
                      <td className="px-5 py-4 text-gray-500">
                        {new Date(b.transaction_time).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        ৳{parseFloat(b.amount).toFixed(2)}
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          <CheckCircle2 size={12} /> {b.transaction_status}
                        </span>
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
