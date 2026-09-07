'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  CreditCard,
  HandCoins,
  Receipt,
  Smartphone,
  Wallet,
} from "lucide-react";

type TransactionType =
  | "SEND_MONEY"
  | "MOBILE_RECHARGE"
  | "CASH_OUT"
  | "PAY_BILL"
  | "MAKE_PAYMENT"
  | "RECEIVED";

interface Transaction {
  id: string;
  type: TransactionType;
  receiverName: string;
  receiverPhone: string;
  amount: number;
  date: string;
  status: string;
  note: string | null;
  fee: number;
}

const typeMeta: Record<TransactionType, { icon: any; tone: string; label: string }> = {
  "SEND_MONEY": { icon: ArrowUpRight, tone: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500", label: "Send Money" },
  "MOBILE_RECHARGE": { icon: Smartphone, tone: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-500", label: "Mobile Recharge" },
  "CASH_OUT": { icon: HandCoins, tone: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500", label: "Cash Out" },
  "PAY_BILL": { icon: Receipt, tone: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-500", label: "Pay Bill" },
  "MAKE_PAYMENT": { icon: CreditCard, tone: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-500", label: "Make Payment" },
  "RECEIVED": { icon: Wallet, tone: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-500", label: "Received" },
};

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    // Fetch the real transaction history
    fetch("http://localhost:5001/api/transactions/history", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => {
        // 1. Check for expired tokens (401/403) and kick safely to login
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          return Promise.reject("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        // 2. ONLY set state if it's an actual array to prevent the .map() crash
        if (Array.isArray(data)) {
          setTransactions(data);
        } else {
          console.error("Backend sent an error instead of an array:", data);
          setTransactions([]); 
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching transactions:", err);
        setLoading(false);
      });
  }, [router]);

  function toggle(id: string) {
    setExpandedId((current) => (current === id ? null : id));
  }

  function formatDate(isoString: string) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', month: 'short', year: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      
      {/* Header matching your Send Money / Confirm PIN pages */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Transactions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Review your recent activity</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-8 md:px-0 md:py-10">
        {loading ? (
          <p className="text-center text-sm text-gray-500">Loading transactions...</p>
        ) : transactions.length === 0 ? (
          <p className="text-center text-sm text-gray-500">No transactions found.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {transactions.map((t) => {
              // Fallback to SEND_MONEY if the type in the DB doesn't exactly match the dictionary
              const meta = typeMeta[t.type] || typeMeta["SEND_MONEY"];
              const Icon = meta.icon;
              const isReceived = t.type === "RECEIVED";
              const isExpanded = expandedId === t.id;
              const numericAmount = parseFloat(String(t.amount)) || 0;
              const numericFee = parseFloat(String(t.fee)) || 0;
              const total = isReceived ? numericAmount : numericAmount + numericFee;

              return (
                <div
                  key={t.id}
                  className="rounded-3xl border border-gray-200 bg-white transition-all hover:border-blue-300 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800"
                >
                  <button
                    onClick={() => toggle(t.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-4 p-5 text-left"
                  >
                    <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${meta.tone}`}>
                      <Icon className="size-6" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.receiverName}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {meta.label} · {t.id}
                      </p>
                    </div>
                    
                    <div className="hidden min-w-[120px] text-right sm:block">
                      <p className={`text-sm font-semibold ${isReceived ? "text-green-600 dark:text-green-500" : "text-gray-900 dark:text-white"}`}>
                        {isReceived ? "+" : "-"}৳{numericAmount.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(t.date)}
                      </p>
                    </div>
                    
                    <div className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {t.status}
                    </div>
                    
                    <ChevronDown
                      className={`size-5 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 px-5 pb-5 pt-4 dark:border-gray-800">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Detail label="Transaction ID" value={t.id} />
                        <Detail label="Type" value={meta.label} />
                        <Detail label="Entity" value={t.receiverName} />
                        <Detail label="Contact" value={t.receiverPhone} />
                        <Detail label="Date & time" value={formatDate(t.date)} />
                        <Detail label="Status" value={t.status} />
                        <Detail label="Amount" value={`${isReceived ? "+" : "-"}৳${numericAmount.toFixed(2)}`} />
                        <Detail label="Fee" value={`৳${numericFee.toFixed(2)}`} />
                      </div>
                      
                      {t.note && (
                        <div className="mt-4 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            Note
                          </p>
                          <p className="mt-1 text-sm">{t.note}</p>
                        </div>
                      )}
                      
                      <div className="mt-4 flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Total {isReceived ? "received" : "deducted"}
                        </p>
                        <p className={`text-lg font-semibold ${isReceived ? "text-green-600 dark:text-green-500" : "text-gray-900 dark:text-white"}`}>
                          {isReceived ? "+" : "-"}৳{total.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}