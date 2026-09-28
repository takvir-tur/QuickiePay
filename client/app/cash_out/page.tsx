"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Banknote, ShieldCheck, Wallet, CheckCircle2, AlertCircle } from "lucide-react";

interface AgentInfo {
  name: string;
  businessName: string;
  phoneNumber: string;
  commissionRate: number;
}

const amountPresets = [500, 1000, 2000, 5000];

export default function CashOutPage() {
  const router = useRouter();

  const [agentPhone, setAgentPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [availableBalance, setAvailableBalance] = useState<string>("0.00");
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [agentLookupError, setAgentLookupError] = useState("");

  // Fetch logged-in user's balance
  useEffect(() => {
    const savedUserId = sessionStorage.getItem("userId");
    const token = sessionStorage.getItem("token");

    if (!savedUserId || !token) {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:5001/api/users/${savedUserId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          return Promise.reject("Unauthorized");
        }
        return res.json();
      })
      .then((data) => {
        if (data.balance !== undefined) {
          setAvailableBalance(data.balance);
        }
      })
      .catch((err) => console.error("Error fetching balance:", err));
  }, [router]);

  // Real-time Agent lookup when 11-digit phone number is entered
  useEffect(() => {
    const cleaned = agentPhone.replace(/\D/g, "");
    const token = sessionStorage.getItem("token");

    if (cleaned.length === 11) {
      setIsLookingUp(true);
      setAgentLookupError("");

      fetch(`http://localhost:5001/api/transactions/agent-lookup/${cleaned}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok) {
            setAgentInfo(data);
            setAgentLookupError("");
          } else {
            setAgentInfo(null);
            setAgentLookupError(data.error || "Agent not found");
          }
        })
        .catch(() => {
          setAgentInfo(null);
          setAgentLookupError("Failed to lookup agent");
        })
        .finally(() => {
          setIsLookingUp(false);
        });
    } else {
      setAgentInfo(null);
      setAgentLookupError("");
    }
  }, [agentPhone]);

  const numericAmount = Number(amount) || 0;
  // Use agent's commission rate or default 1.5%
  const commissionRate = agentInfo ? agentInfo.commissionRate : 1.50;
  const charge = numericAmount > 0 ? Number(((numericAmount * commissionRate) / 100).toFixed(2)) : 0;
  const totalDeduction = numericAmount > 0 ? Number((numericAmount + charge).toFixed(2)) : 0;
  const balanceNum = parseFloat(availableBalance) || 0;
  const isInsufficient = numericAmount > 0 && totalDeduction > balanceNum;

  const handleContinue = () => {
    setMessage("");

    if (!agentPhone.trim()) {
      setMessage("Please enter agent number");
      return;
    }

    const phoneRegex = /^(?:\+88|88)?(01[3-9]\d{8})$/;
    if (!phoneRegex.test(agentPhone.trim())) {
      setMessage("Please enter a valid 11-digit agent number");
      return;
    }

    if (agentLookupError) {
      setMessage(agentLookupError);
      return;
    }

    if (!amount.trim() || numericAmount <= 0) {
      setMessage("Please enter a valid cash out amount");
      return;
    }

    if (isInsufficient) {
      setMessage(
        `Insufficient balance. Total deduction ৳${totalDeduction.toFixed(2)} exceeds available balance ৳${balanceNum.toFixed(2)}`
      );
      return;
    }

    const agentDisplayName = agentInfo
      ? agentInfo.businessName
        ? `${agentInfo.businessName} (${agentInfo.name})`
        : agentInfo.name
      : "";

    const searchParams = new URLSearchParams({
      type: "Cash Out",
      receiver: agentPhone.trim(),
      name: agentDisplayName,
      amount: numericAmount.toFixed(2),
      charge: charge.toFixed(2),
      total: totalDeduction.toFixed(2),
      rate: commissionRate.toString(),
      note: note.trim(),
    });

    router.push(`/confirm-pin?${searchParams.toString()}`);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBack}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex items-center gap-2">
                <Banknote size={22} className="text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Cash Out
                </h1>
              </div>
            </div>

            {/* Available Balance Pill */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
              <Wallet size={14} />
              <span>৳{parseFloat(availableBalance).toFixed(2)}</span>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-5">
            {/* Agent Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent Number
              </label>

              <input
                type="tel"
                value={agentPhone}
                onChange={(e) => {
                  setAgentPhone(e.target.value);
                  setMessage("");
                }}
                placeholder="01XXXXXXXXX"
                maxLength={14}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Agent lookup feedback */}
              {isLookingUp && (
                <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 animate-pulse">
                  Verifying agent...
                </p>
              )}

              {agentInfo && (
                <div className="mt-2 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {agentInfo.businessName || agentInfo.name}
                    </p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Active Agent · Charge Rate: {agentInfo.commissionRate}%
                    </p>
                  </div>
                </div>
              )}

              {agentLookupError && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle size={14} />
                  <span>{agentLookupError}</span>
                </div>
              )}
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                  ৳
                </span>

                <input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setMessage("");
                  }}
                  placeholder="Enter amount"
                  min="1"
                  step="0.01"
                  className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Amount Quick Presets */}
              <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset.toString());
                      setMessage("");
                    }}
                    className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                  >
                    +৳{preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Note (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note <span className="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. For emergency cash"
                maxLength={50}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            {/* Live Charge & Total Deduction Breakdown Card */}
            {numericAmount > 0 && (
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-4 border border-gray-200 dark:border-gray-700/60 space-y-2">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Cash Out Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ৳{numericAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>Cash Out Charge ({commissionRate}%)</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    +৳{charge.toFixed(2)}
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      Total Deduction
                    </span>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Amount + charge will be sent to agent
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ৳{totalDeduction.toFixed(2)}
                  </span>
                </div>

                {isInsufficient && (
                  <div className="mt-2 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-xs flex items-center gap-1.5">
                    <AlertCircle size={14} className="shrink-0" />
                    <span>
                      Insufficient balance! You need ৳{totalDeduction.toFixed(2)} but have ৳
                      {balanceNum.toFixed(2)}.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {message && (
              <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 text-sm">
                {message}
              </div>
            )}

            {/* Continue Button */}
            <button
              type="button"
              onClick={handleContinue}
              disabled={isInsufficient || (numericAmount > 0 && !!agentLookupError)}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition shadow-sm"
            >
              Continue to Confirm
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <ShieldCheck size={14} /> Secured cash out withdrawal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}