'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight
} from "lucide-react";

const supportedBanks = [
  "Dutch-Bangla Bank Limited (DBBL)",
  "BRAC Bank Limited",
  "The City Bank Limited",
  "Islami Bank Bangladesh Limited",
  "Eastern Bank Limited (EBL)",
  "Sonali Bank PLC",
  "Standard Chartered Bangladesh",
  "United Commercial Bank (UCB)",
  "Mutual Trust Bank (MTB)"
];

interface BankTransferRecord {
  transfer_id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  amount: string;
  status: string;
  reference_no: string;
  created_at: string;
}

export default function BillerBankTransferPage() {
  const router = useRouter();

  const [availableBalance, setAvailableBalance] = useState("0.00");
  const [bankName, setBankName] = useState(supportedBanks[0]);
  const [holderName, setHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branchName, setBranchName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<BankTransferRecord[]>([]);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [successReceipt, setSuccessReceipt] = useState<any>(null);

  // Fetch balance and profile
  const fetchBillerData = () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/billers/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.balance !== undefined) {
          setAvailableBalance(data.balance);
        }
        if (data.full_name && !holderName) {
          setHolderName(data.full_name);
        }
      })
      .catch((err) => console.error("Error fetching biller profile:", err));

    fetch("http://localhost:5001/api/billers/bank-transfers", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch((err) => console.error("Error fetching transfers:", err));
  };

  useEffect(() => {
    fetchBillerData();
  }, [router]);

  const numericAmount = parseFloat(amount) || 0;
  const balanceNum = parseFloat(availableBalance) || 0;
  const isInsufficient = numericAmount > 0 && numericAmount > balanceNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!bankName || !holderName.trim() || !accountNumber.trim()) {
      setMessage({ text: "Please fill in all required bank details", type: "error" });
      return;
    }

    if (numericAmount <= 0) {
      setMessage({ text: "Please enter a valid transfer amount", type: "error" });
      return;
    }

    if (isInsufficient) {
      setMessage({
        text: `Insufficient balance. Available ৳${balanceNum.toFixed(2)}, entered ৳${numericAmount.toFixed(2)}`,
        type: "error"
      });
      return;
    }

    if (pin.length < 4) {
      setMessage({ text: "Please enter your 4-6 digit security PIN", type: "error" });
      return;
    }

    setLoading(true);
    const token = sessionStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5001/api/billers/bank-transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          bank_name: bankName,
          account_holder_name: holderName.trim(),
          account_number: accountNumber.trim(),
          branch_name: branchName.trim(),
          routing_number: routingNumber.trim(),
          amount: numericAmount,
          pin
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessReceipt({
          referenceNo: data.referenceNo,
          amount: numericAmount,
          bankName,
          accountNumber,
          holderName
        });
        setAmount("");
        setPin("");
        fetchBillerData();
      } else {
        setMessage({ text: data.error || "Transfer failed. Please verify your PIN.", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error. Failed to reach the server.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/biller"
              aria-label="Back to Biller Dashboard"
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Bank Payout Transfer</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Transfer utility collection funds directly to your commercial bank account
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-2xl bg-purple-50 px-4 py-2 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
            <Wallet className="size-4" />
            <span>Balance: ৳{balanceNum.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        {/* Success Modal / Receipt */}
        {successReceipt && (
          <div className="mb-8 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 dark:border-emerald-900/50 dark:bg-emerald-950/30">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white">
                <CheckCircle2 className="size-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-200">
                  Bank Transfer Successful!
                </h3>
                <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  Ref: <span className="font-mono font-semibold">{successReceipt.referenceNo}</span> · Amount: ৳
                  {successReceipt.amount.toFixed(2)} transferred to {successReceipt.bankName} (Acct:{" "}
                  {successReceipt.accountNumber})
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setSuccessReceipt(null)}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          {/* Transfer Form */}
          <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-8">
            <div className="flex items-center gap-3 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="grid size-10 place-items-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
                <Building2 className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-bold">Bank Account Details</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">BEFTN / NPSB instant transfer</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* Select Bank */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Destination Bank
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                >
                  {supportedBanks.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Holder & Account Number */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                    placeholder="Company or Authorized Name"
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 1021510001234"
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Branch & Routing Number (Optional) */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Branch Name <span className="text-[10px] text-gray-400 lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Motijheel Corporate"
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Routing Number <span className="text-[10px] text-gray-400 lowercase">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={routingNumber}
                    onChange={(e) => setRoutingNumber(e.target.value)}
                    placeholder="9-digit routing number"
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Amount & PIN */}
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Transfer Amount (৳)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-400">৳</span>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      min="1"
                      step="0.01"
                      required
                      className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-9 pr-4 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Biller Security PIN
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••"
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>
              </div>

              {message.text && (
                <div
                  className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
                    message.type === "error"
                      ? "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                      : "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                  }`}
                >
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || isInsufficient}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-purple-600 py-3.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? "Processing Bank Transfer..." : "Confirm Bank Payout"}
              </button>
            </form>
          </section>

          {/* Transfer History Sidebar */}
          <aside className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Clock className="size-4 text-purple-600" /> Recent Bank Transfers
            </h3>
            <div className="mt-4 space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-gray-500 py-6 text-center">No previous bank transfers found.</p>
              ) : (
                history.map((tx) => (
                  <div
                    key={tx.transfer_id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-3.5 text-xs dark:border-gray-800/80 dark:bg-gray-800/40"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[170px]">
                          {tx.bank_name.split("(")[0]}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">Acct: ••••{tx.account_number.slice(-4)}</p>
                      </div>
                      <span className="font-bold text-purple-600 dark:text-purple-400">
                        ৳{parseFloat(tx.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 flex justify-between items-center text-[10px] text-gray-400 pt-2 border-t border-gray-200/50 dark:border-gray-700/50">
                      <span>{new Date(tx.created_at).toLocaleDateString()}</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">COMPLETED</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
