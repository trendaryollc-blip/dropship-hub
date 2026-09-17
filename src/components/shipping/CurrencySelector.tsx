"use client";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
];

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
}

export default function CurrencySelector({ value, onChange }: CurrencySelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 bg-surface border border-white/10 rounded-lg text-[10px] text-foreground focus:outline-none focus:border-accent"
    >
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>{c.symbol} {c.code}</option>
      ))}
    </select>
  );
}

export function formatCurrency(amount: number, currency: string): string {
  const c = CURRENCIES.find((c) => c.code === currency);
  if (!c) return `$${amount.toFixed(2)}`;
  if (currency === "JPY") return `${c.symbol}${Math.round(amount).toLocaleString()}`;
  return `${c.symbol}${amount.toFixed(2)}`;
}
