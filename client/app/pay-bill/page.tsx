'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  Zap,
  Flame,
  Droplets,
  Wifi,
  GraduationCap,
  Shield,
  HelpCircle,
  Wallet,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Building2,
  CreditCard,
  Loader2,
  ChevronRight
} from "lucide-react";

interface UtilityService {
  service_id: string;
  biller_id: string;
  service_name: string;
  organization_name: string;
}

const CATEGORIES = [
  { id: "ELECTRICITY", label: "Electricity", icon: Zap, tone: "text-amber-500 bg-amber-50 dark:bg-amber-950/40" },
  { id: "WATER", label: "Water", icon: Droplets, tone: "text-blue-500 bg-blue-50 dark:bg-blue-950/40" },
  { id: "GAS", label: "Gas", icon: Flame, tone: "text-orange-500 bg-orange-50 dark:bg-orange-950/40" },
  { id: "INTERNET", label: "Internet", icon: Wifi, tone: "text-purple-500 bg-purple-50 dark:bg-purple-950/40" },
  { id: "EDUCATION", label: "Education", icon: GraduationCap, tone: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40" },
  { id: "INSURANCE", label: "Insurance", icon: Shield, tone: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40" },
  { id: "OTHER", label: "Other", icon: HelpCircle, tone: "text-gray-500 bg-gray-50 dark:bg-gray-800" },
];

const POPULAR_ORGANIZATIONS: Record<string, string[]> = {
  ELECTRICITY: ["DESCO (Prepaid & Postpaid)", "DPDC", "NESCO", "BREB / Palli Bidyut", "BPDB"],
  WATER: ["Dhaka WASA", "Chattogram WASA", "Rajshahi WASA", "Khulna WASA"],
  GAS: ["Titas Gas (Metered)", "Titas Gas (Non-Metered)", "Bakhrabad Gas", "Jalalabad Gas", "Karnaphuli Gas"],
  INTERNET: ["Link3 Technologies", "Carnival Internet", "Amber IT", "Dot Internet", "Circle Network"],
  EDUCATION: ["Dhaka University", "BUET", "BRAC University", "North South University", "Viqarunnisa Noon School"],
  INSURANCE: ["MetLife Bangladesh", "Delta Life", "Green Delta Insurance", "Pragati Life"],
  OTHER: ["Dhaka North City Corp (DNCC)", "Dhaka South City Corp (DSCC)", "Chittagong City Corp"]
};

const amountPresets = [500, 1000, 1500, 2500, 5000];

function PayBillContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>("ELECTRICITY");
  const [organizations, setOrganizations] = useState<UtilityService[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<string>("");
  const [selectedBillerId, setSelectedBillerId] = useState<string>("");
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  
  const [accountNumber, setAccountNumber] = useState("");
  const [billingMonth, setBillingMonth] = useState("September 2026");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const [availableBalance, setAvailableBalance] = useState("0.00");
  const [backHref, setBackHref] = useState("/");
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    const savedUserId = sessionStorage.getItem("userId");
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    const normalizedRole = role ? role.toUpperCase() : "";
    if (normalizedRole === "AGENT") setBackHref("/agent");
    else if (normalizedRole === "MERCHANT" || normalizedRole === "BUSINESS") setBackHref("/merchant");
    else if (normalizedRole === "BILLER") setBackHref("/biller");
    else setBackHref("/");

    if (!savedUserId || !token) {
      router.push("/login");
      return;
    }

    // Fetch user balance
    fetch(`http://localhost:5001/api/users/${savedUserId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.balance) setAvailableBalance(data.balance);
      })
      .catch((err) => console.error("Error fetching balance:", err));

    // Fetch registered biller organizations for current category
    fetchCategoryOrganizations(selectedCategory);
  }, [router]);

  const fetchCategoryOrganizations = (category: string) => {
    setLoadingServices(true);
    fetch(`http://localhost:5001/api/billers/services/organizations/${category}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setOrganizations(data);
          setSelectedOrg(data[0].organization_name);
          setSelectedBillerId(data[0].biller_id);
          setSelectedServiceId(data[0].service_id);
        } else {
          setOrganizations([]);
          const fallbackOrgs = POPULAR_ORGANIZATIONS[category] || [];
          setSelectedOrg(fallbackOrgs[0] || "Registered Utility Provider");
          setSelectedBillerId("");
          setSelectedServiceId("");
        }
      })
      .catch(() => {
        setOrganizations([]);
        const fallbackOrgs = POPULAR_ORGANIZATIONS[category] || [];
        setSelectedOrg(fallbackOrgs[0] || "Registered Utility Provider");
      })
      .finally(() => setLoadingServices(false));
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    fetchCategoryOrganizations(catId);
  };

  const numericAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(availableBalance) || 0;
  const isBalanceSufficient = numericAmount <= numBalance;

  const canContinue =
    selectedOrg.length > 0 &&
    accountNumber.trim().length >= 4 &&
    numericAmount > 0 &&
    isBalanceSufficient;

  const handleContinue = () => {
    if (!canContinue) return;

    const query = new URLSearchParams({
      type: "Pay Bill",
      receiver: selectedOrg,
      name: selectedOrg,
      amount: numericAmount.toFixed(2),
      charge: "0.00",
      total: numericAmount.toFixed(2),
      account_number: accountNumber.trim(),
      billing_month: billingMonth,
      biller_id: selectedBillerId,
      service_id: selectedServiceId,
      note: note.trim() || `Bill: ${selectedOrg} (${billingMonth})`
    });

    router.push(`/confirm-pin?${query.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href={backHref}
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Pay Bill</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Electricity, Water, Gas, Internet & Government Fees</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        
        {/* Category Carousel / Tabs */}
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Select Utility Service</h2>
          <div className="mt-3 grid grid-cols-4 gap-2.5 sm:grid-cols-7">
            {CATEGORIES.map(({ id, label, icon: Icon, tone }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleCategorySelect(id)}
                className={`flex flex-col items-center justify-center rounded-2xl border p-3 text-center transition-all ${
                  selectedCategory === id
                    ? "border-purple-600 bg-purple-50/70 shadow-sm dark:border-purple-500 dark:bg-purple-950/40"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900"
                }`}
              >
                <div className={`grid size-10 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-5" />
                </div>
                <span className="mt-2 truncate text-xs font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          
          {/* LEFT: Organization and Account Details */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <label className="text-sm font-semibold">Select Biller / Organization</label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Choose the service provider you wish to pay
              </p>

              <div className="mt-4 space-y-2">
                {loadingServices ? (
                  <div className="flex h-20 items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-purple-600" />
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {/* Database Registered Services */}
                    {organizations.map((org) => (
                      <button
                        key={org.service_id}
                        type="button"
                        onClick={() => {
                          setSelectedOrg(org.organization_name);
                          setSelectedBillerId(org.biller_id);
                          setSelectedServiceId(org.service_id);
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                          selectedOrg === org.organization_name
                            ? "border-purple-600 bg-purple-50/70 dark:border-purple-500 dark:bg-purple-950/40"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">{org.organization_name}</p>
                            <span className="text-[10px] text-emerald-600 font-medium">Registered Biller</span>
                          </div>
                        </div>
                        {selectedOrg === org.organization_name && (
                          <CheckCircle2 className="size-4 text-purple-600" />
                        )}
                      </button>
                    ))}

                    {/* Standard Popular Providers */}
                    {(POPULAR_ORGANIZATIONS[selectedCategory] || []).map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setSelectedOrg(name);
                          setSelectedBillerId("");
                          setSelectedServiceId("");
                        }}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                          selectedOrg === name
                            ? "border-purple-600 bg-purple-50/70 dark:border-purple-500 dark:bg-purple-950/40"
                            : "border-gray-200 hover:border-gray-300 dark:border-gray-800 dark:hover:bg-gray-900"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            <Receipt className="size-4" />
                          </div>
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">{name}</p>
                        </div>
                        {selectedOrg === name && (
                          <CheckCircle2 className="size-4 text-purple-600" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bill Account / Customer Number */}
              <div className="mt-5 border-t border-gray-100 pt-5 dark:border-gray-800">
                <label className="text-xs font-semibold text-gray-500">Bill Account / Customer / Meter No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1029384756"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium tracking-wide outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              {/* Billing Month */}
              <div className="mt-4">
                <label className="text-xs font-semibold text-gray-500">Billing Month</label>
                <select
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <option value="September 2026">September 2026 (Current)</option>
                  <option value="August 2026">August 2026</option>
                  <option value="July 2026">July 2026</option>
                  <option value="October 2026">October 2026 (Advance)</option>
                </select>
              </div>
            </div>
          </div>

          {/* RIGHT: Amount & Bill Breakdown */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Bill Amount</label>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Wallet className="size-3.5" />
                  <span>Balance: ৳{availableBalance}</span>
                </div>
              </div>

              {/* Amount Input */}
              <div className="mt-4 relative flex items-center">
                <span className="absolute left-4 text-2xl font-bold text-gray-400">৳</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-10 pr-4 text-2xl font-bold outline-none transition focus:border-purple-500 focus:bg-white focus:ring-4 focus:ring-purple-500/10 dark:border-gray-800 dark:bg-gray-900 dark:focus:border-purple-500"
                />
              </div>

              {/* Amount Preset Chips */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset.toString())}
                    className={`rounded-xl border py-2 text-xs font-semibold transition ${
                      numericAmount === preset
                        ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-500 dark:bg-purple-950/40 dark:text-purple-300"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                    }`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>

              {/* Insufficient balance warning */}
              {numericAmount > 0 && !isBalanceSufficient && (
                <div className="mt-4 flex items-center gap-2 text-xs text-red-500">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Insufficient balance (Current balance: ৳{availableBalance})</span>
                </div>
              )}

              {/* Breakdown */}
              <div className="mt-6 border-t border-gray-100 pt-4 space-y-2.5 text-xs dark:border-gray-800">
                <div className="flex justify-between text-gray-500">
                  <span>Provider</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{selectedOrg || "-"}</span>
                </div>
                {accountNumber && (
                  <div className="flex justify-between text-gray-500">
                    <span>Account / Meter</span>
                    <span className="font-mono text-gray-900 dark:text-white">{accountNumber}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-500">
                  <span>Billing Month</span>
                  <span className="text-gray-900 dark:text-white">{billingMonth}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Platform Fee</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">FREE (৳0.00)</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white">
                  <span>Total Payable</span>
                  <span className="text-purple-600 dark:text-purple-400">
                    ৳{numericAmount > 0 ? numericAmount.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                disabled={!canContinue}
                onClick={handleContinue}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-4 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <Receipt className="size-4" />
                <span>Continue to PIN Confirmation</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function PayBillPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-purple-600" />
      </div>
    }>
      <PayBillContent />
    </Suspense>
  );
}
