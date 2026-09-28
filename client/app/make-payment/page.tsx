'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Wallet,
  Receipt,
  FileSpreadsheet,
  QrCode
} from "lucide-react";
import QrScannerModal from "@/components/QrScannerModal";

const amountPresets = [100, 250, 500, 1000, 2000, 5000];

function MakePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialMerchant = searchParams.get("merchant") || searchParams.get("phone") || "";
  const initialAmount = searchParams.get("amount") || "";
  const initialInvoice = searchParams.get("invoice") || searchParams.get("invoice_number") || "";
  const initialNote = searchParams.get("note") || "";

  const [merchantPhone, setMerchantPhone] = useState(initialMerchant);
  const [amount, setAmount] = useState(initialAmount);
  const [invoiceNumber, setInvoiceNumber] = useState(initialInvoice);
  const [note, setNote] = useState(initialNote);
  const [availableBalance, setAvailableBalance] = useState<string>("0.00");
  const [backHref, setBackHref] = useState("/");
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Merchant lookup state
  const [merchantInfo, setMerchantInfo] = useState<{
    business_name?: string;
    full_name?: string;
    phone_number?: string;
  } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");

  // Authenticate & load balance
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

    fetch(`http://localhost:5001/api/users/${savedUserId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          return;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.balance) setAvailableBalance(data.balance);
      })
      .catch((err) => console.error("Error fetching balance:", err));
  }, [router]);

  // Real-time merchant lookup when 11 digits entered
  useEffect(() => {
    const rawNumber = merchantPhone.replace(/\D/g, "");
    if (rawNumber.length === 11) {
      const token = sessionStorage.getItem("token");
      setLookupLoading(true);
      setLookupError("");

      fetch(`http://localhost:5001/api/transactions/merchant-lookup/${rawNumber}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || "Merchant not found");
          }
          return data;
        })
        .then((data) => {
          setMerchantInfo(data);
          setLookupError("");
        })
        .catch((err) => {
          setMerchantInfo(null);
          setLookupError(err.message || "Invalid merchant phone");
        })
        .finally(() => {
          setLookupLoading(false);
        });
    } else {
      setMerchantInfo(null);
      setLookupError("");
      setLookupLoading(false);
    }
  }, [merchantPhone]);

  const numericAmount = parseFloat(amount) || 0;
  const numBalance = parseFloat(availableBalance) || 0;
  const isBalanceSufficient = numericAmount <= numBalance;

  const canContinue =
    merchantPhone.replace(/\D/g, "").length === 11 &&
    merchantInfo !== null &&
    numericAmount > 0 &&
    isBalanceSufficient;

  const handleContinue = () => {
    if (!canContinue || !merchantInfo) return;

    const query = new URLSearchParams({
      type: "Make Payment",
      receiver: merchantPhone.replace(/\D/g, ""),
      name: merchantInfo.business_name || merchantInfo.full_name || "Merchant",
      amount: numericAmount.toFixed(2),
      charge: "0.00",
      total: numericAmount.toFixed(2),
      note: note.trim(),
      invoice: invoiceNumber.trim()
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
            <h1 className="text-xl font-semibold tracking-tight">Make Payment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pay registered merchants & stores</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          
          {/* LEFT: Merchant and Details */}
          <div className="space-y-6">
            {/* Merchant Phone Box */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-semibold">Merchant Account Number</label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Enter 11-digit phone or scan merchant QR code
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-1.5 rounded-xl border border-pink-200 bg-pink-50 px-3 py-1.5 text-xs font-semibold text-pink-700 transition hover:bg-pink-100 dark:border-pink-900/50 dark:bg-pink-950/40 dark:text-pink-300"
                >
                  <QrCode className="size-3.5" />
                  <span>Scan QR</span>
                </button>
              </div>

              <div className="mt-4 relative">
                <input
                  type="tel"
                  placeholder="e.g. 01700000000"
                  value={merchantPhone}
                  onChange={(e) => setMerchantPhone(e.target.value)}
                  maxLength={11}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm font-medium tracking-wide outline-none transition focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10 dark:border-gray-800 dark:bg-gray-900 dark:focus:border-pink-500"
                />
                {lookupLoading && (
                  <div className="absolute right-4 top-3.5 text-gray-400">
                    <Loader2 className="size-5 animate-spin text-pink-600" />
                  </div>
                )}
              </div>

              {/* Merchant Lookup Feedback */}
              {merchantInfo && (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                    <Store className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                        {merchantInfo.business_name || merchantInfo.full_name}
                      </p>
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Verified Merchant · {merchantInfo.phone_number}
                    </p>
                  </div>
                </div>
              )}

              {lookupError && (
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{lookupError}</span>
                </div>
              )}
            </div>

            {/* Optional Invoice & Note Box */}
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <label className="text-sm font-semibold">Payment Reference (Optional)</label>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Invoice number or note for your records
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-xs text-gray-500">Invoice Number</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-1002"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Note / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Grocery items, Dinner bill"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Amount & Summary */}
          <div className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold">Amount</label>
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
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3.5 pl-10 pr-4 text-2xl font-bold outline-none transition focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-500/10 dark:border-gray-800 dark:bg-gray-900 dark:focus:border-pink-500"
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
                        ? "border-pink-600 bg-pink-50 text-pink-700 dark:border-pink-500 dark:bg-pink-950/40 dark:text-pink-300"
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

              {/* Order breakdown */}
              <div className="mt-6 border-t border-gray-100 pt-4 space-y-2 text-sm dark:border-gray-800">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Merchant Fee / Charge</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">FREE (৳0.00)</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span>Total Payable</span>
                  <span className="text-pink-600 dark:text-pink-400">
                    ৳{numericAmount > 0 ? numericAmount.toFixed(2) : "0.00"}
                  </span>
                </div>
              </div>

              {/* Continue Button */}
              <button
                type="button"
                disabled={!canContinue}
                onClick={handleContinue}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 py-4 text-sm font-semibold text-white shadow-lg shadow-pink-600/20 transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                <CreditCard className="size-4" />
                <span>Continue to PIN Confirmation</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(data) => {
          if (data.merchant) setMerchantPhone(data.merchant);
          if (data.amount) setAmount(data.amount);
          if (data.invoice) setInvoiceNumber(data.invoice);
          setIsScannerOpen(false);
        }}
      />
    </div>
  );
}

export default function MakePaymentPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-pink-600" />
      </div>
    }>
      <MakePaymentContent />
    </Suspense>
  );
}
