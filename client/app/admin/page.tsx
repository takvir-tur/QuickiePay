'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  BookOpen,
  ShieldAlert,
  Settings,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Activity,
  UserCheck,
  AlertTriangle,
  Moon,
  Sun,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

type SeverityLevel = "high" | "medium" | "low";

interface FlaggedTransaction {
  id: string;
  name: string;
  phone: string;
  type: string;
  amount: string;
  reason: string;
  severity: SeverityLevel;
}

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, href: "/admin" },
  { label: "User Management", icon: Users, href: "/admin/users" },
  { label: "Global Ledger", icon: BookOpen, href: "/admin/ledger" },
  { label: "Fraud Alerts", icon: ShieldAlert, badge: 6, href: "/admin/alerts" },
  { label: "System Config", icon: Settings, href: "/admin/config" },
];

const SEVERITY_STYLE = {
  high: "text-[#F0575C] bg-[#F0575C]/10 ring-1 ring-inset ring-[#F0575C]/25",
  medium: "text-[#D4A72C] bg-[#D4A72C]/10 ring-1 ring-inset ring-[#D4A72C]/25",
  low: "text-[#8B8D92] bg-white/5 ring-1 ring-inset ring-white/10",
};

export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  
  // Real data states
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: "0",
    totalBalance: "৳0.00",
    volume24h: "৳0.00",
    pendingReviews: "0"
  });
  const [flaggedRows, setFlaggedRows] = useState<FlaggedTransaction[]>([]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || role !== "SUPER_ADMIN") {
      router.push("/login");
      return;
    }

    // Fetch live dashboard data
    fetch("http://localhost:5001/api/admin/dashboard", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then((res) => {
        if (!res.ok) return Promise.reject("Failed to fetch admin data");
        return res.json();
      })
      .then((data) => {
        setStats(data.stats);
        setFlaggedRows(data.flagged);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Admin fetch error:", err);
        setLoading(false);
      });
  }, [router]);

  // Combine static UI config with dynamic backend numbers
  const KPIS = [
    { label: "Total Active Users", value: stats.totalUsers, delta: "+2.4%", up: true, icon: UserCheck },
    { label: "Total Platform Balance", value: stats.totalBalance, delta: "+0.8%", up: true, icon: Wallet },
    { label: "24h Transaction Volume", value: stats.volume24h, delta: "-1.2%", up: false, icon: Activity },
    { label: "Pending Risk Reviews", value: stats.pendingReviews, delta: "+11.0%", up: false, icon: AlertTriangle, warn: true },
  ];

  const filteredRows = useMemo(() => {
    if (!query.trim()) return flaggedRows;
    const q = query.toLowerCase();
    return flaggedRows.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.phone.replace(/\s|-/g, "").includes(q.replace(/\s|-/g, "")) ||
        r.name.toLowerCase().includes(q)
    );
  }, [query, flaggedRows]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen w-full bg-[#F6F6F7] text-[#16171A] dark:bg-[#0A0B0D] dark:text-[#E8E9EA] font-sans antialiased">
        <div className="flex h-screen overflow-hidden">
          
          {/* ---------------- Sidebar ---------------- */}
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
                      isActive
                        ? "bg-[#0FAE71]/10 text-[#0FAE71] font-medium"
                        : "text-[#5B5D63] dark:text-[#9A9CA2] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-[#16171A] dark:hover:text-[#E8E9EA]"
                    }`}
                  >
                    <Icon size={15} strokeWidth={2} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-[#F0575C]/15 text-[#F0575C]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="px-3 py-3 border-t border-black/[0.06] dark:border-white/[0.06] space-y-1">
              <button
                onClick={() => router.push("/")}
                className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] text-[#5B5D63] dark:text-[#9A9CA2] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                <ArrowLeft size={15} />
                Back to QuickiePay
              </button>
              <button
                onClick={() => setDark((d) => !d)}
                className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] text-[#5B5D63] dark:text-[#9A9CA2] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              >
                {dark ? <Sun size={15} /> : <Moon size={15} />}
                {dark ? "Light mode" : "Dark mode"}
              </button>
            </div>
          </aside>

          {/* ---------------- Main ---------------- */}
          <div className="flex-1 flex flex-col min-w-0">
            <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0E0F12]">
              <div className="relative flex-1 max-w-xl">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D92]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Look up by phone number or transaction ID…"
                  className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-[#F2F2F3] dark:bg-white/[0.05] border border-transparent focus:border-[#0FAE71]/40 focus:bg-white dark:focus:bg-[#16171A] outline-none placeholder:text-[#8B8D92] transition-colors"
                />
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#0FAE71] to-[#0A7A50] flex items-center justify-center text-[10px] font-semibold text-white">
                    SA
                  </div>
                  <span className="text-[12px] font-medium hidden sm:inline">Super Admin</span>
                </button>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* KPI grid */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {KPIS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div key={k.label} className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] px-4 py-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11.5px] text-[#8B8D92] font-medium">{k.label}</span>
                        <Icon size={14} className={k.warn ? "text-[#D4A72C]" : "text-[#8B8D92]"} />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[20px] font-semibold tabular-nums tracking-tight">
                          {loading ? "..." : k.value}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </section>

              {/* Flagged activity table */}
              <section className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] overflow-hidden">
                <div className="flex items-center justify-between px-4 h-12 border-b border-black/[0.06] dark:border-white/[0.07]">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-[13.5px] font-semibold">Recent Transactions</h2>
                    <span className="text-[11px] font-medium text-[#8B8D92] bg-black/[0.04] dark:bg-white/[0.06] rounded px-1.5 py-0.5 tabular-nums">
                      {filteredRows.length}
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.07] text-left">
                        {["Transaction ID", "Entity", "Type", "Amount", "Status", ""].map((h) => (
                          <th key={h} className="px-4 py-2 font-medium text-[11px] text-[#8B8D92] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B8D92]">Loading ledger...</td></tr>
                      ) : filteredRows.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-8 text-center text-[#8B8D92]">No activity matches "{query}"</td></tr>
                      ) : (
                        filteredRows.map((r) => (
                          <tr key={r.id} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 font-mono text-[12px] tabular-nums whitespace-nowrap">{r.id}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <div className="font-medium">{r.name}</div>
                              <div className="text-[11px] text-[#8B8D92] font-mono tabular-nums">{r.phone}</div>
                            </td>
                            <td className="px-4 py-2.5 text-[#5B5D63] dark:text-[#9A9CA2] whitespace-nowrap">{r.type}</td>
                            <td className="px-4 py-2.5 font-mono tabular-nums whitespace-nowrap">{r.amount}</td>
                            <td className="px-4 py-2.5 whitespace-nowrap">
                              <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[r.severity]}`}>
                                {r.reason}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap">
                              <button className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#0FAE71] hover:text-[#0C8F5D] border border-[#0FAE71]/25 hover:border-[#0FAE71]/45 rounded-md px-2.5 py-1">
                                Investigate
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}