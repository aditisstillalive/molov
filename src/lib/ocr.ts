import { PaymentItem } from "./types";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

const MONTHS = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

function isDateLine(line: string): boolean {
  return MONTHS.test(line) && /\d{4}/.test(line);
}

/**
 * Fix common OCR misreads in amount strings.
 * "%" is commonly misread for "9" in OCR.
 */
function fixOcrAmount(raw: string): string {
  return raw
    .replace(/%/g, "9") // % → 9 (most common OCR error in digits)
    .replace(/[oO]/g, "0") // o/O → 0
    .replace(/[lI|]/g, "1") // l/I/| → 1
    .replace(/[sS]/g, "5") // s/S → 5 (less common, safe in numeric context)
    .replace(/[^-\d.,]/g, ""); // strip anything else non-numeric
}

/**
 * Parse OCR raw text into tenant + Rp amount pairs.
 *
 * Two-pass:
 * 1. Lines with NAME and RpAMOUNT on same line → extract both
 * 2. Standalone name lines → saved, paired with next Rp line that lacks a name
 *
 * Amount capture is permissive — grabs everything after Rp, then cleans OCR errors.
 */
export function parseOcrText(raw: string): PaymentItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: PaymentItem[] = [];
  let prevName: string | null = null;

  for (const line of lines) {
    if (isDateLine(line)) continue;
    if (/^[^\w]*$/.test(line)) continue;
    if (line.length < 3) continue;

    // Find "Rp" anywhere in the line
    const rpIdx = line.search(/[-+]?\s*Rp\.?\s*/i);

    if (rpIdx === -1) {
      // No Rp — could be standalone name for next line
      const cleaned = line.replace(/^[^\w\s]+/, "").trim();
      if (
        cleaned.length >= 3 &&
        !/^(Q\s|&|@@|===|©|®|™|Pocket|Search)/i.test(cleaned)
      ) {
        prevName = cleaned;
      }
      continue;
    }

    // Line has Rp — extract name (before Rp) and raw amount (after Rp)
    const beforeRp = line.slice(0, rpIdx).trim();
    const afterRp = line.slice(rpIdx);

    // Permissive capture: grab everything after Rp, then clean
    const rawAmount = afterRp.replace(/^[-+]?\s*Rp\.?\s*/i, "").trim();
    const amount = fixOcrAmount(rawAmount);

    // Must have at least some digits after cleaning
    if (!/\d/.test(amount)) continue;

    let name = beforeRp.replace(/^[^\w\s]+/, "").trim();

    // Borrow name from previous line if current name too short
    if (name.length < 3 && prevName) {
      name = prevName;
    }

    if (name.length < 3) continue;
    if (/^\d{1,2}\s/.test(name)) continue;
    if (/^(Q\s|&|@@|===|©|®|™|Pocket|Search)/i.test(name)) continue;

    items.push({ id: uid(), tenant: name, amount });
    prevName = null;
  }

  return items;
}

/**
 * Normalize amount string to a clean number for totaling.
 * Handles Indonesian format (1.286.056), European (1.000,00), and US (1,000.00).
 */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d.,-]/g, "").trim();
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const dotParts = s.split(".").length;
  const commaParts = s.split(",").length;

  if (lastComma > lastDot) {
    s = s.replace(/\./g, "");
    if (commaParts === 2 && s.slice(-3).includes(",")) {
      s = s.replace(/,(\d{1,2})$/, ".$1");
    }
  } else if (lastDot > lastComma) {
    const lastSegment = s.slice(lastDot + 1);
    if (dotParts > 2 || lastSegment.length === 3) {
      s = s.replace(/\./g, "");
    }
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
