'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Store,
  Plus,
  Package,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  Boxes,
  TrendingUp,
  Tag
} from "lucide-react";

interface StoreItem {
  item_id: string;
  merchant_id: string;
  item_name: string;
  description: string;
  price: string;
  stock_quantity: number;
  created_at: string;
}

export default function MerchantStorePage() {
  const router = useRouter();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemStock, setItemStock] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");

    if (!token || (role !== "MERCHANT" && role !== "BUSINESS")) {
      router.push("/login");
      return;
    }

    fetchItems();
  }, [router]);

  const fetchItems = () => {
    const token = sessionStorage.getItem("token");
    setLoading(true);
    fetch("http://localhost:5001/api/merchants/store/items", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
      })
      .catch((err) => console.error("Error fetching store items:", err))
      .finally(() => setLoading(false));
  };

  const openAddModal = () => {
    setEditingItem(null);
    setItemName("");
    setItemDescription("");
    setItemPrice("");
    setItemStock("10");
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: StoreItem) => {
    setEditingItem(item);
    setItemName(item.item_name);
    setItemDescription(item.description || "");
    setItemPrice(item.price);
    setItemStock(item.stock_quantity.toString());
    setModalError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError("");

    const price = parseFloat(itemPrice);
    const stock = parseInt(itemStock, 10);

    if (!itemName.trim() || isNaN(price) || price < 0) {
      setModalError("Please provide a valid product name and non-negative price");
      return;
    }

    setModalLoading(true);
    const token = sessionStorage.getItem("token");

    try {
      const url = editingItem
        ? `http://localhost:5001/api/merchants/store/items/${editingItem.item_id}`
        : "http://localhost:5001/api/merchants/store/items";

      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          item_name: itemName.trim(),
          description: itemDescription.trim() || null,
          price,
          stock_quantity: isNaN(stock) ? 0 : stock
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save item");
      }

      closeModal();
      fetchItems();
    } catch (err: any) {
      setModalError(err.message || "Failed to save item");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const token = sessionStorage.getItem("token");
    try {
      const res = await fetch(`http://localhost:5001/api/merchants/store/items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        fetchItems();
      }
    } catch (err) {
      console.error("Error deleting item:", err);
    }
  };

  const filteredItems = items.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.item_name.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q))
    );
  });

  const totalProducts = items.length;
  const inStockProducts = items.filter((i) => i.stock_quantity > 0).length;
  const outOfStockProducts = items.filter((i) => i.stock_quantity <= 0).length;
  const totalStockUnits = items.reduce((sum, i) => sum + (i.stock_quantity || 0), 0);
  const totalCatalogValue = items.reduce(
    (sum, i) => sum + parseFloat(i.price || "0") * (i.stock_quantity || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-gray-900 dark:text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/70 px-5 py-5 backdrop-blur md:px-10 dark:border-gray-800 dark:bg-gray-950/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/merchant"
              className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">Store Catalog & Inventory</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage products, stock levels and store pricing</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700"
          >
            <Plus className="size-4" />
            <span>Add Product</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-gray-500">Products</p>
            <p className="mt-2 text-2xl font-bold">{totalProducts}</p>
            <p className="mt-1 text-xs text-gray-400">Active catalog items</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-emerald-600 dark:text-emerald-400">In Stock</p>
            <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{inStockProducts}</p>
            <p className="mt-1 text-xs text-gray-400">{totalStockUnits} total units</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-red-600 dark:text-red-400">Out of Stock</p>
            <p className="mt-2 text-2xl font-bold text-red-600 dark:text-red-400">{outOfStockProducts}</p>
            <p className="mt-1 text-xs text-gray-400">Needs restock</p>
          </div>
          <div className="rounded-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
            <p className="text-xs uppercase font-medium tracking-wider text-pink-600 dark:text-pink-400">Catalog Value</p>
            <p className="mt-2 text-2xl font-bold text-pink-600 dark:text-pink-400">৳{totalCatalogValue.toFixed(2)}</p>
            <p className="mt-1 text-xs text-gray-400">At retail price</p>
          </div>
        </div>

        {/* Search */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 bg-white py-2 pl-9 pr-4 text-sm outline-none transition focus:border-pink-500 dark:border-gray-800 dark:bg-gray-950"
            />
          </div>
        </div>

        {/* Product Table / Cards */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-pink-600" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="grid size-14 place-items-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900">
                <Package className="size-7" />
              </div>
              <p className="mt-4 text-base font-semibold">No products found</p>
              <p className="mt-1 text-xs text-gray-500">
                {searchQuery ? "Try a different search term" : "Add your first store product to manage inventory"}
              </p>
              <button
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-pink-700"
              >
                <Plus className="size-3.5" />
                <span>Add Product</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Stock</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredItems.map((item) => (
                    <tr key={item.item_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-pink-100 text-pink-600 dark:bg-pink-950/50 dark:text-pink-400">
                            <Tag className="size-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{item.item_name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        ৳{parseFloat(item.price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {item.stock_quantity} units
                      </td>
                      <td className="px-6 py-4">
                        {item.stock_quantity > 5 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                            In Stock
                          </span>
                        ) : item.stock_quantity > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                            Low Stock ({item.stock_quantity})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-400">
                            Out of Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(item)}
                            className="rounded-xl p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.item_id)}
                            className="rounded-xl p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 dark:border-gray-800">
              <h2 className="text-base font-semibold">
                {editingItem ? "Edit Product" : "Add New Product"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-5 space-y-4">
              {modalError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                  {modalError}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-gray-500">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cotton T-Shirt, Coffee Mug"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Price (৳) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Stock Units</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={itemStock}
                    onChange={(e) => setItemStock(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Description (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Short description or specs"
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm outline-none transition focus:border-pink-500 focus:bg-white dark:border-gray-800 dark:bg-gray-900"
                />
              </div>

              <div className="mt-6 flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-1/2 rounded-2xl border border-gray-200 py-2.5 text-sm font-semibold transition hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="flex w-1/2 items-center justify-center gap-2 rounded-2xl bg-pink-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-pink-600/20 transition hover:bg-pink-700 disabled:opacity-50"
                >
                  {modalLoading && <Loader2 className="size-4 animate-spin" />}
                  <span>{editingItem ? "Update" : "Add Product"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
