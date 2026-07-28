import { PaymentItem } from "./types";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Parse OCR raw text from payment history screenshot.
 *
 * GoPay/Bibit format:
 *   TENANT NAME -RpAMOUNT
 *   DD Mon YYYY Category  ← skipped
 *
 * Falls back to any line containing "Rp" + number.
 */
export function parseOcrText(raw: string): PaymentItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: PaymentItem[] = [];
  const months =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

  for (const line of lines) {
    // Skip date lines and UI noise
    if (months.test(line) && /\d{4}/.test(line)) continue;
    if (/^[^\w]*$/.test(line)) continue;
    if (line.length < 5) continue;

    // Strategy: find any "Rp" + digits, split around it
    const rpIdx = line.search(/[-+]?\s*Rp\.?\s*\d/i);
    if (rpIdx === -1) continue;

    const beforeRp = line.slice(0, rpIdx).trim();
    const afterRp = line.slice(rpIdx).trim();

    // Extract name and signed amount
    const amountMatch = afterRp.match(/[-+]?\s*Rp\.?\s*([\d.,]+)/i);
    if (!amountMatch) continue;

    const amount = amountMatch[1];

    // Clean up name: remove leading noise chars like oo), (), J, ca, (0), etc.
    let name = beforeRp.replace(/^[^\w\s]+/, "").trim();

    // Skip if name looks like a date fragment or is too short
    if (/^\d{1,2}\s/.test(name)) continue;
    if (name.length < 3) continue;

    // Skip known UI noise names
    if (/^(Q\s|&|@@|===|©|®|™|Pocket|Search)/i.test(name)) continue;

    items.push({ id: uid(), tenant: name, amount });
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
    // European/Indonesian decimal: 1.000,00 or 1.286.056,50
    // Commas separate decimals OR are thousands — check parts
    s = s.replace(/\./g, ""); // remove thousand dots
    if (commaParts === 2 && s.slice(-3).includes(",")) {
      // Last comma is decimal separator: ,00
      s = s.replace(/,(\d{1,2})$/, ".$1");
    }
    // Otherwise comma was thousands, already removed with dots above
  } else if (lastDot > lastComma) {
    // Dots could be thousands (1.286.056, 100.000) or decimal (1286.50)
    const lastSegment = s.slice(lastDot + 1);
    if (dotParts > 2 || lastSegment.length === 3) {
      // Multiple dots or 3-digit end = thousands separators → strip all dots
      s = s.replace(/\./g, "");
    }
    // else: single dot, non-3-digit end = decimal (1286.50), keep as is
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
