'use client';
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, CreditCard, Wallet } from "lucide-react";

function MakePaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const prefilledPhone = searchParams.get("merchant") || "";
  const prefilledName = searchParams.get("name") || "";

  const [merchantPhone, setMerchantPhone] = useState(prefilledPhone);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [availableBalance, setAvailableBalance] = useState<string>("0.00");
  const [backHref, setBackHref] = useState("/");

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
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setAvailableBalance(data.balance))
      .catch((err) => console.error("Error fetching balance:", err));
  }, [router]);

  const numericAmount = Number(amount) || 0;
  const isPhoneValid = merchantPhone.trim().length >= 10;
  const canContinue = isPhoneValid && numericAmount > 0 && numericAmount <= parseFloat(availableBalance);

  function handleContinue() {
    if (!canContinue) return;

    const params = new URLSearchParams({
      type: "Make Payment",
      receiver: merchantPhone.trim(),
      name: prefilledName,
      amount: numericAmount.toFixed(2),
      note: note.trim(),
    });

    router.push(`/confirm-pin?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Make Payment</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Pay a shop or merchant · no charge</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 py-8">
        <section className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          {prefilledPhone ? (
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-full bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                <CreditCard className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{prefilledName || "Merchant"}</p>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{prefilledPhone}</p>
              </div>
            </div>
          ) : (
            <>
              <label htmlFor="merchantPhone" className="text-sm font-semibold">
                Merchant phone number
              </label>
              <input
                id="merchantPhone"
                value={merchantPhone}
                onChange={(e) => setMerchantPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                inputMode="numeric"
                placeholder="01XXXXXXXXX"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-pink-500 dark:border-gray-800 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-pink-800"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Or scan the merchant&apos;s QR code from their store to skip this step.
              </p>
            </>
          )}
        </section>

        <section className="mt-5 rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
          <label htmlFor="amount" className="text-sm font-semibold">
            Amount
          </label>
          <div className="mt-3 flex items-center gap-2 border-b border-gray-200 pb-3 dark:border-gray-800">
            <span className="text-3xl font-semibold text-gray-400 dark:text-gray-500">৳</span>
            <input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, "").slice(0, 9))}
              inputMode="decimal"
              placeholder="0.00"
              className="w-full bg-transparent text-3xl font-semibold tracking-tight outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700"
            />
          </div>

          {numericAmount > parseFloat(availableBalance) && numericAmount > 0 && (
            <p className="mt-3 text-xs font-medium text-red-500">Amount exceeds available balance.</p>
          )}

          <label htmlFor="note" className="mt-6 block text-sm font-semibold">
            Note <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
          </label>
          <input
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 80))}
            placeholder="What's this for?"
            className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-pink-500 dark:border-gray-800 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-pink-800"
          />
        </section>

        <div className="mt-5 flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm dark:border-gray-800 dark:bg-gray-950">
          <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Wallet className="size-4" /> Available balance
          </span>
          <span className="font-semibold text-gray-900 dark:text-white">৳ {availableBalance}</span>
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 py-4 text-sm font-semibold text-white transition-all hover:bg-pink-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
        >
          <Check className="size-4" />
          Continue to confirm
        </button>
      </div>
    </div>
  );
}

export default function MakePaymentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <MakePaymentContent />
    </Suspense>
  );
}
