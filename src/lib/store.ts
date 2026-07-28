import { AppState, PaymentItem } from "./types";

const STORAGE_KEY = "molov_state";

export function saveState(items: PaymentItem[], imageName: string): void {
  const state: AppState = { items, imageName };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadState(): AppState | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppState;
  } catch {
    return null;
  }
}

export function clearState(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
