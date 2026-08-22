import Link from "next/link";
import { Zap } from "lucide-react";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Calculator", href: "/calculator" },
  ],
  Tools: [
    { label: "Product Search", href: "/products" },
    { label: "Supplier Finder", href: "/suppliers" },
    { label: "Competitor Research", href: "/competitors" },
    { label: "AI Assistant", href: "/ai" },
  ],
  Account: [
    { label: "Sign In", href: "/sign-in" },
    { label: "Create Account", href: "/sign-up" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "Settings", href: "/settings" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
                <Zap className="h-4 w-4 text-accent" />
              </div>
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                DropShip<span className="text-accent">Hub</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              The all-in-one ecommerce toolkit for modern dropshippers. Find
              products, analyze competitors, and maximize profits.
            </p>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <p className="font-display text-sm font-semibold text-foreground mb-4">
                {category}
              </p>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} DropShip Hub. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/sign-in" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
