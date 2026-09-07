'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, Users, BookOpen, ShieldAlert, Settings, Search, Sun, Moon, ArrowLeft, ArrowRight } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, href: "/admin" },
  { label: "User Management", icon: Users, href: "/admin/users" },
  { label: "Global Ledger", icon: BookOpen, href: "/admin/ledger" },
  { label: "Fraud Alerts", icon: ShieldAlert, badge: 6, href: "/admin/alerts" },
  { label: "System Config", icon: Settings, href: "/admin/config" },
];

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: "text-[#0FAE71] bg-[#0FAE71]/10 ring-1 ring-inset ring-[#0FAE71]/20",
  PENDING: "text-[#D4A72C] bg-[#D4A72C]/10 ring-1 ring-inset ring-[#D4A72C]/20",
  FAILED: "text-[#F0575C] bg-[#F0575C]/10 ring-1 ring-inset ring-[#F0575C]/20",
  CANCELLED: "text-[#8B8D92] bg-white/5 ring-1 ring-inset ring-white/10",
};

export default function GlobalLedgerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch("http://localhost:5001/api/admin/ledger", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setTransactions(data);
        setLoading(false);
      });
  }, [router]);

  const filteredTxns = useMemo(() => {
    if (!query.trim()) return transactions;
    const q = query.toLowerCase();
    return transactions.filter(t => 
      t.transaction_id.toLowerCase().includes(q) ||
      t.reference_no?.toLowerCase().includes(q) ||
      t.sender_phone.includes(q) ||
      t.receiver_phone.includes(q)
    );
  }, [query, transactions]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen w-full bg-[#F6F6F7] text-[#16171A] dark:bg-[#0A0B0D] dark:text-[#E8E9EA] font-sans antialiased flex">
        
        {/* Sidebar */}
        <aside className="hidden md:flex w-[228px] shrink-0 flex-col border-r border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0E0F12]">
          <div className="flex items-center gap-2 px-5 h-14 border-b border-black/[0.06] dark:border-white/[0.06]">
            <div className="h-6 w-6 rounded-[6px] bg-[#0FAE71] flex items-center justify-center">
              <span className="text-[11px] font-bold text-black tracking-tight">Q</span>
            </div>
            <span className="text-[13px] font-semibold tracking-tight">QuickiePay Admin</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors ${
                    isActive ? "bg-[#0FAE71]/10 text-[#0FAE71] font-medium" : "text-[#5B5D63] dark:text-[#9A9CA2] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#16171A] dark:hover:text-[#E8E9EA]"
                  }`}
                >
                  <Icon size={15} strokeWidth={2} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="px-3 py-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
            <button onClick={() => router.push("/")} className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] text-[#5B5D63] dark:text-[#9A9CA2] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
              <ArrowLeft size={15} /> Back to QuickiePay
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 shrink-0 flex items-center px-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0E0F12]">
            <div className="relative flex-1 max-w-xl">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D92]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search ledger by TXN ID, Reference, or Phone..."
                className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-[#F2F2F3] dark:bg-white/[0.05] outline-none"
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] overflow-hidden">
              <div className="flex items-center justify-between px-4 h-12 border-b border-black/[0.06] dark:border-white/[0.07]">
                <h2 className="text-[13.5px] font-semibold">Platform Master Ledger</h2>
                <span className="text-[11px] font-medium text-[#8B8D92] bg-black/[0.04] dark:bg-white/[0.06] rounded px-1.5 py-0.5 tabular-nums">
                  {filteredTxns.length} Records
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] text-left">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.07] text-[#8B8D92]">
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Time / TXN ID</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Type</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Sender</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Receiver</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Amount</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Fee</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="p-8 text-center text-[#8B8D92]">Synchronizing global ledger...</td></tr>
                    ) : filteredTxns.length === 0 ? (
                      <tr><td colSpan={7} className="p-8 text-center text-[#8B8D92]">No transactions found</td></tr>
                    ) : filteredTxns.map((t) => (
                      <tr key={t.transaction_id} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-[11px] text-[#8B8D92] mb-0.5">
                            {new Date(t.transaction_time).toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] uppercase tracking-wider text-[#5B5D63] dark:text-[#9A9CA2]">
                            {t.transaction_id.split('-')[0]}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-[11px] uppercase tracking-wider whitespace-nowrap">
                          {t.transaction_type.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{t.sender_name}</div>
                          <div className="text-[11px] text-[#8B8D92] font-mono tabular-nums">{t.sender_phone}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <ArrowRight size={12} className="text-[#8B8D92] shrink-0" />
                            <div>
                              <div className="font-medium">{t.receiver_name}</div>
                              <div className="text-[11px] text-[#8B8D92] font-mono tabular-nums">{t.receiver_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums font-mono text-right whitespace-nowrap">
                          ৳{parseFloat(t.amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 tabular-nums font-mono text-right text-[#8B8D92] whitespace-nowrap">
                          ৳{parseFloat(t.fee).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${STATUS_STYLE[t.transaction_status] || STATUS_STYLE.PENDING}`}>
                            {t.transaction_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}