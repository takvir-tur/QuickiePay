'use client';
import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, Search, Wallet, X } from "lucide-react";

// Mock contacts (In a full app, you might fetch these from an API)
const contacts = [
  { name: "Sophia Anderson", phone: "01711234567", initials: "SA", note: "Sent ৳250 · Today" },
  { name: "Marcus Lee", phone: "01812345678", initials: "ML", note: "Sent ৳40 · 2 days ago" },
  { name: "Priya Rahman", phone: "01913456789", initials: "PR", note: "Sent ৳120 · Last week" },
  { name: "David Chen", phone: "01614567890", initials: "DC", note: "Received ৳75" },
  { name: "Nadia Islam", phone: "01515678901", initials: "NI", note: "Sent ৳18 · Last month" },
];

const amountPresets = [50, 100, 500, 1000, 5000];

function SendMoneyContent(){
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialReceiver = searchParams.get("receiver") || "";
  const [query, setQuery] = useState(initialReceiver);
  const [selected, setSelected] = useState<(typeof contacts)[number] | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [availableBalance, setAvailableBalance] = useState<string>("0.00");

  // Fetch the logged-in user's live balance
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
        "Authorization": `Bearer ${token}`
      }
    })
      .then((response) => {
        if (response.status === 401 || response.status === 403) {
          sessionStorage.clear();
          router.push("/login");
          throw new Error("Unauthorized");
        }
        return response.json();
      })
      .then((data) => setAvailableBalance(data.balance))
      .catch((error) => console.error("Error fetching balance:", error));
  }, [router]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q),
    );
  }, [query]);

  const rawNumber = query.replace(/\D/g, "");
  const isNewNumber = !selected && rawNumber.length >= 11;
  const receiver = selected?.phone ?? (isNewNumber ? rawNumber : "");
  const receiverName = selected?.name ?? (isNewNumber ? "New recipient" : "");
  const numericAmount = Number(amount);
  
  const canContinue =
    receiver.length >= 11 && 
    Number.isFinite(numericAmount) && 
    numericAmount > 0 && 
    numericAmount <= parseFloat(availableBalance);

  function handleContinue() {
    if (!canContinue) return;
    
    // Convert state to URL parameters to pass to the confirm-pin page
    const searchParams = new URLSearchParams({
      type: "Send Money",
      receiver: receiver,
      name: receiverName,
      amount: numericAmount.toFixed(2),
      note: note.trim(),
    });

    router.push(`/confirm-pin?${searchParams.toString()}`);
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            href="/"
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Send Money</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">To friends & family, instantly</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10 md:py-10">
        
        {/* Desktop Split Layout: Receiver on Left, Amount on Right */}
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          
          {/* LEFT COLUMN: RECEIVER */}
          <section className="flex h-fit flex-col rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
            <label htmlFor="receiver" className="text-sm font-semibold">
              Receiver
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Search a saved contact or type an 11-digit phone number
            </p>

            {selected ? (
              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-900/20">
                <div className="grid size-10 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                  {selected.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selected.name}</p>
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{selected.phone}</p>
                </div>
                <button
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                  }}
                  aria-label="Clear receiver"
                  className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 focus-within:border-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:focus-within:border-blue-800">
                  <Search className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
                  <input
                    id="receiver"
                    value={query}
                    onChange={(e) => setQuery(e.target.value.slice(0, 40))}
                    inputMode="text"
                    placeholder="Name or phone number"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>

                <div className="mt-3 flex max-h-[300px] flex-col gap-1 overflow-y-auto">
                  {results.map((c) => (
                    <button
                      key={c.phone}
                      onClick={() => setSelected(c)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {c.initials}
                      </div>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{c.name}</span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">
                          {c.phone} · {c.note}
                        </span>
                      </span>
                    </button>
                  ))}
                  {results.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
                      {isNewNumber
                        ? `Send to new number ${rawNumber}`
                        : "No contacts found. Enter a full 11-digit number."}
                    </p>
                  )}
                </div>
              </>
            )}
          </section>

          {/* RIGHT COLUMN: AMOUNT & NOTE */}
          <div className="flex flex-col gap-5">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-950">
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
              
              {/* Presets */}
              <div className="mt-4 flex flex-wrap gap-2">
                {amountPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className="rounded-full border border-gray-200 px-4 py-1.5 text-xs font-semibold transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                  >
                    ৳{p}
                  </button>
                ))}
              </div>

              {/* Validation Warning */}
              {numericAmount > parseFloat(availableBalance) && (
                <p className="mt-3 text-xs font-medium text-red-500">
                  Amount exceeds available balance.
                </p>
              )}

              <label htmlFor="note" className="mt-6 block text-sm font-semibold">
                Note <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
              </label>
              <input
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 80))}
                placeholder="What's this for?"
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none placeholder:text-gray-400 focus:border-blue-500 dark:border-gray-800 dark:bg-gray-900 dark:placeholder:text-gray-500 dark:focus:border-blue-800"
              />
            </section>

            {/* BALANCE & SUBMIT BUTTON */}
            <div>
              <div className="flex items-center justify-between rounded-3xl border border-gray-200 bg-white px-6 py-4 text-sm dark:border-gray-800 dark:bg-gray-950">
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Wallet className="size-4" /> Available balance
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">৳ {availableBalance}</span>
              </div>

              <button
                onClick={handleContinue}
                disabled={!canContinue}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-600"
              >
                {canContinue ? <Check className="size-4" /> : <ArrowUpRight className="size-4" />}
                Continue to confirm
              </button>
            </div>
          </div>
        </div>
        
      </div>
    </div>
    
  );
}

export default function SendMoneyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 dark:bg-gray-900" />}>
      <SendMoneyContent />
    </Suspense>
  );
}