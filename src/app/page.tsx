"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorker } from "tesseract.js";
import { parseOcrText } from "@/lib/ocr";
import { saveState } from "@/lib/store";
import Stepper from "@/components/Stepper";

export default function UploadPage() {
  const router = useRouter();
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [error, setError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleNext() {
    if (!image) return;
    setProcessing(true);
    setError("");

    try {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgressLabel("Recognizing text...");
            setProgress(Math.round(m.progress * 100));
          } else if (m.status === "loading tesseract core") {
            setProgressLabel("Loading OCR engine...");
            setProgress(10);
          } else if (m.status === "initializing tesseract") {
            setProgressLabel("Initializing...");
            setProgress(20);
          } else if (m.status === "loading language traineddata") {
            setProgressLabel("Loading language data...");
            setProgress(30);
          }
        },
      });

      const {
        data: { text },
      } = await worker.recognize(image);
      await worker.terminate();

      const items = parseOcrText(text);
      saveState(items, image.name);
      router.push("/review");
    } catch (err) {
      setError(
        "OCR processing failed. You can still proceed and add items manually."
      );
      console.error(err);
      saveState([], image.name);
      setProcessing(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4 py-8">
      <Stepper current={0} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Upload Payment History
        </h1>
        <p className="text-gray-500 text-sm mb-6">
          Upload an image of the payment history to extract tenant names and
          amounts.
        </p>

        {/* Upload area */}
        <label
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-indigo-400 ${
            preview
              ? "border-emerald-400 bg-emerald-50/50"
              : "border-gray-300 bg-gray-50/50"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={processing}
          />
          {preview ? (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Preview"
                className="max-h-64 mx-auto rounded-lg shadow"
              />
              <p className="text-sm text-gray-500 mt-3">
                Click to change image
              </p>
            </div>
          ) : (
            <div className="text-gray-400">
              <svg
                className="w-12 h-12 mx-auto mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="font-medium text-gray-600">Click to upload image</p>
              <p className="text-sm">PNG, JPG, or JPEG</p>
            </div>
          )}
        </label>

        {/* Progress */}
        {processing && (
          <div className="mt-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              {progressLabel} ({progress}%)
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 text-amber-800 text-sm border border-amber-200">
            {error}
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="mt-6">
        <button
          onClick={handleNext}
          disabled={!image || processing}
          className="w-full py-3 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
        >
          {processing ? "Processing..." : "Next →"}
        </button>
      </div>
    </main>
  );
}
