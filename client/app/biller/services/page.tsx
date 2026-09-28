'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, Plus, CheckCircle2, AlertCircle, Building2 } from "lucide-react";

interface ServiceItem {
  service_id: string;
  service_name: string;
  organization_name: string;
}

const serviceCategories = [
  "ELECTRICITY",
  "GAS",
  "WATER",
  "INTERNET",
  "MOBILE",
  "EDUCATION",
  "INSURANCE",
  "OTHER"
];

export default function BillerServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState(serviceCategories[0]);
  const [orgName, setOrgName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const loadProfile = () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    fetch("http://localhost:5001/api/billers/profile", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.services)) {
          setServices(data.services);
        }
      })
      .catch((err) => console.error("Error loading services:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
  }, [router]);

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!orgName.trim()) {
      setMessage({ text: "Please enter an organization name", type: "error" });
      return;
    }

    setSaving(true);
    const token = sessionStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5001/api/billers/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          service_name: selectedService,
          organization_name: orgName.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setShowAddModal(false);
        setOrgName("");
        loadProfile();
      } else {
        setMessage({ text: data.error || "Failed to add service", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-900/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/biller"
              aria-label="Back to Biller Dashboard"
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Registered Services</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Utility branches and services active for collection
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700"
          >
            <Plus className="size-4" /> Add Service
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
        {loading ? (
          <p className="py-16 text-center text-sm text-gray-500">Loading services...</p>
        ) : services.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-12 text-center dark:border-gray-800 dark:bg-gray-900">
            <Zap className="mx-auto size-12 text-purple-500 opacity-60" />
            <h2 className="mt-4 text-base font-bold">No Services Configured</h2>
            <p className="mt-1 text-xs text-gray-500">
              Register utility categories so customers can find and pay your company online.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              <Plus className="size-4" /> Add Your First Service
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <div
                key={svc.service_id}
                className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition hover:border-purple-300 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="grid size-10 place-items-center rounded-2xl bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300">
                  <Zap className="size-5" />
                </div>
                <h3 className="mt-4 text-base font-bold text-gray-900 dark:text-white">
                  {svc.organization_name}
                </h3>
                <span className="mt-1 inline-block rounded-full bg-purple-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {svc.service_name}
                </span>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Active for consumer payments
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Modal to add service */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <h2 className="text-lg font-bold">Add Utility Service</h2>
              <p className="mt-1 text-xs text-gray-500">Add a new organization listing for customer bill payments.</p>

              <form onSubmit={handleAddService} className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">Service Category</label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  >
                    {serviceCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500">Organization Name</label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. DESCO Dhaka North"
                    required
                    className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-800"
                  />
                </div>

                {message.text && (
                  <p className="text-xs text-red-500">{message.text}</p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Add Service"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
