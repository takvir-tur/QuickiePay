"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Gift,
  HandCoins,
  LayoutDashboard,
  Moon,
  Percent,
  Plane,
  Receipt,
  RefreshCw,
  Settings,
  ShieldCheck,
  Smartphone,
  Sun,
  Ticket,
  Wallet,
  Zap,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Transactions", icon: ArrowUpRight },
  { label: "Notifications", icon: Bell },
  { label: "Statistics", icon: BarChart3 },
];

const manageItems = [
  { label: "Settings", icon: Settings },
  { label: "Help center", icon: FileText },
];

const primaryActions = [
  { label: "Send Money", detail: "To friends & family", icon: ArrowUpRight, tone: "bg-blue-500" },
  { label: "Mobile Recharge", detail: "Any operator, instantly", icon: Smartphone, tone: "bg-orange-500" },
  { label: "Cash Out", detail: "Agent or ATM", icon: HandCoins, tone: "bg-green-500" },
  { label: "Pay Bill", detail: "Utilities & more", icon: Receipt, tone: "bg-purple-500" },
  { label: "Make Payment", detail: "Shops & merchants", icon: CreditCard, tone: "bg-pink-500" },
];

const quickActions = [
  { label: "Sophia Anderson", detail: "Sent $250 · Today", icon: ArrowUpRight },
  { label: "Grameen Electric", detail: "Bill template", icon: Zap },
  { label: "Recharge 017••••", detail: "$5 top-up", icon: Smartphone },
  { label: "Repeat last payment", detail: "Netflix · $15.49", icon: RefreshCw },
];

const offers = [
  { title: "10% cashback", detail: "On every mobile recharge above $5.", tag: "QuickiePay", icon: Percent, tone: "bg-orange-500" },
  { title: "Flat $15 off", detail: "Flight bookings with SkyFly partners.", tag: "Travel", icon: Plane, tone: "bg-blue-500" },
  { title: "Buy 1 get 1", detail: "Cinema tickets every Wednesday.", tag: "Merchant", icon: Ticket, tone: "bg-purple-500" },
  { title: "Refer & earn $10", detail: "For every friend who joins QuickiePay.", tag: "Rewards", icon: Gift, tone: "bg-green-500" },
];

