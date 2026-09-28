'use client';

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  X,
  QrCode,
  AlertCircle,
  CheckCircle2,
  Store,
  Sparkles,
  RefreshCw,
  Loader2
} from "lucide-react";
import jsQR from "jsqr";

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (data: { merchant: string; amount?: string; name?: string; invoice?: string }) => void;
}

export default function QrScannerModal({ isOpen, onClose, onScanSuccess }: QrScannerModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"camera" | "upload" | "demo">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [uploadLoading, setUploadLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Helper to parse scanned QR payload (URL, JSON, or plain text)
  const parseQrPayload = useCallback((raw: string) => {
    try {
      // 1. Try URL parsing (e.g. http://localhost:3000/make-payment?merchant=017...&amount=250&name=Shop)
      if (raw.includes("make-payment") || raw.startsWith("http://") || raw.startsWith("https://")) {
        const url = new URL(raw, window.location.origin);
        const merchant = url.searchParams.get("merchant") || url.searchParams.get("phone") || "";
        const amount = url.searchParams.get("amount") || "";
        const name = url.searchParams.get("name") || "";
        const invoice = url.searchParams.get("invoice") || "";

        if (merchant) {
          return { merchant, amount, name, invoice, raw };
        }
      }

      // 2. Try JSON parsing (e.g. {"merchant": "017...", "amount": "250"})
      if (raw.startsWith("{") && raw.endsWith("}")) {
        const obj = JSON.parse(raw);
        if (obj.merchant || obj.phone) {
          return {
            merchant: obj.merchant || obj.phone,
            amount: obj.amount ? obj.amount.toString() : "",
            name: obj.name || obj.business_name || "",
            invoice: obj.invoice || "",
            raw
          };
        }
      }

      // 3. Fallback: plain 11-digit phone number
      const phoneDigits = raw.replace(/\D/g, "");
      if (phoneDigits.length === 11) {
        return { merchant: phoneDigits, amount: "", name: "Merchant", raw };
      }
    } catch (e) {
      console.error("Error parsing QR payload:", e);
    }
    return { merchant: raw.replace(/\D/g, ""), amount: "", name: "", raw };
  }, []);

  const handleScanSuccess = useCallback((result: any) => {
    stopCamera();
    setScannedResult(result);

    if (onScanSuccess) {
      onScanSuccess(result);
    } else {
      // Default: Navigate directly to /make-payment
      const params = new URLSearchParams({
        merchant: result.merchant,
        ...(result.amount ? { amount: result.amount } : {}),
        ...(result.name ? { name: result.name } : {}),
        ...(result.invoice ? { invoice: result.invoice } : {})
      });
      router.push(`/make-payment?${params.toString()}`);
      onClose();
    }
  }, [onScanSuccess, router, onClose]);

  // Frame scanner loop
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data) {
        const parsed = parseQrPayload(code.data);
        if (parsed.merchant) {
          handleScanSuccess(parsed);
          return;
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(scanFrame);
  }, [parseQrPayload, handleScanSuccess]);

  // Start Camera
  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraActive(false);

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError("Camera access is not supported by your browser");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // iOS compatibility
        await videoRef.current.play();
        setCameraActive(true);
        animFrameRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in browser settings or upload a QR image."
          : "Could not access camera. Please upload an image or choose demo scan."
      );
    }
  }, [scanFrame]);

  // Stop Camera
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  // Handle Tab Switch
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (activeTab === "camera") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Handle image upload and scan
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setUploadLoading(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        setUploadLoading(false);
        if (code && code.data) {
          const parsed = parseQrPayload(code.data);
          if (parsed.merchant) {
            handleScanSuccess(parsed);
            return;
          }
        }
        alert("No valid QuickiePay Merchant QR code was detected in this image. Please try another image.");
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
              <QrCode className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight">Scan Merchant QR</h2>
              <p className="text-xs text-gray-500">Pay directly by scanning merchant code</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-100 bg-gray-50 p-1.5 dark:border-gray-800 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "camera"
                ? "bg-white text-pink-600 shadow-sm dark:bg-gray-950 dark:text-pink-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Camera className="size-3.5" />
            <span>Camera Scan</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "upload"
                ? "bg-white text-pink-600 shadow-sm dark:bg-gray-950 dark:text-pink-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Upload className="size-3.5" />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("demo")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold transition ${
              activeTab === "demo"
                ? "bg-white text-pink-600 shadow-sm dark:bg-gray-950 dark:text-pink-400"
                : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>Quick Test</span>
          </button>
        </div>

        {/* Tab 1: Live Camera View */}
        {activeTab === "camera" && (
          <div className="p-6 text-center">
            {cameraError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-600 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                <AlertCircle className="mx-auto mb-2 size-6" />
                <p className="font-semibold">Camera Unavailable</p>
                <p className="mt-1">{cameraError}</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-3.5 py-1.5 font-semibold text-white shadow-sm transition hover:bg-pink-700"
                >
                  <Upload className="size-3.5" />
                  <span>Upload QR Screenshot Instead</span>
                </button>
              </div>
            ) : (
              <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-3xl border-2 border-pink-500 bg-black shadow-inner">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Animated Scanner Reticle / Laser Line */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8">
                  <div className="relative h-full w-full rounded-2xl border-2 border-dashed border-white/60">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-pink-500 shadow-[0_0_8px_#ec4899] animate-bounce" />
                  </div>
                </div>

                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-gray-400">
                    <Loader2 className="size-7 animate-spin text-pink-500" />
                    <span className="mt-2 text-xs">Accessing camera...</span>
                  </div>
                )}
              </div>
            )}

            <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
              Align the merchant&apos;s QuickiePay QR code inside the frame to pay
            </p>
          </div>
        )}

        {/* Tab 2: Upload Image */}
        {activeTab === "upload" && (
          <div className="p-6 text-center">
            <label className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 cursor-pointer transition hover:border-pink-500 hover:bg-pink-50/20 dark:border-gray-700 dark:bg-gray-900">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="grid size-12 place-items-center rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
                {uploadLoading ? (
                  <Loader2 className="size-6 animate-spin" />
                ) : (
                  <Upload className="size-6" />
                )}
              </div>
              <p className="mt-4 text-sm font-semibold">Choose QR Code Photo</p>
              <p className="mt-1 text-xs text-gray-500">
                Upload a screenshot, downloaded QR image, or photo from gallery
              </p>
            </label>
          </div>
        )}

        {/* Tab 3: Demo / Fast Test Merchants */}
        {activeTab === "demo" && (
          <div className="p-6 space-y-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select an active store to simulate instant QR scan without camera:
            </p>

            {/* Test Merchant Card 1 */}
            <button
              type="button"
              onClick={() =>
                handleScanSuccess({
                  merchant: "01700000000",
                  amount: "150.00",
                  name: "Quickie SuperShop",
                  invoice: "INV-DEMO-99"
                })
              }
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition hover:border-pink-300 hover:bg-pink-50/30 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-pink-600 text-white">
                  <Store className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">Quickie SuperShop</p>
                  <p className="text-[11px] text-gray-500">01700000000 · Bill: ৳150.00</p>
                </div>
              </div>
              <span className="rounded-xl bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
                Scan Code
              </span>
            </button>

            {/* Test Merchant Card 2 */}
            <button
              type="button"
              onClick={() =>
                handleScanSuccess({
                  merchant: "01800000000",
                  amount: "320.00",
                  name: "Cafe Bistro",
                  invoice: "INV-DINNER-44"
                })
              }
              className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-3.5 text-left transition hover:border-pink-300 hover:bg-pink-50/30 dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-purple-600 text-white">
                  <Store className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-white">Cafe Bistro & Bakery</p>
                  <p className="text-[11px] text-gray-500">01800000000 · Bill: ৳320.00</p>
                </div>
              </div>
              <span className="rounded-xl bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-600 dark:bg-purple-950/50 dark:text-purple-400">
                Scan Code
              </span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
