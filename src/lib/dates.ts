/**
 * Date helpers tolerant of every shape timestamps take across our stack:
 * ISO strings, epoch millis, Date instances, live Firestore Timestamp class
 * instances (via toDate()), and the plain `{type, seconds, nanoseconds}`
 * objects Timestamps become after JSON serialization in API responses.
 *
 * Client-side types often declare these fields as `string`, but API responses
 * deliver serialized Timestamp objects — always parse through toDate() instead
 * of `new Date(value)` to avoid rendering "Invalid Date".
 */

export type DateLike =
  | string
  | number
  | Date
  | { seconds?: number; nanoseconds?: number; toDate?: () => Date }
  | null
  | undefined;

export function toDate(value: DateLike): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value.toDate === "function") {
    try {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
    } catch {
      return null;
    }
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000);
  }
  return null;
}

export function formatDate(value: DateLike): string {
  const date = toDate(value);
  return date ? date.toLocaleDateString() : "";
}

export function formatDateTime(value: DateLike): string {
  const date = toDate(value);
  return date ? date.toLocaleString() : "";
}

export function toIsoString(value: DateLike): string {
  const date = toDate(value);
  return date ? date.toISOString() : "";
}