'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowDownToLine, User, Wallet, Lock } from "lucide-react";

export default function CashInPage() {
  const router = useRouter();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");

  const handleCashIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const token = sessionStorage.getItem("token");

    if (!token) {
      router.push("/login");
      return;
    }

    setMessage("Processing cash in...");

    try {
      const res = await fetch(
        "http://localhost:5001/api/transactions/cash-in",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_phone: phoneNumber, // backend e customer_phone name expect korche
            amount: Number(amount),
            pin: pin,                    // pin field add kora holo
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessage("Cash In successful!");

        setPhoneNumber("");
        setAmount("");
        setPin("");

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
              Cash In
            </h1>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add money to a user's account
            </p>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10">

        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-950">

          <div className="mb-8 flex flex-col items-center">

            <div className="grid size-16 place-items-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-500">
              <ArrowDownToLine className="size-8" />
            </div>

            <h2 className="mt-4 text-2xl font-semibold">
              Cash In
            </h2>

            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Deposit money for a customer
            </p>

          </div>

          <form
            onSubmit={handleCashIn}
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

            {/* Added Agent PIN Field */}
            <div>

              <label className="mb-2 block text-sm font-medium">
                Agent PIN
              </label>

              <div className="relative">

                <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-400" />

                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="Enter your PIN"
                  maxLength={6}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-12 pr-4 text-sm outline-none focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900"
                />

              </div>

            </div>

            <div className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">

              <div className="flex items-center justify-between">

                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Cash In Charge
                </span>

                <span className="font-semibold text-green-600">
                  FREE
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
              className="w-full rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Cash In
            </button>

          </form>

        </div>

      </main>

    </div>
  );
}