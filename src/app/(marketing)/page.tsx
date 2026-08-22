import Hero from "@/components/landing/Hero";
import TrustBar from "@/components/landing/TrustBar";
import Stats from "@/components/landing/Stats";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import Testimonials from "@/components/landing/Testimonials";
import Comparison from "@/components/landing/Comparison";
import FAQ from "@/components/landing/FAQ";
import CTA from "@/components/landing/CTA";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Stats />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Comparison />
      <FAQ />
      <CTA />
    </>
  );
}
