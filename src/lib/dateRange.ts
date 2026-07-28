export type DateRangePreset = "today" | "7d" | "30d" | "custom";

export interface ComputedRange {
  from?: string;
  to?: string;
}

export function computeDateRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): ComputedRange {
  const now = new Date();

  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString() };
  }
  if (preset === "7d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { from: start.toISOString() };
  }
  if (preset === "30d") {
    const start = new Date(now);
    start.setDate(start.getDate() - 30);
    return { from: start.toISOString() };
  }

  const from = customFrom ? new Date(`${customFrom}T00:00:00`).toISOString() : undefined;
  const to = customTo ? new Date(`${customTo}T23:59:59`).toISOString() : undefined;
  return { from, to };
}
