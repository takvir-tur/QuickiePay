'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpFromLine,
  User,
  Wallet,
  Percent,
} from "lucide-react";

export default function CashOutPage() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [commissionRate, setCommissionRate] = useState(1.5);

  const commission =
    amount && Number(amount) > 0
      ? (Number(amount) * commissionRate) / 100
      : 0;

  const total = Number(amount || 0) + commission;

  const handleCashOut = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const token = sessionStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    setMessage("Processing cash out...");

    try {
      const res = await fetch(
        "http://localhost:5001/api/transactions/cash-out",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            phone_number: phoneNumber,
            amount: Number(amount),
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("Cash Out successful!");

        setPhoneNumber("");
        setAmount("");

        setTimeout(() => {
          router.push("/agent");
        }, 1500);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to connect to backend server!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-white">

      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur dark:border-gray-800 dark:bg-gray-950/70">

        <div className="mx-auto flex max-w-2xl items-center gap-3">

          <button
            onClick={() => router.push("/agent")}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="size-5" />
          </button>

          <div>

            <h1 className="text-xl font-semibold">
              Cash Out
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Withdraw money for a customer
            </p>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">

          <div className="mb-8 flex flex-col items-center">

            <div className="grid size-16 place-items-center rounded-2xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-500">

              <ArrowUpFromLine className="size-8" />

            </div>

            <h2 className="mt-4 text-2xl font-semibold">
              Cash Out
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Withdraw money for a customer
            </p>

          </div>

          <form
            onSubmit={handleCashOut}
            className="flex flex-col gap-5"
          >

            <div>

              <label className="mb-2 block text-sm font-medium">
                Customer Phone Number
              </label>

              <div className="relative">

                <User className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900"
                />

              </div>

            </div>

            <div>

              <label className="mb-2 block text-sm font-medium">
                Amount
              </label>

              <div className="relative">

                <Wallet className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900"
                />

              </div>

            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">

              <div className="flex items-center justify-between">

                <div className="flex items-center gap-2">

                  <Percent className="size-4 text-gray-500" />

                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Commission Rate
                  </span>

                </div>

                <span className="font-semibold">
                  {commissionRate.toFixed(2)}%
                </span>

              </div>

              <div className="mt-3 flex items-center justify-between">

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Commission
                </span>

                <span className="font-semibold">
                  ৳{commission.toFixed(2)}
                </span>

              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-800">

                <span className="text-sm font-medium">
                  Total Deducted
                </span>

                <span className="text-lg font-semibold">
                  ৳{total.toFixed(2)}
                </span>

              </div>

            </div>

            {message && (
              <div className="rounded-xl bg-blue-50 p-3 text-center text-sm text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-green-600 py-3.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Cash Out
            </button>

          </form>

        </div>

      </main>

    </div>
  );
}