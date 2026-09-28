'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  User,
  Shield,
  Sliders,
  Moon,
  Sun,
  Lock,
  CheckCircle2,
  AlertCircle,
  Building2,
  CreditCard,
  Bell,
  Smartphone,
  Check,
  Zap,
  Briefcase
} from "lucide-react";

interface UserProfile {
  user_id: string;
  full_name: string;
  phone_number: string;
  email: string | null;
  national_id: string | null;
  account_id: string;
  account_type: string;
  balance: string;
  agent?: {
    agent_id: string;
    business_name: string;
    commission_rate: number;
    status: string;
  };
  merchant?: {
    merchant_id: string;
    business_name: string;
    trade_license: string;
    status: string;
  };
  biller?: {
    biller_id: string;
    status: string;
    services: Array<{ service_id: string; service_name: string; organization_name: string }>;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<"profile" | "security" | "limits" | "preferences">("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tradeLicense, setTradeLicense] = useState("");
  const [profileMessage, setProfileMessage] = useState({ text: "", type: "" });
  const [profileSaving, setProfileSaving] = useState(false);

  // PIN Form State
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinMessage, setPinMessage] = useState({ text: "", type: "" });
  const [pinSaving, setPinSaving] = useState(false);

  // Preferences State
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [emailReceipts, setEmailReceipts] = useState(true);
  const [twoFactor, setTwoFactor] = useState(true);

  const getDashboardHref = () => {
    const savedRole = typeof window !== "undefined" ? sessionStorage.getItem("role") : null;
    const role = (savedRole || profile?.account_type || "USER").toUpperCase();
    if (role === "AGENT") return "/agent";
    if (role === "BUSINESS" || role === "MERCHANT") return "/merchant";
    if (role === "BILLER") return "/biller";
    return "/";
  };

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/users/profile/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          return Promise.reject("Unauthorized");
        }
        return res.json();
      })
      .then((data: UserProfile) => {
        setProfile(data);
        setFullName(data.full_name || "");
        setEmail(data.email || "");
        if (data.agent) {
          setBusinessName(data.agent.business_name || "");
        } else if (data.merchant) {
          setBusinessName(data.merchant.business_name || "");
          setTradeLicense(data.merchant.trade_license || "");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading profile:", err);
        setLoading(false);
      });
  }, [router]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage({ text: "", type: "" });

    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch("http://localhost:5001/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          business_name: businessName,
          trade_license: tradeLicense,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProfileMessage({ text: "Profile updated successfully!", type: "success" });
      } else {
        setProfileMessage({ text: data.error || "Failed to update profile", type: "error" });
      }
    } catch {
      setProfileMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePinChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage({ text: "", type: "" });

    if (newPin.length < 4 || newPin.length > 6) {
      setPinMessage({ text: "PIN must be between 4 and 6 digits", type: "error" });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMessage({ text: "New PIN and Confirm PIN do not match", type: "error" });
      return;
    }

    setPinSaving(true);
    const token = sessionStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5001/api/users/change-pin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_pin: oldPin,
          new_pin: newPin,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPinMessage({ text: "Security PIN changed successfully!", type: "success" });
        setOldPin("");
        setNewPin("");
        setConfirmPin("");
      } else {
        setPinMessage({ text: data.error || "Failed to change PIN", type: "error" });
      }
    } catch {
      setPinMessage({ text: "Network error occurred", type: "error" });
    } finally {
      setPinSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push(getDashboardHref())}
              aria-label="Back to dashboard"
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Account Settings</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Manage your profile, security credentials, and preferences
              </p>
            </div>
          </div>

          {profile && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {profile.account_type}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-[240px_1fr]">
            {/* Navigation Tabs */}
            <aside className="space-y-1">
              <button
                onClick={() => setActiveTab("profile")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "profile"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                }`}
              >
                <User className="size-4" />
                Profile Info
              </button>

              <button
                onClick={() => setActiveTab("security")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "security"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                }`}
              >
                <Shield className="size-4" />
                Security & PIN
              </button>

              <button
                onClick={() => setActiveTab("limits")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "limits"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                }`}
              >
                <Sliders className="size-4" />
                Limits & Usage
              </button>

              <button
                onClick={() => setActiveTab("preferences")}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === "preferences"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900"
                }`}
              >
                <Bell className="size-4" />
                Preferences
              </button>
            </aside>

            {/* Tab Contents */}
            <main>
              {/* TAB 1: PROFILE */}
              {activeTab === "profile" && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                  <h2 className="text-lg font-bold">Personal & Account Information</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Review and update your basic details across the QuickiePay network.
                  </p>

                  <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                        />
                      </div>
                    </div>

                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          Phone Number (Permanent)
                        </label>
                        <input
                          type="text"
                          value={profile?.phone_number || ""}
                          disabled
                          className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                          National ID (NID)
                        </label>
                        <input
                          type="text"
                          value={profile?.national_id || "Verified on registration"}
                          disabled
                          className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400"
                        />
                      </div>
                    </div>

                    {/* Role-Specific fields */}
                    {(profile?.account_type === "AGENT" || profile?.account_type === "BUSINESS") && (
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Building2 className="size-4 text-blue-600" /> Business Details
                        </h3>

                        <div className="grid gap-5 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              Business / Shop Name
                            </label>
                            <input
                              type="text"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                            />
                          </div>

                          {profile?.account_type === "BUSINESS" && (
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Trade License
                              </label>
                              <input
                                type="text"
                                value={tradeLicense}
                                onChange={(e) => setTradeLicense(e.target.value)}
                                className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                              />
                            </div>
                          )}

                          {profile?.agent && (
                            <div>
                              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                Commission Rate
                              </label>
                              <p className="mt-2.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                {profile.agent.commission_rate}% per Cash Out
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {profileMessage.text && (
                      <div
                        className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                          profileMessage.type === "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {profileMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{profileMessage.text}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={profileSaving}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: SECURITY */}
              {activeTab === "security" && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                  <h2 className="text-lg font-bold">Security & PIN Management</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Your 4-6 digit numeric PIN is used to authorize all financial transactions.
                  </p>

                  <form onSubmit={handlePinChange} className="mt-6 max-w-md space-y-4">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Current PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={oldPin}
                        onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••"
                        required
                        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        New PIN (4-6 digits)
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••"
                        required
                        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        Confirm New PIN
                      </label>
                      <input
                        type="password"
                        maxLength={6}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                        placeholder="••••"
                        required
                        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 dark:border-gray-700 dark:bg-gray-800"
                      />
                    </div>

                    {pinMessage.text && (
                      <div
                        className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                          pinMessage.type === "success"
                            ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            : "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                        }`}
                      >
                        {pinMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <span>{pinMessage.text}</span>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={pinSaving}
                        className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                      >
                        {pinSaving ? "Updating PIN..." : "Update PIN"}
                      </button>
                    </div>
                  </form>

                  <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
                    <h3 className="text-sm font-semibold">Account Protection</h3>
                    <div className="mt-3 flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                      <div>
                        <p className="text-sm font-medium">Two-Factor Authentication</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Verify identity with OTP upon logging into unfamiliar browsers.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTwoFactor(!twoFactor)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          twoFactor ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                        }`}
                      >
                        <span
                          className={`inline-block size-4 rounded-full bg-white transition-transform ${
                            twoFactor ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: LIMITS */}
              {activeTab === "limits" && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                  <h2 className="text-lg font-bold">Transaction Limits & Tier</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Standard regulatory transaction limits enforced on your {profile?.account_type} wallet.
                  </p>

                  <div className="mt-6 space-y-6">
                    {/* Daily Limit */}
                    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Daily Send / Cash Out Limit</span>
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                          ৳50,000.00 / day
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full w-[15%]" />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Used today: ৳7,500.00 · Remaining: ৳42,500.00
                      </p>
                    </div>

                    {/* Monthly Limit */}
                    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">Monthly Total Transaction Limit</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ৳300,000.00 / month
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full w-[25%]" />
                      </div>
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Used this month: ৳75,000.00 · Remaining: ৳225,000.00
                      </p>
                    </div>

                    {/* Single Transaction Limit */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max Per Transaction</p>
                        <p className="text-xl font-bold mt-1">৳25,000.00</p>
                      </div>
                      <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max Wallet Balance</p>
                        <p className="text-xl font-bold mt-1">৳500,000.00</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: PREFERENCES */}
              {activeTab === "preferences" && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900 sm:p-8">
                  <h2 className="text-lg font-bold">Preferences & Display</h2>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Customize your app appearance and notification channels.
                  </p>

                  <div className="mt-6 space-y-6">
                    {/* Appearance */}
                    <div>
                      <h3 className="text-sm font-semibold">Theme Mode</h3>
                      <div className="mt-3 flex gap-3">
                        <button
                          onClick={() => setTheme("light")}
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition ${
                            theme === "light"
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30"
                              : "border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <Sun className="size-4" /> Light
                        </button>
                        <button
                          onClick={() => setTheme("dark")}
                          className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition ${
                            theme === "dark"
                              ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30"
                              : "border-gray-200 dark:border-gray-800"
                          }`}
                        >
                          <Moon className="size-4" /> Dark
                        </button>
                      </div>
                    </div>

                    {/* Notifications */}
                    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                      <h3 className="text-sm font-semibold">Notifications</h3>

                      <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                        <div>
                          <p className="text-sm font-medium">SMS Transaction Alerts</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Receive instant SMS whenever money is sent or received.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSmsAlerts(!smsAlerts)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            smsAlerts ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-block size-4 rounded-full bg-white transition-transform ${
                              smsAlerts ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50">
                        <div>
                          <p className="text-sm font-medium">Email Payment Receipts</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Send itemized PDF receipts to your registered email.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEmailReceipts(!emailReceipts)}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            emailReceipts ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                          }`}
                        >
                          <span
                            className={`inline-block size-4 rounded-full bg-white transition-transform ${
                              emailReceipts ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </div>
  );
}
