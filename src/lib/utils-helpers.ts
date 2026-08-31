export function safeNum(val: unknown, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

export function safeStr(val: unknown, fallback = ""): string {
  if (typeof val === "string") return val;
  if (val != null) return String(val);
  return fallback;
}
