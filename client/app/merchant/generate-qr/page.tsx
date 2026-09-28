'use client';

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  QrCode,
  Store,
  Download,
  ExternalLink,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

interface MerchantProfile {
  full_name: string;
  phone_number: string;
  business_name: string;
}

export default function GenerateQrPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [presetAmount, setPresetAmount] = useState("");
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/merchants/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data: MerchantProfile) => {
        setMerchant(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching merchant profile:", err);
        setLoading(false);
      });
  }, [router]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const params = new URLSearchParams({
    merchant: merchant?.phone_number || "",
    name: merchant?.business_name || merchant?.full_name || "",
    ...(presetAmount ? { amount: presetAmount } : {}),
    ...(note ? { note: note } : {})
  });

  const payUrl = merchant ? `${origin}/make-payment?${params.toString()}` : "";

  function copyLink() {
    if (!payUrl) return;
    navigator.clipboard.writeText(payUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Download QR code as PNG image
  function downloadQr() {
    if (!qrRef.current) return;
    const svgElement = qrRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext("2d");
      if (context) {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 300, 300);
        context.drawImage(image, 25, 25, 250, 250);

        const png = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QuickiePay-QR-${merchant?.phone_number || "merchant"}.png`;
        downloadLink.href = png;
        downloadLink.click();
      }
    };
    image.src = blobURL;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            href="/merchant"
            aria-label="Back to dashboard"
            className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Merchant QR Code</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Display, print, or share your payment code</p>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 py-8">
        <section className="flex flex-col items-center rounded-3xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-950 shadow-sm">
          {loading ? (
            <p className="py-16 text-sm text-gray-500 dark:text-gray-400">Loading your QR code...</p>
          ) : !merchant ? (
            <p className="py-16 text-sm text-red-500">Couldn&apos;t load your merchant profile.</p>
          ) : (
            <>
              <div className="grid size-14 place-items-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400">
                <Store className="size-7" />
              </div>
              <p className="mt-4 text-base font-semibold">{merchant.business_name || merchant.full_name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Merchant Account: {merchant.phone_number}</p>

              {/* Dynamic QR SVG */}
              <div ref={qrRef} className="mt-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white">
                <QRCodeSVG value={payUrl || "quickiepay"} size={220} level="M" marginSize={2} />
              </div>

              {presetAmount && (
                <div className="mt-3 inline-block rounded-full bg-pink-50 px-3 py-1 text-xs font-bold text-pink-600 dark:bg-pink-950/40 dark:text-pink-400">
                  Fixed Amount: ৳{parseFloat(presetAmount).toFixed(2)}
                </div>
              )}

              <p className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <QrCode className="size-4 text-pink-600" /> 
                Customers scan this with their phone camera or QuickiePay scanner to pay instantly
              </p>

              {/* Optional Fixed Amount & Note for invoice QR */}
              <div className="mt-6 w-full text-left space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                <label className="text-xs font-semibold text-gray-500">Customize QR (Optional)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Set Amount (৳)"
                    value={presetAmount}
                    onChange={(e) => setPresetAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                  <input
                    type="text"
                    placeholder="Table / Memo"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex w-full flex-col gap-2.5">
                <button
                  onClick={downloadQr}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700"
                >
                  <Download className="size-4" />
                  <span>Download QR Image (PNG)</span>
                </button>

                <div className="flex gap-2 w-full">
                  <button
                    onClick={copyLink}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 py-3 text-xs font-semibold transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Copied" : "Copy Link"}</span>
                  </button>

                  <Link
                    href={payUrl.replace(origin, "") || "/make-payment"}
                    target="_blank"
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-gray-200 py-3 text-xs font-semibold transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                  >
                    <ExternalLink className="size-3.5 text-pink-600" />
                    <span>Customer View</span>
                  </Link>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
