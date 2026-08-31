'use client';

import { useState, Suspense, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";

function ConfirmPinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract query parameters
  const type = searchParams.get("type") || "Payment";
  const receiver = searchParams.get("receiver") || "";
  const name = searchParams.get("name") || "";
  const amount = Number(searchParams.get("amount")) || 0;
  const note = searchParams.get("note") || "";

  const amountLabel = amount.toFixed(2);
  
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "verifying" | "done">("idle");
  const [refNo, setRefNo] = useState("");

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
      const endpoint = type === "Send Money" 
        ? "http://localhost:5001/api/transactions/send-money"
        : "http://localhost:5001/api/transactions/send-money"; // Default fallback

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiver_phone: receiver,
          amount: amount,
          pin: currentPin,
          note: note
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setRefNo(data.referenceNo);
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
    return (
      <div className="grid min-h-screen place-items-center bg-gray-50 px-5 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
        <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500">
            <CheckCircle2 className="size-8" />
          </div>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">{type} successful</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            ৳{amountLabel} sent to {name ? `${name} · ` : ""}
            {receiver}
          </p>
          <p className="mt-2 text-xs font-semibold text-gray-400 dark:text-gray-500">
            Ref: {refNo}
          </p>
          {note && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Note: {note}</p>}
          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ==========================================
  // PIN ENTRY SCREEN
  // ==========================================
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
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">Amount</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-blue-600 dark:text-blue-500">৳{amountLabel}</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {name ? `${name} · ` : ""}
            {receiver}
          </p>
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