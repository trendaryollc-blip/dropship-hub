import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — DropShip Hub",
  description:
    "Start free with DropShip Hub. Pro is $49/mo and Enterprise is $199/mo, with yearly discounts. Cancel anytime from your billing settings.",
  openGraph: {
    title: "Pricing — DropShip Hub",
    description:
      "Start free with DropShip Hub. Pro is $49/mo and Enterprise is $199/mo, with yearly discounts. Cancel anytime.",
    url: "/pricing",
    siteName: "DropShip Hub",
    type: "website",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
