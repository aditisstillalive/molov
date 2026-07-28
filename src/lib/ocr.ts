import { PaymentItem } from "./types";

/**
 * Parse OCR raw text into tenant + amount pairs.
 * Handles common payment history formats:
 *   "Tenant Name  100000"   (whitespace-separated)
 *   "Tenant Name: 100000"   (colon-separated)
 *   "Tenant Name - 100000"  (dash-separated)
 *   "100000  Tenant Name"   (amount first)
 * Recognizes amounts with optional currency prefix (Rp, $, IDR) and thousands separators.
 */
export function parseOcrText(raw: string): PaymentItem[] {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: PaymentItem[] = [];

  for (const line of lines) {
    // Skip lines that look like headers/dates/totals
    if (
      /^(total|jumlah|sum|subtotal|grand|page|date|tanggal|period|periode|no\.?|#)/i.test(
        line
      )
    ) {
      continue;
    }

    // Try: "Tenant Name : 100000" or "Tenant Name - 100000"
    const colonDashMatch = line.match(
      /^(.+?)\s*[:=\-–—]\s*(?:Rp\.?\s*|IDR\s*|\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*$/i
    );
    if (colonDashMatch) {
      items.push({
        id: crypto.randomUUID(),
        tenant: colonDashMatch[1].trim(),
        amount: colonDashMatch[2],
      });
      continue;
    }

    // Try: amount at end of line (tenant name then amount)
    const amountAtEnd = line.match(
      /^(.+?)\s+(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*$/
    );
    if (amountAtEnd) {
      items.push({
        id: crypto.randomUUID(),
        tenant: amountAtEnd[1].trim(),
        amount: amountAtEnd[2],
      });
      continue;
    }

    // Try: amount at start of line (amount then tenant name)
    const amountAtStart = line.match(
      /^(?:Rp\.?\s*|IDR\s*|\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s+(.+)$/i
    );
    if (amountAtStart) {
      items.push({
        id: crypto.randomUUID(),
        tenant: amountAtStart[2].trim(),
        amount: amountAtStart[1],
      });
      continue;
    }

    // Fallback: line has any number
    const anyNumber = line.match(/(\d[\d.,]*)/);
    if (anyNumber) {
      const rest = line.replace(anyNumber[0], "").trim();
      if (rest.length > 0) {
        items.push({
          id: crypto.randomUUID(),
          tenant: rest,
          amount: anyNumber[0],
        });
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
  let s = raw.replace(/[^\d.,]/g, "").trim();

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
