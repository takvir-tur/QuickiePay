"use client";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  HandCoins, 
  LayoutDashboard, 
  Moon, 
  Sun, 
  Wallet, 
  Zap, 
  LogOut,
  ShieldCheck,
  Settings,
  FileText
} from "lucide-react";

const agentNavItems = [
  { label: "Dashboard", href: "/agent", icon: LayoutDashboard },
  { label: "Cash In", href: "/agent/cash-in", icon: ArrowDownRight },
  { label: "Cash Out", href: "/agent/cash-out", icon: ArrowUpRight },
  { label: "Transactions", href: "/transactions", icon: HandCoins },
];

const manageItems = [
  { label: "Settings", icon: Settings },
  { label: "Help center", icon: FileText },
];

const agentPrimaryActions = [
  { 
    label: "Cash In", 
    href: "/agent/cash_in", 
    detail: "Deposit money to user account", 
    icon: ArrowDownRight, 
    tone: "bg-emerald-500" 
  },
  { 
    label: "Cash Out", 
    href: "/agent/cash_out", 
    detail: "Process user withdrawal", 
    icon: ArrowUpRight, 
    tone: "bg-blue-500" 
  },
];

export default function AgentDashboard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const router = useRouter();

  const [userData, setUserData] = useState<{
    full_name: string;
    balance: string;
  }>({ full_name: "Loading...", balance: "0.00" });

  // Logout handler
  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/login");
  };

  useEffect(() => {
    setMounted(true);
    const savedUserId = sessionStorage.getItem("userId");
    const token = sessionStorage.getItem("token");

    if (!savedUserId || !token) {
      router.push("/login");
      return; 
    }

    fetch(`http://localhost:5001/api/users/${savedUserId}`,{
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
      .then((data) => setUserData(data))
      .catch((error) => console.error("Error fetching data:", error));
  }, [router]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Sidebar */}
      <aside
        className={`hidden shrink-0 flex-col border-r border-gray-200 bg-white py-6 transition-all duration-300 lg:flex dark:border-gray-800 dark:bg-gray-950 ${
          collapsed ? "w-[84px] px-3" : "w-64 px-5"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
              <Zap className="size-5 fill-current" />
            </div>
            {!collapsed && (
              <span className="whitespace-nowrap text-lg font-semibold tracking-tight">
                quickie<span className="text-emerald-600">agent</span>
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

        {/* User profile snippet */}
        <button
          className={`mt-7 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 transition-colors hover:border-emerald-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-emerald-900 ${
            collapsed ? "justify-center p-2" : "p-3"
          }`}
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
            {userData.full_name !== "Loading..." 
              ? userData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
              : "AG"}
          </div>
          {!collapsed && (
            <span className="min-w-0 text-left">
              <span className="block truncate text-sm font-semibold">{userData.full_name}</span>
              <span className="block truncate text-xs text-emerald-600 dark:text-emerald-400 font-medium">Agent Portal</span>
            </span>
          )}
        </button>

        {!collapsed && (
          <p className="mb-3 mt-9 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Overview
          </p>
        )}
        <nav className={`flex flex-col gap-1 ${collapsed ? "mt-8" : ""}`}>
          {agentNavItems.map(({ label, href, icon: Icon }) => (
            <button
              key={label}
              onClick={() => {
                setActiveNav(label);
                if (href && href !== "#") {
                  router.push(href);
                }
              }}
              title={label}
              className={`flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors ${
                collapsed ? "justify-center px-0" : "px-3"
              } ${
                activeNav === label
                  ? "bg-emerald-600 text-white shadow-sm"
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
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon className="size-[18px] shrink-0" />
              {!collapsed && label}
            </button>
          ))}
          <button
            onClick={handleLogout}
            title="Log out"
            className={`mt-2 flex items-center gap-3 rounded-xl py-3 text-sm font-medium transition-colors text-red-600 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-950/30 ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="size-[18px] shrink-0" />
            {!collapsed && "Log out"}
          </button>
        </nav>

        {!collapsed && (
          <div className="mt-auto rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <div className="mb-3 grid size-8 place-items-center rounded-lg bg-white text-emerald-600 shadow-sm dark:bg-gray-950 dark:text-emerald-500">
              <ShieldCheck className="size-4" />
            </div>
            <p className="text-sm font-semibold">Agent Security</p>
            <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
              Transactions are verified and logged securely.
            </p>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="min-w-0 flex-1">
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 bg-white/70 px-5 py-6 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Agent Portal, {userData.full_name.split(' ')[0]}
            </h1>
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xl font-semibold tracking-tight text-emerald-600 md:text-2xl dark:text-emerald-500">
                {balanceVisible ? `৳ ${userData.balance}` : "••••••"}
              </p>
              <button
                onClick={() => setBalanceVisible(!balanceVisible)}
                aria-label={balanceVisible ? "Hide balance" : "Show balance"}
                className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              >
                {balanceVisible ? "Hide" : "Show"}
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
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-xl p-2.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />
              ) : (
                <div className="size-5" /> 
              )}
            </button>
            <div className="grid size-9 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200">
              {userData.full_name !== "Loading..." 
                ? userData.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
                : "AG"}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1380px] px-5 py-8 md:px-10 md:py-10">
          <section>
            <h2 className="text-lg font-semibold tracking-tight">Agent Operations</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Select an action to perform for customers</p>
            
            {/* Exactly 2 options: Cash In & Cash Out */}
            <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 max-w-2xl">
              {agentPrimaryActions.map(({ label, href, detail, icon: Icon, tone }) => (
                <button
                  key={label}
                  onClick={() => router.push(href)}
                  className="group rounded-3xl border border-gray-200 bg-white p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-950 dark:hover:border-emerald-800"
                >
                  <div
                    className={`mb-5 grid size-14 place-items-center rounded-2xl ${tone} text-white transition-transform duration-200 group-hover:scale-110`}
                  >
                    <Icon className="size-7" />
                  </div>
                  <p className="text-lg font-semibold tracking-tight">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">{detail}</p>
                </button>
              ))}
            </div>
          </section>

          <footer className="mt-12 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Wallet className="size-4" /> QuickieAgent Portal · secured system
          </footer>
        </div>
      </main>
    </div>
  );
}