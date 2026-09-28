'use client';

import { useState, Suspense, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Banknote } from "lucide-react";

function ConfirmPinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract query parameters
  const type = searchParams.get("type") || "Payment";
  const receiver = searchParams.get("receiver") || "";
  const name = searchParams.get("name") || "";
  const amount = Number(searchParams.get("amount")) || 0;
  const charge = Number(searchParams.get("charge")) || 0;
  const total = Number(searchParams.get("total")) || (amount + charge);
  const note = searchParams.get("note") || "";

  const amountLabel = amount.toFixed(2);
  const chargeLabel = charge.toFixed(2);
  const totalLabel = total.toFixed(2);
  
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "done">("idle");
  const [refNo, setRefNo] = useState("");
  const [transactionData, setTransactionData] = useState<any>(null);

  const goBackToDashboard = () => {
    const accountType = sessionStorage.getItem("accountType") || sessionStorage.getItem("role");

    if (accountType === "AGENT") {
      router.push("/agent");
    } else if (accountType === "BUSINESS" || accountType === "MERCHANT") {
      router.push("/merchant");
    } else if (accountType === "BILLER") {
      router.push("/biller");
    } else {
      router.push("/");
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status !== "idle") return;
    setError("");

    if (pin.length < 4) {
      setError("PIN must be at least 4 digits.");
      return;
    }

    verify(pin);
  };

  async function verify(currentPin: string) {
    setStatus("verifying");

    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const endpoint =
        type === "Send Money"
          ? "http://localhost:5001/api/transactions/send-money"
          : type === "Cash Out"
          ? "http://localhost:5001/api/transactions/cash-out"
          : type === "Make Payment"
          ? "http://localhost:5001/api/transactions/make-payment"
          : type === "Pay Bill"
          ? "http://localhost:5001/api/transactions/pay-bill"
          : "http://localhost:5001/api/transactions/make-payment";

      const invoiceNumber = searchParams.get("invoice") || searchParams.get("invoice_number") || "";
      const billerId = searchParams.get("biller_id") || "";
      const serviceId = searchParams.get("service_id") || "";
      const billingMonth = searchParams.get("billing_month") || "";
      const accountNumber = searchParams.get("account_number") || searchParams.get("meter_no") || "";

      const requestBody =
        type === "Send Money"
          ? {
              receiver_phone: receiver,
              amount: amount,
              pin: currentPin,
              note: note,
            }
          : type === "Cash Out"
          ? {
              agent_phone: receiver,
              amount: amount,
              pin: currentPin,
              note: note,
            }
          : type === "Pay Bill"
          ? {
              biller_id: billerId || undefined,
              service_id: serviceId || undefined,
              biller_phone: receiver || undefined,
              amount: amount,
              pin: currentPin,
              billing_month: billingMonth || undefined,
              account_number: accountNumber || undefined,
              note: note || undefined,
            }
          : {
              merchant_phone: receiver,
              amount: amount,
              pin: currentPin,
              note: note,
              invoice_number: invoiceNumber || undefined,
            };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        setRefNo(data.referenceNo);
        setTransactionData(data);
        setStatus("done");
      } else {
        setStatus("idle");
        setPin("");
        setError(data.error || "Transaction failed. Please try again.");
      }
    } catch (err) {
      setStatus("idle");
      setPin("");
      setError("Failed to connect to the server.");
    }
  }

  // ==========================================
  // SUCCESS SCREEN
  // ==========================================
  if (status === "done") {
    const isCashOut = type === "Cash Out";
    const finalAmount = transactionData?.amount ?? amount;
    const finalCharge = transactionData?.charge ?? transactionData?.commission ?? charge;
    const finalTotal = transactionData?.totalDeduction ?? total;
    const agentName = transactionData?.agent?.businessName || transactionData?.agent?.name || name;

    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 px-5 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">{type} successful</h1>

          {isCashOut ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/70 p-4 border border-gray-200/80 dark:border-gray-800 text-left space-y-2 text-xs">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Cash Out Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ৳{Number(finalAmount).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Cash Out Charge</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                    +৳{Number(finalCharge).toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 flex justify-between text-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">Total Deducted</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    -৳{Number(finalTotal).toFixed(2)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700/60 text-gray-500 dark:text-gray-400">
                  <span>Money with charge sent to agent:</span>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm mt-0.5">
                    {agentName ? `${agentName} · ` : ""}{receiver}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              ৳{amountLabel} sent to {name ? `${name} · ` : ""}
              {receiver}
            </p>
          )}

          <p className="mt-4 text-xs font-semibold text-gray-400 dark:text-gray-500">
            Ref: {refNo}
          </p>
          {note && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Note: {note}</p>}
          <button
            onClick={goBackToDashboard}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // PIN ENTRY SCREEN
  // ==========================================
  const isCashOut = type === "Cash Out";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Confirm PIN</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{type}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center dark:border-gray-800 dark:bg-gray-950">
          {isCashOut ? (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Total Deduction
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight text-blue-600 dark:text-blue-500">
                ৳{totalLabel}
              </p>

              {/* Breakdown Details */}
              <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-1.5 text-xs text-left">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Cash Out Amount</span>
                  <span className="font-semibold text-gray-900 dark:text-white">৳{amountLabel}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Cash Out Charge</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">+৳{chargeLabel}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-800/80">
                  <span>Agent</span>
                  <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                    {name ? `${name} · ` : ""}{receiver}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Amount</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-600 dark:text-blue-500">৳{amountLabel}</p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {name ? `${name} · ` : ""}
                {receiver}
              </p>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm font-semibold">Enter your 4-6 digit PIN</p>
        
        <form onSubmit={handleSubmit} className="mx-auto mt-6 flex max-w-xs flex-col gap-4">
          <input
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={pin}
            autoFocus
            disabled={status === "verifying"}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} // Strips any non-numeric characters
            placeholder="••••"
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-3xl font-semibold tracking-[0.5em] text-gray-900 outline-none transition-colors focus:border-blue-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:focus:border-blue-800"
          />
          
          {error && <p className="text-center text-xs font-medium text-red-500">{error}</p>}
          
          <button
            type="submit"
            disabled={status === "verifying" || pin.length < 4}
            className="mt-2 flex w-full items-center justify-center rounded-2xl bg-blue-600 py-4 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
          >
            {status === "verifying" ? "Processing..." : "Confirm Transaction"}
          </button>
        </form>

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck className="size-4" /> End-to-end encrypted transaction
        </p>
      </div>
    </div>
  );
}

export default function ConfirmPinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <ConfirmPinContent />
    </Suspense>
  );
}