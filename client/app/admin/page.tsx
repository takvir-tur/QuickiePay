import React, { useState, useMemo } from "react";
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
  MoreHorizontal,
  ArrowRight,
} from "lucide-react";

/* ---------------------------------------------------------------
   QuickiePay — Super Admin Console
   Dense, typographic, operator-grade panel. Tabular numerals on
   every numeric/ID column. One accent (emerald) reserved for
   "healthy/active" state; amber and red are reserved strictly for
   risk semantics, never decoration.
----------------------------------------------------------------- */

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, active: true },
  { label: "User Management", icon: Users },
  { label: "Global Ledger", icon: BookOpen },
  { label: "Fraud Alerts", icon: ShieldAlert, badge: 6 },
  { label: "System Config", icon: Settings },
];

const KPIS = [
  {
    label: "Total Active Users",
    value: "482,910",
    delta: "+2.4%",
    up: true,
    icon: UserCheck,
  },
  {
    label: "Total Platform Balance",
    value: "৳1.84B",
    delta: "+0.8%",
    up: true,
    icon: Wallet,
  },
  {
    label: "24h Transaction Volume",
    value: "৳96.2M",
    delta: "-1.2%",
    up: false,
    icon: Activity,
  },
  {
    label: "Pending Risk Reviews",
    value: "37",
    delta: "+11.0%",
    up: false,
    icon: AlertTriangle,
    warn: true,
  },
];

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

const FLAGGED: FlaggedTransaction[] = [
  {
    id: "TXN-88213A",
    name: "Rafiq Islam",
    phone: "+880 1712-334455",
    type: "Cash-Out",
    amount: "৳ 85,000.00",
    reason: "Velocity spike",
    severity: "high",
  },
  {
    id: "TXN-88209F",
    name: "Nusrat Jahan",
    phone: "+880 1934-882231",
    type: "P2P Transfer",
    amount: "৳ 12,450.00",
    reason: "New device + high amount",
    severity: "medium",
  },
  {
    id: "TXN-88204C",
    name: "Merchant · DhakaMart",
    phone: "+880 1611-009887",
    type: "Merchant Payment",
    amount: "৳ 231,900.00",
    reason: "Beneficiary on watchlist",
    severity: "high",
  },
  {
    id: "TXN-88198B",
    name: "Kamal Hossain",
    phone: "+880 1855-771122",
    type: "Cash-In",
    amount: "৳ 4,200.00",
    reason: "Structuring pattern",
    severity: "medium",
  },
  {
    id: "TXN-88190D",
    name: "Shirin Akter",
    phone: "+880 1722-660145",
    type: "Bill Payment",
    amount: "৳ 1,980.00",
    reason: "Geo-velocity mismatch",
    severity: "low",
  },
  {
    id: "TXN-88184E",
    name: "Tanvir Ahmed",
    phone: "+880 1518-993042",
    type: "Cash-Out",
    amount: "৳ 63,700.00",
    reason: "Multiple failed PINs, then success",
    severity: "high",
  },
];

const SEVERITY_STYLE = {
  high: "text-[#F0575C] bg-[#F0575C]/10 ring-1 ring-inset ring-[#F0575C]/25",
  medium: "text-[#D4A72C] bg-[#D4A72C]/10 ring-1 ring-inset ring-[#D4A72C]/25",
  low: "text-[#8B8D92] bg-white/5 ring-1 ring-inset ring-white/10",
};

