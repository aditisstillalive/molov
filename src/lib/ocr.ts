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
 * Parse OCR raw text into tenant + Rp amount pairs.
 *
 * Two-pass approach:
 * 1. Match lines where NAME and RpAMOUNT are on the SAME line
 * 2. For lines with Rp but no name, borrow name from previous non-date line
 */
export function parseOcrText(raw: string): PaymentItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: PaymentItem[] = [];
  let prevName: string | null = null;

  for (const line of lines) {
    // Skip date lines and noise
    if (isDateLine(line)) continue;
    if (/^[^\w]*$/.test(line)) continue;
    if (line.length < 3) continue;

    // Find Rp + digits anywhere in the line
    const rpIdx = line.search(/[-+]?\s*Rp\.?\s*\d/i);

    if (rpIdx === -1) {
      // No Rp on this line — could be a standalone name (all caps or title case)
      // Save it as potential name for next Rp line
      const cleaned = line.replace(/^[^\w\s]+/, "").trim();
      if (
        cleaned.length >= 3 &&
        !/^(Q\s|&|@@|===|©|®|™|Pocket|Search)/i.test(cleaned)
      ) {
        prevName = cleaned;
      }
      continue;
    }

    // Line has Rp — extract name (before Rp) and amount (after Rp)
    const beforeRp = line.slice(0, rpIdx).trim();
    const afterRp = line.slice(rpIdx);

    const amountMatch = afterRp.match(/[-+]?\s*Rp\.?\s*([\d.,]+)/i);
    if (!amountMatch) continue;

    const amount = amountMatch[1];

    // Clean name
    let name = beforeRp.replace(/^[^\w\s]+/, "").trim();

    // If name is too short, borrow from previous line
    if (name.length < 3 && prevName) {
      name = prevName;
    }

    // Skip if name still unusable
    if (name.length < 3) continue;
    if (/^\d{1,2}\s/.test(name)) continue;
    if (/^(Q\s|&|@@|===|©|®|™|Pocket|Search)/i.test(name)) continue;

    items.push({ id: uid(), tenant: name, amount });
    prevName = null; // consumed
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
