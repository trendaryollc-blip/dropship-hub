import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import CursorGlow from "@/components/landing/CursorGlow";
import { AuthProvider } from "@/components/auth/AuthProvider";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="relative min-h-screen overflow-hidden">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg btn-accent focus:text-sm focus:font-semibold"
        >
          Skip to content
        </a>
        <ScrollProgress />
        <CursorGlow />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