export default function AdminDashboard() {
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    if (!query.trim()) return FLAGGED;
    const q = query.toLowerCase();
    return FLAGGED.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.phone.replace(/\s|-/g, "").includes(q.replace(/\s|-/g, "")) ||
        r.name.toLowerCase().includes(q)
    );
  }, [query]);

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
              <span className="text-[13px] font-semibold tracking-tight">QuickiePay</span>
              <span className="ml-auto text-[10px] font-medium text-[#8B8D92] border border-black/10 dark:border-white/10 rounded px-1.5 py-0.5">
                ADMIN
              </span>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] transition-colors ${
                      item.active
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

            <div className="px-3 py-3 border-t border-black/[0.06] dark:border-white/[0.06]">
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
            {/* Top bar */}
            <header className="h-14 shrink-0 flex items-center gap-4 px-5 border-b border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0E0F12]">
              <div className="relative flex-1 max-w-xl">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8D92]"
                />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Look up by phone number or transaction ID…"
                  className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-[#F2F2F3] dark:bg-white/[0.05] border border-transparent focus:border-[#0FAE71]/40 focus:bg-white dark:focus:bg-[#16171A] outline-none placeholder:text-[#8B8D92] transition-colors"
                />
              </div>

              <div className="ml-auto flex items-center gap-3">
                <button className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                  <Bell size={15} className="text-[#5B5D63] dark:text-[#9A9CA2]" />
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-[#F0575C]" />
                </button>
                <div className="h-5 w-px bg-black/[0.08] dark:bg-white/[0.08]" />
                <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-md hover:bg-black/[0.04] dark:hover:bg-white/[0.05]">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-[#0FAE71] to-[#0A7A50] flex items-center justify-center text-[10px] font-semibold text-white">
                    SA
                  </div>
                  <span className="text-[12px] font-medium hidden sm:inline">Super Admin</span>
                  <ChevronDown size={13} className="text-[#8B8D92]" />
                </button>
              </div>
            </header>

            {/* Scrollable content */}
            <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* KPI grid */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {KPIS.map((k) => {
                  const Icon = k.icon;
                  return (
                    <div
                      key={k.label}
                      className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] px-4 py-3.5"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[11.5px] text-[#8B8D92] font-medium">
                          {k.label}
                        </span>
                        <Icon
                          size={14}
                          className={
                            k.warn ? "text-[#D4A72C]" : "text-[#8B8D92]"
                          }
                        />
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[20px] font-semibold tabular-nums tracking-tight">
                          {k.value}
                        </span>
                        <span
                          className={`flex items-center gap-0.5 text-[11px] font-medium tabular-nums ${
                            k.up ? "text-[#0FAE71]" : "text-[#F0575C]"
                          }`}
                        >
                          {k.up ? (
                            <ArrowUpRight size={12} />
                          ) : (
                            <ArrowDownRight size={12} />
                          )}
                          {k.delta}
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
                    <h2 className="text-[13.5px] font-semibold">
                      Recent Flagged Activity
                    </h2>
                    <span className="text-[11px] font-medium text-[#8B8D92] bg-black/[0.04] dark:bg-white/[0.06] rounded px-1.5 py-0.5 tabular-nums">
                      {rows.length}
                    </span>
                  </div>
                  <button className="flex items-center gap-1 text-[12px] text-[#5B5D63] dark:text-[#9A9CA2] hover:text-[#16171A] dark:hover:text-white">
                    View full ledger
                    <ArrowRight size={12} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-[12.5px]">
                    <thead>
                      <tr className="border-b border-black/[0.06] dark:border-white/[0.07] text-left">
                        {[
                          "Transaction ID",
                          "Entity",
                          "Type",
                          "Amount",
                          "Risk Reason",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2 font-medium text-[11px] text-[#8B8D92] whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
                        >
                          <td className="px-4 py-2.5 font-mono text-[12px] tabular-nums whitespace-nowrap">
                            {r.id}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <div className="font-medium">{r.name}</div>
                            <div className="text-[11px] text-[#8B8D92] font-mono tabular-nums">
                              {r.phone}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[#5B5D63] dark:text-[#9A9CA2] whitespace-nowrap">
                            {r.type}
                          </td>
                          <td className="px-4 py-2.5 font-mono tabular-nums whitespace-nowrap">
                            {r.amount}
                          </td>
                          <td className="px-4 py-2.5 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ${SEVERITY_STYLE[r.severity]}`}
                            >
                              {r.reason}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#0FAE71] hover:text-[#0C8F5D] border border-[#0FAE71]/25 hover:border-[#0FAE71]/45 rounded-md px-2.5 py-1">
                              Investigate
                            </button>
                          </td>
                        </tr>
                      ))}
                      {rows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-[#8B8D92]"
                          >
                            No flagged activity matches "{query}"
                          </td>
                        </tr>
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