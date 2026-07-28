import { PaymentItem } from "./types";

function uid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Fallback for environments without crypto
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Parse OCR raw text from payment history screenshot.
 *
 * Primary format (GoPay/Bibit mobile):
 *   TENANT NAME -RpAMOUNT      ← keep
 *   DD Mon YYYY Category       ← skip (date/category line)
 *
 * Falls back to any line containing "Rp" + digits.
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
    // Skip date lines: "28 Jul 2026 Outgoing"
    if (months.test(line) && /\d{4}/.test(line)) continue;

    // Skip UI noise / garbled OCR fragments
    if (/^[^\w]*$/.test(line)) continue;
    if (/^(Q\s|&|@@|===|©|®|™)/.test(line)) continue;
    if (line.length < 5) continue;

    // Primary: "NAME [+-]RpAMOUNT"
    const mainMatch = line.match(
      /^(.+?)\s+([+-])\s*Rp\s*([\d.,]+)\s*$/i
    );
    if (mainMatch) {
      const name = mainMatch[1].trim();
      if (/^\d{1,2}\s/.test(name)) continue; // looks like date fragment
      items.push({ id: uid(), tenant: name, amount: mainMatch[3] });
      continue;
    }

    // Secondary: colon/dash separated "NAME : Rp AMOUNT"
    const sepMatch = line.match(
      /^(.+?)\s*[:=\-–—]\s*(?:Rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*$/i
    );
    if (sepMatch) {
      const name = sepMatch[1].trim();
      if (/^\d{1,2}\s/.test(name)) continue;
      items.push({ id: uid(), tenant: name, amount: sepMatch[2] });
      continue;
    }

    // Fallback: any line containing Rp followed by a number
    const rpMatch = line.match(/^(.+?)\s*[-+]?\s*Rp\.?\s*([\d.,]+)\s*$/i);
    if (rpMatch) {
      const name = rpMatch[1].trim();
      if (/^\d{1,2}\s/.test(name)) continue;
      if (name.length >= 3) {
        items.push({ id: uid(), tenant: name, amount: rpMatch[2] });
      }
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
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && s.split(".").length > 2) {
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
