'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, Users, BookOpen, ShieldAlert, Settings, ArrowLeft, CheckCircle, XCircle, ClipboardCheck } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, href: "/admin" },
  { label: "User Management", icon: Users, href: "/admin/users" },
  { label: "Approvals", icon: ClipboardCheck, href: "/admin/approvals", badge: "New" },
  { label: "Global Ledger", icon: BookOpen, href: "/admin/ledger" },
  { label: "Fraud Alerts", icon: ShieldAlert, href: "/admin/alerts" },
  { label: "System Config", icon: Settings, href: "/admin/config" },
];

export default function ApprovalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [dark] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch("http://localhost:5001/api/admin/approvals", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setQueue(data);
        setLoading(false);
      });
  }, [router]);

  const handleProcess = async (type: string, id: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !window.confirm("Are you sure you want to reject this application?")) return;

    const token = sessionStorage.getItem("token");
    
    // Optimistic UI Removal
    setQueue(queue.filter(item => item.entity_id !== id));

    const res = await fetch(`http://localhost:5001/api/admin/approvals/${type}/${id}`, {
      method: 'PATCH',
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });

    if (!res.ok) {
      alert(`Failed to ${action} entity.`);
      window.location.reload();
    }
  };

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
                  {item.badge && (
                    <span className="text-[10px] font-semibold px-1.5 py-[1px] rounded-full bg-[#0FAE71]/15 text-[#0FAE71]">
                      {item.badge}
                    </span>
                  )}
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
            <h1 className="text-[14px] font-semibold">Verification Queue</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12] overflow-hidden">
              <div className="flex items-center justify-between px-4 h-12 border-b border-black/[0.06] dark:border-white/[0.07]">
                <h2 className="text-[13.5px] font-semibold">Pending Business Approvals</h2>
                <span className="text-[11px] font-medium text-[#D4A72C] bg-[#D4A72C]/10 rounded px-1.5 py-0.5 tabular-nums">
                  {queue.length} Awaiting Review
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] text-left">
                  <thead>
                    <tr className="border-b border-black/[0.06] dark:border-white/[0.07] text-[#8B8D92]">
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Applicant</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Role Type</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Business Details</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap">Applied Date</th>
                      <th className="px-4 py-3 font-medium whitespace-nowrap text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={5} className="p-8 text-center text-[#8B8D92]">Loading queue...</td></tr>
                    ) : queue.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-[#8B8D92]">All caught up! No pending approvals.</td></tr>
                    ) : queue.map((item) => (
                      <tr key={item.entity_id} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.02]">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-medium">{item.full_name}</div>
                          <div className="text-[11px] text-[#8B8D92] font-mono tabular-nums">{item.phone_number}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-blue-500/10 text-blue-500">
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[#5B5D63] dark:text-[#9A9CA2]">
                          {item.details}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-[#8B8D92]">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleProcess(item.type, item.entity_id, 'reject')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-[#F0575C] hover:bg-[#F0575C]/10 border border-[#F0575C]/20 transition-colors"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                            <button 
                              onClick={() => handleProcess(item.type, item.entity_id, 'approve')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11.5px] font-medium text-[#0FAE71] hover:bg-[#0FAE71]/10 border border-[#0FAE71]/20 transition-colors"
                            >
                              <CheckCircle size={14} />
                              Approve
                            </button>
                          </div>
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