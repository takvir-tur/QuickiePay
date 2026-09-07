// app/dashboard/merchant/page.jsx
"use client";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
// lucide-react ইমপোর্টের সাথে ArrowUpRight এবং HandCoins যুক্ত করুন
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  HandCoins,
  LayoutDashboard,
  Moon,
  Receipt,
  Settings,
  ShieldCheck,
  Sun,
  Wallet,
  Zap,
  LogOut,
  Store,
  FileSpreadsheet
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/merchant/transactions", icon: ArrowDownRight },
  { label: "Invoices", href: "/merchant/invoices", icon: FileText },
  { label: "Statistics", icon: BarChart3 },
];

const manageItems = [
  { label: "Settings", icon: Settings },
  { label: "Help center", icon: FileText },
];

export default function MerchantDashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");
  const router = useRouter();

  const [merchantData, setMerchantData] = useState({
    full_name: "Loading...",
    business_name: "Loading...",
    balance: "0.00",
    trade_license: "",
    status: "ACTIVE",
    recentPayments: []
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

    // রোল চেক করে ভ্যালিড না হলে লগইন পেজে রিডাইরেক্ট করা
    if (!savedUserId || !token || (role !== "MERCHANT" && role !== "BUSINESS")) {
      router.push("/login");
      return;
    }

    // সঠিক /profile এন্ডপয়েন্টে কল করা হচ্ছে (যা রাউটে পরিবর্তন করা হয়েছে)
    fetch(`http://localhost:5001/api/merchants/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          return Promise.reject("Unauthorized");
        }
        return response.json();
      })
      .then((data) => {
        // এখানে আপনার মার্চেন্ট ডাটা সেট করার স্টেট ফাংশন হবে (যেমন: setMerchantData(data))
        setMerchantData(data); 
      })
      .catch((error) => console.error("Error fetching merchant data:", error));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <aside
        className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white py-6 transition-all duration-300 lg:flex dark:border-gray-800 dark:bg-gray-950 ${
          collapsed ? "w-[84px] px-3" : "w-64 px-5"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-pink-600 text-white">
              <Store className="size-5" />
            </div>
            {!collapsed && (
              <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
                quickie<span className="text-pink-600">merchant</span>
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="mt-4 grid place-items-center rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            <ChevronRight className="size-4" />
          </button>
        )}

        <div className={`mt-7 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900 ${collapsed ? "justify-center p-2" : ""}`}>
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-pink-100 text-sm font-semibold text-pink-700 dark:bg-pink-900 dark:text-pink-200">
            {(merchantData?.business_name || "ME").substring(0, 2).toUpperCase()}
          </div>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold">{merchantData.business_name}</span>
              <span className="block truncate text-xs text-gray-500 dark:text-gray-400">Merchant Portal</span>
            </span>
          )}
        </div>

        <nav className="mt-8 flex flex-col gap-1">
          {navItems.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                if (href) router.push(href);
              }}
              className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                activeNav === label
                  ? "bg-pink-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && label}
            </button>
          ))}
        </nav>

        <nav className="mt-6 flex flex-col gap-1">
          {manageItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => setActiveNav(label)}
              className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 ${
                collapsed ? "justify-center px-0" : "px-3"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className={`mt-2 flex items-center gap-3 rounded-xl py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/30 ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed && "Log out"}
          </button>
        </nav>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white/70 px-5 py-6 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Merchant Dashboard
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xl font-semibold tracking-tight text-pink-600 md:text-2xl dark:text-pink-500">
                {balanceVisible ? `৳ ${merchantData.balance}` : "••••••"}
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                {balanceVisible ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="rounded-xl p-2.5 text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-800">
              {mounted && (theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />)}
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10">
  <section>
    <h2 className="text-lg font-semibold tracking-tight">Business Tools</h2>
    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your store payments, transfers and cash outs</p>
    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      
      {/* Create Invoice */}
      <button onClick={() => router.push("/merchant/generate-invoice")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-pink-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-pink-500 text-white">
          <FileSpreadsheet className="size-7" />
        </div>
        <p className="text-base font-semibold">Create Invoice</p>
        <p className="mt-1 text-xs text-gray-500">Generate payment links</p>
      </button>

      {/* Store Sales */}
      <button onClick={() => router.push("/merchant/transactions")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-pink-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-purple-500 text-white">
          <CreditCard className="size-7" />
        </div>
        <p className="text-base font-semibold">Store Sales</p>
        <p className="mt-1 text-xs text-gray-500">View received payments</p>
      </button>

      {/* Send Money (NEW) */}
      <button onClick={() => router.push("/send-money")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-pink-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-blue-500 text-white">
          <ArrowUpRight className="size-7" />
        </div>
        <p className="text-base font-semibold">Send Money</p>
        <p className="mt-1 text-xs text-gray-500">Transfer funds instantly</p>
      </button>

      {/* Cash Out (NEW) */}
      <button onClick={() => router.push("/cash-out")} className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all hover:-translate-y-1 hover:border-pink-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-green-500 text-white">
          <HandCoins className="size-7" />
        </div>
        <p className="text-base font-semibold">Cash Out</p>
        <p className="mt-1 text-xs text-gray-500">Withdraw via agent or ATM</p>
      </button>

    </div>
  </section>
</div>
      </main>
    </div>
  );
}