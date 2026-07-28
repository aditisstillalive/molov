"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadState, saveState } from "@/lib/store";
import type { PaymentItem } from "@/lib/types";
import Stepper from "@/components/Stepper";

export default function ReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [imageName, setImageName] = useState("");
  const [rawText, setRawText] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const state = loadState();
    if (state) {
      setItems(state.items);
      setImageName(state.imageName);
      if (state.rawText) setRawText(state.rawText);
    }
    setLoaded(true);
  }, []);

  function handleChange(
    id: string,
    field: "tenant" | "amount",
    value: string
  ) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleAdd() {
    setItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), tenant: "", amount: "" },
    ]);
  }

  function handleNext() {
    saveState(items, imageName);
    router.push("/summary");
  }

  if (!loaded) {
    return (
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <Stepper current={1} />
        <p className="text-gray-500 mt-8 text-center">Loading...</p>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <Stepper current={1} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            No Items Found
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            No payment items were detected from the image. You can add items
            manually below.
          </p>
          <button
            onClick={handleAdd}
            className="w-full py-2.5 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors mb-3"
          >
            + Add Item Manually
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full py-2.5 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            ← Upload Different Image
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8 min-h-0">
      <Stepper current={1} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8 flex flex-col min-h-0 flex-1">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Review Items</h1>
            {imageName && (
              <p className="text-xs text-gray-400 mt-0.5">
                From: {imageName} · {items.length} items
              </p>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
          >
            + Add
          </button>
        </div>

        <p className="text-gray-500 text-sm mb-4 shrink-0">
          Edit or delete items as needed.
        </p>

        {/* Raw OCR debug */}
        {rawText && (
          <div className="mb-4 shrink-0">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showRaw ? "▲ Hide" : "▼ Show"} raw OCR text
            </button>
            {showRaw && (
              <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs text-gray-600 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-gray-200">
                {rawText}
              </pre>
            )}
          </div>
        )}

        {/* Items — scrollable */}
        <div className="space-y-3 mb-4 overflow-y-auto min-h-0">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200"
            >
              <input
                type="text"
                value={item.tenant}
                onChange={(e) =>
                  handleChange(item.id, "tenant", e.target.value)
                }
                placeholder="Tenant name"
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <input
                type="text"
                value={item.amount}
                onChange={(e) =>
                  handleChange(item.id, "amount", e.target.value)
                }
                placeholder="Amount"
                className="w-28 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              />
              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
                title="Delete item"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.push("/")}
          className="flex-1 py-3 rounded-lg font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          ← Back
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          Next →
        </button>
      </div>
    </main>
  );
}
