// app/dashboard/biller/page.jsx
"use client";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// lucide-react এ ArrowUpRight ও HandCoins যোগ করুন
import {
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  Moon,
  Receipt,
  Settings,
  Sun,
  LogOut,
  Zap,
  ArrowUpRight,
  HandCoins
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Bills Issued", href: "/biller/bills", icon: Receipt },
  { label: "Services", href: "/biller/services", icon: Zap },
  { label: "Statistics", icon: BarChart3 },
];

export default function BillerDashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const router = useRouter();

  const [billerData, setBillerData] = useState({
    full_name: "Loading...",
    balance: "0.00",
    services: []
  });

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };

  useEffect(() => {
    setMounted(true);
    const savedUserId = sessionStorage.getItem("userId");
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!savedUserId || !token || role !== "BILLER") {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:5001/api/billers/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    })
      .then((res) => res.json())
      .then((data) => setBillerData(data))
      .catch((err) => console.error("Error fetching biller data:", err));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <aside className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white py-6 transition-all duration-300 lg:flex dark:border-gray-800 dark:bg-gray-950 ${collapsed ? "w-[84px] px-3" : "w-64 px-5"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-600 text-white">
              <Receipt className="size-5" />
            </div>
            {!collapsed && <span className="whitespace-nowrap text-lg font-semibold tracking-tight">quickie<span className="text-purple-600">biller</span></span>}
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              onClick={() => { setActiveNav(label); if (href) router.push(href); }}
              className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors ${collapsed ? "justify-center px-0" : "px-3"} ${activeNav === label ? "bg-purple-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"}`}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && label}
            </button>
          ))}
        </nav>
        <button onClick={handleLogout} className="mt-auto flex items-center gap-3 rounded-xl py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-500 px-3">
          <LogOut className="size-[18px] shrink-0" />
          {!collapsed && "Log out"}
        </button>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white/70 px-5 py-6 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Biller Control Panel</h1>
            <p className="text-xl font-semibold tracking-tight text-purple-600 dark:text-purple-500 mt-2">
              {balanceVisible ? `৳ ${billerData.balance}` : "••••••"}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10">
  
  
  <section className="mb-10">
    <h2 className="text-lg font-semibold tracking-tight">Quick Actions</h2>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Perform quick financial transactions</p>
    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      
      <button onClick={() => router.push("/send-money")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-blue-500 text-white">
          <ArrowUpRight className="size-7" />
        </div>
        <p className="text-base font-semibold">Send Money</p>
        <p className="mt-1 text-xs text-gray-500">Transfer funds</p>
      </button>

      <button onClick={() => router.push("/cash-out")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-purple-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-green-500 text-white">
          <HandCoins className="size-7" />
        </div>
        <p className="text-base font-semibold">Cash Out</p>
        <p className="mt-1 text-xs text-gray-500">Withdraw cash</p>
      </button>

    </div>
  </section>

  <section>
    <h2 className="text-lg font-semibold tracking-tight">Registered Utility Services</h2>
    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
      {billerData.services?.map((svc, idx) => (
        <div key={idx} className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <p className="text-base font-semibold">{svc.organization_name}</p>
          <p className="mt-1 text-xs text-purple-600 uppercase font-medium">{svc.service_name}</p>
        </div>
      ))}
    </div>
  </section>

</div>
      </main>
    </div>
  );
}