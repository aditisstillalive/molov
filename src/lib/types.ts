export interface PaymentItem {
  id: string;
  tenant: string;
  amount: string; // raw string from OCR, editable
}

export interface AppState {
  items: PaymentItem[];
  imageName: string;
  rawText?: string;
}
