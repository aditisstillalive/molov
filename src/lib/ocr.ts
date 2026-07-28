import { PaymentItem } from "./types";

/**
 * Parse OCR raw text from payment history screenshot.
 *
 * Expected format (GoPay/Bibit mobile):
 *   TENANT NAME -RpAMOUNT      ← keep (name + signed Rp amount)
 *   DD Mon YYYY Category       ← skip (date/category line)
 *   noise) DD Mon YYYY ...     ← skip (noise + date)
 *
 * Also handles generic formats as fallback.
 */
export function parseOcrText(raw: string): PaymentItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: PaymentItem[] = [];

  // Month names for date detection
  const months =
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

  for (const line of lines) {
    // Skip date lines: "28 Jul 2026 Outgoing", "DD Mon YYYY Category"
    if (months.test(line) && /\d{4}/.test(line)) {
      continue;
    }

    // Skip UI noise / garbled OCR
    if (/^[^\w]*$/.test(line)) continue;
    if (/^(Q\s|&|@@|===|©|®|™)/.test(line)) continue;
    if (line.length < 5) continue;

    // Primary match: "NAME [+-]RpAMOUNT" — the exact GoPay/Bibit format
    const mainMatch = line.match(
      /^(.+?)\s+([+-])\s*Rp\s*([\d.,]+)\s*$/i
    );
    if (mainMatch) {
      const name = mainMatch[1].trim();
      const sign = mainMatch[2];
      const amount = mainMatch[3];
      // Skip if name looks like a date fragment
      if (/^\d{1,2}\s/.test(name)) continue;
      items.push({
        id: crypto.randomUUID(),
        tenant: name,
        amount: sign === "-" ? amount : amount, // keep both + and -
      });
      continue;
    }

    // Secondary: "NAME : RpAMOUNT" or "NAME - RpAMOUNT" (colon/dash separated)
    const sepMatch = line.match(
      /^(.+?)\s*[:=\-–—]\s*(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*$/i
    );
    if (sepMatch) {
      const name = sepMatch[1].trim();
      if (/^\d{1,2}\s/.test(name)) continue;
      items.push({
        id: crypto.randomUUID(),
        tenant: name,
        amount: sepMatch[2],
      });
      continue;
    }
  }

  return items;
}

/**
 * Normalize amount string to a clean number for totaling.
 * Handles Indonesian/European format (1.000,00) and standard format (1,000.00).
 */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d.,-]/g, "").trim();

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > lastDot) {
    // Indonesian/European: 1.000,00 → 1000.00
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && s.split(".").length > 2) {
    // US with thousands separators: 1,000.00
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
