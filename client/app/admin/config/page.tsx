'use client';

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutGrid, Users, BookOpen, ShieldAlert, Settings, ArrowLeft, Save, AlertCircle } from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview", icon: LayoutGrid, href: "/admin" },
  { label: "User Management", icon: Users, href: "/admin/users" },
  { label: "Global Ledger", icon: BookOpen, href: "/admin/ledger" },
  { label: "Fraud Alerts", icon: ShieldAlert, badge: 6, href: "/admin/alerts" },
  { label: "System Config", icon: Settings, href: "/admin/config" },
];

interface Setting {
  setting_key: string;
  setting_value: string;
  description: string;
}

export default function SystemConfigPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [dark] = useState(true);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) return router.push("/login");

    fetch("http://localhost:5001/api/admin/config", {
      headers: { "Authorization": `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        setLoading(false);
      });
  }, [router]);

  const handleUpdate = async (key: string, newValue: string) => {
    if (!newValue || isNaN(Number(newValue))) return alert("Value must be a valid number.");
    
    setSavingKey(key);
    const token = sessionStorage.getItem("token");
    
    const res = await fetch(`http://localhost:5001/api/admin/config/${key}`, {
      method: 'PATCH',
      headers: { 
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ setting_value: parseFloat(newValue) })
    });

    if (res.ok) {
      setSettings(settings.map(s => s.setting_key === key ? { ...s, setting_value: newValue } : s));
    } else {
      alert("Failed to update configuration.");
    }
    setSavingKey(null);
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
            <h1 className="text-[14px] font-semibold">System Configuration</h1>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-3xl space-y-6">
              
              <div className="flex items-start gap-3 p-4 rounded-lg bg-[#D4A72C]/10 border border-[#D4A72C]/20 text-[#D4A72C]">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div className="text-[12.5px] leading-relaxed">
                  <strong>Warning:</strong> Changes made here immediately affect global transaction routing, fee calculations, and limits across the entire QuickiePay platform. Ensure values are audited before saving.
                </div>
              </div>

              <div className="grid gap-4">
                {loading ? (
                  <div className="text-center text-[#8B8D92] py-8 text-[13px]">Loading configurations...</div>
                ) : (
                  settings.map((setting) => (
                    <div key={setting.setting_key} className="flex items-center justify-between p-5 rounded-lg border border-black/[0.06] dark:border-white/[0.07] bg-white dark:bg-[#0E0F12]">
                      <div className="space-y-1">
                        <div className="font-mono text-[13px] font-semibold tracking-tight text-[#16171A] dark:text-[#E8E9EA]">
                          {setting.setting_key}
                        </div>
                        <div className="text-[12px] text-[#8B8D92]">
                          {setting.description}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <input 
                          type="number"
                          step="0.01"
                          defaultValue={setting.setting_value}
                          id={`input-${setting.setting_key}`}
                          className="w-28 h-9 px-3 rounded-md text-[13px] font-mono bg-[#F2F2F3] dark:bg-[#16171A] border border-black/[0.06] dark:border-white/[0.07] focus:border-[#0FAE71]/40 outline-none text-right"
                        />
                        <button 
                          onClick={() => {
                            const input = document.getElementById(`input-${setting.setting_key}`) as HTMLInputElement;
                            handleUpdate(setting.setting_key, input.value);
                          }}
                          disabled={savingKey === setting.setting_key}
                          className="flex items-center gap-1.5 h-9 px-4 rounded-md text-[12px] font-medium text-white bg-[#0FAE71] hover:bg-[#0A7A50] transition-colors disabled:opacity-50"
                        >
                          <Save size={14} />
                          {savingKey === setting.setting_key ? "..." : "Save"}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          </main>
        </div>
      </div>
    </div>
  );
}