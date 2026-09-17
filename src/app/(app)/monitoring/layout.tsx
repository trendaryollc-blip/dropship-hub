import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Price Monitor — DropShip Hub",
  description: "Track price changes, stock status, and get alerts on your monitored products.",
};

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
