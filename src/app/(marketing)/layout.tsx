import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollProgress from "@/components/landing/ScrollProgress";
import CursorGlow from "@/components/landing/CursorGlow";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <ScrollProgress />
      <CursorGlow />
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
