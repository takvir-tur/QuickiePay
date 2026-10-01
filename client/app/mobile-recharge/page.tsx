'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Smartphone, Wallet } from "lucide-react";

const operators = [
  { name: "Grameenphone", mark: "GP", style: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300", selected: "border-sky-600 ring-2 ring-sky-600/15 dark:border-sky-400" },
  { name: "Robi", mark: "robi", style: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300", selected: "border-rose-600 ring-2 ring-rose-600/15 dark:border-rose-400" },
  { name: "Teletalk", mark: "T", style: "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-900 dark:bg-cyan-950/50 dark:text-cyan-300", selected: "border-cyan-600 ring-2 ring-cyan-600/15 dark:border-cyan-400" },
  { name: "Banglalink", mark: "BL", style: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300", selected: "border-orange-600 ring-2 ring-orange-600/15 dark:border-orange-400" },
  { name: "Airtel", mark: "airtel", style: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300", selected: "border-red-600 ring-2 ring-red-600/15 dark:border-red-400" },
] as const;

const amountPresets = [20, 50, 100, 200, 500, 1000];

export default function MobileRechargePage() {
  const router = useRouter();
  const [operator, setOperator] = useState<string>(operators[0].name);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [backHref, setBackHref] = useState("/");

  useEffect(() => {
    const userId = sessionStorage.getItem("userId");
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role")?.toUpperCase();

    if (role === "AGENT") setBackHref("/agent");
    else if (role === "MERCHANT" || role === "BUSINESS") setBackHref("/merchant");
    else if (role === "BILLER") setBackHref("/biller");

    if (!userId || !token) {
      router.push("/login");
      return;
    }

    fetch(`http://localhost:5001/api/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          throw new Error("Unauthorized");
        }
        if (!response.ok) throw new Error("Could not load wallet balance");
        return response.json();
      })
      .then((data) => setAvailableBalance(Number(data.balance) || 0))
      .catch((error) => console.error("Error fetching balance:", error))
      .finally(() => setLoadingBalance(false));
  }, [router]);

  const numericAmount = Number(amount);
  const validPhone = /^01\d{9}$/.test(phoneNumber);
  const validAmount = Number.isInteger(numericAmount) && numericAmount > 0 && numericAmount <= 10000;
  const canContinue = validPhone && validAmount && numericAmount <= availableBalance && !loadingBalance;

  function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;

    const params = new URLSearchParams({
      type: "Mobile Recharge",
      receiver: phoneNumber,
      name: operator,
      operator,
      amount: String(numericAmount),
    });
    router.push(`/confirm-pin?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/80 px-5 py-5 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href={backHref}
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Mobile recharge</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Bangladesh mobile operators</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-7 md:px-8 md:py-10">
        <div className="mb-6 flex items-start gap-3 border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
          <Smartphone className="mt-0.5 size-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Simulated recharge</p>
            <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/75">
              This demo only deducts from your QuickiePay wallet. It does not contact a mobile operator.
            </p>
          </div>
        </div>

        <form onSubmit={handleContinue} className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.65fr)]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950 md:p-7">
            <fieldset>
              <legend className="text-sm font-semibold">Choose operator</legend>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {operators.map((item) => {
                  const isSelected = operator === item.name;
                  return (
                    <button
                      key={item.name}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setOperator(item.name)}
                      className={`flex min-h-20 items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${item.style} ${isSelected ? item.selected : "hover:border-gray-400 dark:hover:border-gray-600"}`}
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/80 text-xs font-bold dark:bg-black/20">
                        {item.mark}
                      </span>
                      <span className="text-sm font-semibold">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-7">
              <label htmlFor="phoneNumber" className="text-sm font-semibold">Mobile number</label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-orange-500 dark:border-gray-800 dark:bg-gray-900">
                <span className="border-r border-gray-300 pr-3 text-sm font-semibold text-gray-500 dark:border-gray-700 dark:text-gray-400">BD</span>
                <input
                  id="phoneNumber"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={11}
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="01XXXXXXXXX"
                  aria-describedby="phoneHelp"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              <p id="phoneHelp" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Enter an 11-digit Bangladesh mobile number starting with 01.
              </p>
            </div>

            <fieldset className="mt-7">
              <legend className="text-sm font-semibold">Recharge amount</legend>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {amountPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={amount === String(preset)}
                    onClick={() => setAmount(String(preset))}
                    className={`rounded-lg border px-2 py-2.5 text-sm font-semibold transition-colors ${amount === String(preset) ? "border-orange-600 bg-orange-50 text-orange-700 dark:border-orange-500 dark:bg-orange-950/40 dark:text-orange-300" : "border-gray-200 text-gray-700 hover:border-gray-400 dark:border-gray-800 dark:text-gray-300 dark:hover:border-gray-600"}`}
                  >
                    ৳{preset}
                  </button>
                ))}
              </div>
              <label htmlFor="amount" className="mt-4 block text-xs font-medium text-gray-500 dark:text-gray-400">Or enter another whole amount</label>
              <div className="mt-2 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-orange-500 dark:border-gray-800 dark:bg-gray-900">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">৳</span>
                <input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max="10000"
                  step="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value.slice(0, 5))}
                  placeholder="Enter amount"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
              {validAmount && numericAmount > availableBalance && (
                <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">This amount is above your available balance.</p>
              )}
            </fieldset>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <h2 className="text-sm font-semibold">Recharge summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt>Operator</dt>
                  <dd className="text-right font-medium text-gray-900 dark:text-white">{operator}</dd>
                </div>
                <div className="flex justify-between gap-4 text-gray-500 dark:text-gray-400">
                  <dt>Number</dt>
                  <dd className="font-medium text-gray-900 dark:text-white">{phoneNumber || "Not entered"}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-gray-100 pt-3 text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  <dt>Wallet deduction</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">৳{validAmount ? numericAmount.toFixed(2) : "0.00"}</dd>
                </div>
              </dl>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm dark:border-gray-800 dark:bg-gray-950">
              <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Wallet className="size-4" /> Available balance
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {loadingBalance ? "Loading..." : `৳${availableBalance.toFixed(2)}`}
              </span>
            </div>

            <button
              type="submit"
              disabled={!canContinue}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
            >
              <Check className="size-4" /> Continue to PIN
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