export default function App() {
  const [dark, setDark] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const router = useRouter();
  const [userData, setUserData] = useState({ full_name: "Loading...", balance: "0.00" });

  useEffect(() => {
    const savedUserId = localStorage.getItem("userId");
    if (!savedUserId) {
      router.push("/login");
      return; 
    }

    fetch(`http://localhost:5001/api/users/${savedUserId}`) 
      .then((response) => response.json())
      .then((data) => setUserData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, [router]);


  return (
    <div className={dark ? "dark" : ""}>
      <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
        <aside
          className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white py-6 transition-all duration-300 lg:flex dark:border-gray-800 dark:bg-gray-950 ${
            collapsed ? "w-[84px] px-3" : "w-64 px-5"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white">
                <Zap className="size-5 fill-current" />
              </div>
              {!collapsed && (
                <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
                  quickie<span className="text-blue-600">pay</span>
                </span>
              )}
            </div>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
            )}
          </div>

          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              className="mt-4 grid place-items-center rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ChevronRight className="size-4" />
            </button>
          )}

          <button
            className={`mt-7 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 transition-colors hover:border-blue-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-900 ${
              collapsed ? "justify-center p-2" : "p-3"
            }`}
          >
            <div className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
              {userData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            {!collapsed && (
              <span className="min-w-0 text-left">
                <span className="block truncate text-sm font-semibold">{userData.full_name}</span>
                <span className="block truncate text-xs text-gray-500 dark:text-gray-400">View profile</span>
              </span>
            )}
          </button>

          {!collapsed && (
            <p className="mb-3 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Overview
            </p>
          )}
          <nav className={`flex flex-col gap-1 ${collapsed ? "mt-8" : ""}`}>
            {navItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                title={label}
                className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  activeNav === label
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && label}
              </button>
            ))}
          </nav>

          {!collapsed && (
            <p className="mb-3 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Manage
            </p>
          )}
          <nav className={`flex flex-col gap-1 ${collapsed ? "mt-6" : ""}`}>
            {manageItems.map(({ label, icon: Icon }) => (
              <button
                key={label}
                onClick={() => setActiveNav(label)}
                title={label}
                className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-0" : "px-3"
                } ${
                  activeNav === label
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                <Icon className="size-[18px] shrink-0" />
                {!collapsed && label}
              </button>
            ))}
          </nav>

          {!collapsed && (
            <div className="mt-auto rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <div className="mb-3 grid size-8 place-items-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-gray-950 dark:text-blue-500">
                <ShieldCheck className="size-4" />
              </div>
              <p className="text-sm font-semibold">Your money is safe</p>
              <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                Protected by bank-level security.
              </p>
            </div>
          )}
        </aside>

        <main className="min-w-0 flex-1">
          <header className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white/70 px-5 py-6 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
            <div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
                Good morning, {userData.full_name.split(' ')[0]}
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <p className="text-xl font-semibold tracking-tight text-blue-600 md:text-2xl dark:text-blue-500">
                  {balanceVisible ? `৳ ${userData.balance}` : "••••••"}
                </p>
                <button
                  onClick={() => setBalanceVisible(!balanceVisible)}
                  aria-label={balanceVisible ? "Hide balance" : "Show balance"}
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  {balanceVisible ? <Eye className="size-[18px]" /> : <EyeOff className="size-[18px]" />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
              <button
                className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Notifications"
              >
                <Bell className="size-[19px]" />
              </button>
              <button
                onClick={() => setDark(!dark)}
                className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                aria-label="Toggle theme"
              >
                {dark ? <Sun className="size-[19px]" /> : <Moon className="size-[19px]" />}
              </button>
              <div className="grid size-9 place-items-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {userData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10 md:py-10">
            <section>
              <h2 className="text-lg font-semibold tracking-tight">What would you like to do?</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Your most used QuickiePay services</p>
              <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                {primaryActions.map(({ label, detail, icon: Icon, tone }) => (
                  <button
                    key={label}
                    className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-800"
                  >
                    <div
                      className={`mb-5 grid size-14 place-items-center rounded-2xl ${tone} text-white transition-transform duration-200 group-hover:scale-110`}
                    >
                      <Icon className="size-7" />
                    </div>
                    <p className="text-base font-semibold tracking-tight">{label}</p>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{detail}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Quick actions</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recents & saved templates</p>
                </div>
                <button className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-500">View all</button>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {quickActions.map(({ label, detail, icon: Icon }) => (
                  <button
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3.5 text-left transition-all hover:border-blue-200 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:border-blue-900 dark:hover:bg-gray-900"
                  >
                    <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-400">
                      <Icon className="size-[18px]" />
                    </div>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{detail}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold tracking-tight">Offers</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Promotions and partner discounts picked for you
                  </p>
                </div>
                <button className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-500">See all offers</button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {offers.map(({ title, detail, tag, icon: Icon, tone }) => (
                  <article
                    key={title}
                    className="group relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-950"
                  >
                    <div className={`absolute -right-10 -top-10 size-28 rounded-full ${tone} opacity-10 transition-transform duration-300 group-hover:scale-125`} />
                    <div className={`grid size-11 place-items-center rounded-2xl ${tone} text-white`}>
                      <Icon className="size-5" />
                    </div>
                    <span className="mt-5 inline-block rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                      {tag}
                    </span>
                    <h3 className="mt-3 text-base font-semibold tracking-tight">{title}</h3>
                    <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{detail}</p>
                    <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-500">
                      Claim offer <ArrowUpRight className="size-3.5" />
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <footer className="mt-12 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Wallet className="size-4" /> QuickiePay · secured wallet
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}