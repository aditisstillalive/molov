"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadState, clearState } from "@/lib/store";
import { parseAmount } from "@/lib/ocr";
import type { PaymentItem } from "@/lib/types";
import Stepper from "@/components/Stepper";

export default function SummaryPage() {
  const router = useRouter();
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [imageName, setImageName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const state = loadState();
    if (state) {
      setItems(state.items);
      setImageName(state.imageName);
    }
    setLoaded(true);
  }, []);

  const total = items.reduce((sum, item) => sum + parseAmount(item.amount), 0);

  async function handleSubmit() {
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, imageName, total }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }

      setSent(true);
      clearState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  if (!loaded) {
    return (
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <Stepper current={2} />
        <p className="text-gray-500 mt-8 text-center">Loading...</p>
      </main>
    );
  }

  if (sent) {
    return (
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <Stepper current={2} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mt-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Email Sent!
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            Summary has been sent to the configured recipients.
          </p>
          <a
            href="/"
            className="inline-block py-2.5 px-8 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Upload Another
          </a>
        </div>
      </main>
    );
  }

  if (items.length === 0) {
    return (
      <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
        <Stepper current={2} />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Items</h1>
          <p className="text-gray-500 text-sm mb-4">No items to summarize.</p>
          <a
            href="/"
            className="inline-block w-full py-2.5 rounded-lg font-semibold text-center text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            ← Upload Image
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
      <Stepper current={2} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Summary</h1>
        <p className="text-gray-500 text-sm mb-4">
          Review the final list and submit to email the summary.
        </p>

        {/* Items table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                  Tenant
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600 w-36">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-4 py-2.5 text-gray-900">{item.tenant}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                    Rp {parseAmount(item.amount).toLocaleString("id-ID")}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <td className="px-4 py-2.5 text-gray-900">Total</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-900">
                  Rp {total.toLocaleString("id-ID")}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => router.push("/review")}
          disabled={sending}
          className="flex-1 py-3 rounded-lg font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={sending}
          className="flex-1 py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:text-gray-500"
        >
          {sending ? "Sending..." : "Submit & Send Email"}
        </button>
      </div>
    </main>
  );
}
