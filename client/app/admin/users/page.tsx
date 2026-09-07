'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, Users, BookOpen, ShieldAlert, Settings, Search, Sun, Moon, ArrowLeft, Lock, Unlock } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, href: "/admin" },
  { label: "User Management", icon: Users, href: "/admin/users" },
  { label: "Global Ledger", icon: BookOpen, href: "/admin/ledger" },
  { label: "Fraud Alerts", icon: ShieldAlert, badge: 6, href: "/admin/alerts" },
  { label: "System Config", icon: Settings, href: "/admin/config" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [dark, setDark] = useState(true);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch("http://localhost:5001/api/admin/users", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, [router]);

  const toggleStatus = async (userId: string, currentStatus: string) => {
    // Optimistic UI update using the exact ENUM strings
    const newStatus = currentStatus === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    setUsers(users.map(u => u.user_id === userId ? { ...u, status: newStatus } : u));

    const token = sessionStorage.getItem("token");
    await fetch(`http://localhost:5001/api/admin/users/${userId}/toggle-status`, {
      method: 'PATCH',
      headers: { "Authorization": `Bearer ${token}` }
    });
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(query.toLowerCase()) || 
    u.phone_number.includes(query)
  );

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
                placeholder="Search users by name or phone..."
                className="w-full h-8 pl-8 pr-3 rounded-md text-[13px] bg-[#F2F2F3] dark:bg-white/[0.05] outline-none"
              />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] overflow-hidden">
              <div className="flex items-center px-4 h-12 border-b border-black/[0.06] dark:border-white/[0.07]">
                <h2 className="text-[13.5px] font-semibold">User Directory</h2>
              </div>
              
              <table className="w-full text-[12.5px] text-left">
                <thead>
                  <tr className="border-b border-black/[0.06] dark:border-white/[0.07] text-[#8B8D92]">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr>
                  ) : filteredUsers.map((u) => (
                    <tr key={u.user_id} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-[11px] text-[#8B8D92]">{u.phone_number}</div>
                      </td>
                      <td className="px-4 py-3">{u.account_type}</td>
                      <td className="px-4 py-3 tabular-nums font-mono">৳{parseFloat(u.balance).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-[11px] font-medium ${
                          u.status === 'ACTIVE' ? "text-[#0FAE71] bg-[#0FAE71]/10" : "text-[#F0575C] bg-[#F0575C]/10"
                        }`}>
                          {u.status === 'ACTIVE' ? "Active" : "Blocked"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => toggleStatus(u.user_id, u.status)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11.5px] font-medium transition-colors ${
                            u.status === 'ACTIVE'
                              ? "text-[#F0575C] hover:bg-[#F0575C]/10 border border-[#F0575C]/20" 
                              : "text-[#0FAE71] hover:bg-[#0FAE71]/10 border border-[#0FAE71]/20"
                          }`}
                        >
                          {u.status === 'ACTIVE' ? <Lock size={12}/> : <Unlock size={12}/>}
                          {u.status === 'ACTIVE' ? "Block" : "Unblock"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}