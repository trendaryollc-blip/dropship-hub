"use client";

import { use, Suspense, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Shield, Star, MapPin, Clock, Truck, Package,
  CheckCircle2, AlertTriangle, TrendingUp, Award, Mail, Globe,
  MessageSquare,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierProfile } from "@/types/supplier";
import { badgeConfig, ScoreRing, dataSourceConfig } from "@/components/suppliers/supplier-shared";
import { useAPI } from "@/hooks/useAPI";
import { logger } from "@/lib/logger";

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} style={{ width: size, height: size }} className={`shrink-0 ${i <= Math.round(rating) ? "text-amber-400" : "text-muted-foreground/30"}`} fill={i <= Math.round(rating) ? "currentColor" : "none"} />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right min-w-0 truncate max-w-[60%]">{value}</span>
    </div>
  );
}

function ContactForm({ supplierName }: { supplierName: string }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
    quantity: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In production, this would send to an API endpoint
    logger.info("Contact form submitted:", { supplierName, ...formData });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <h4 className="font-display text-lg font-semibold text-foreground mb-2">Message Sent!</h4>
        <p className="text-sm text-muted-foreground mb-4">
          Your inquiry has been sent to {supplierName}. They typically respond within their stated response time.
        </p>
        <button
          onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", company: "", subject: "", message: "", quantity: "" }); }}
          className="text-sm text-accent hover:text-accent/80"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Your Name *</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            placeholder="John Smith"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Email *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            placeholder="john@company.com"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Company</label>
          <input
            type="text"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            placeholder="Your Company LLC"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Quantity Needed</label>
          <input
            type="text"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
            placeholder="e.g., 100-500 units/month"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Subject *</label>
        <input
          type="text"
          required
          value={formData.subject}
          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          placeholder="Product sourcing inquiry"
        />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1.5">Message *</label>
        <textarea
          required
          rows={4}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 resize-none"
          placeholder="Describe what products you're looking for, your target price, and any specific requirements..."
        />
      </div>
      <button
        type="submit"
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all active:scale-[0.98]"
      >
        <Mail className="h-4 w-4" /> Send Inquiry
      </button>
    </form>
  );
}

function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : "bg-amber-500";
  return (
    <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`glass rounded-2xl border border-border p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function SupplierDetailContent({ id }: { id: string }) {
  const { data: supplierData, error: supplierError, isLoading } = useAPI<{ supplier?: SupplierProfile; error?: string }>(`/api/suppliers?id=${encodeURIComponent(id)}`);
  const supplier = supplierData?.supplier || null;
  const error = supplierError?.message || supplierData?.error || null;
  const loading = isLoading;
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const { ref: ctaRef, isInView: ctaVisible } = useInView({ threshold: 0.1 });

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading supplier data...</p>
        </div>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 py-12">
        <Link href="/suppliers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Suppliers
        </Link>
        <div className="glass rounded-2xl border border-border p-6 md:p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">Supplier Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">{error || "The supplier you're looking for doesn't exist."}</p>
          <Link href="/suppliers" className="text-sm text-accent hover:text-accent/80">Browse all suppliers</Link>
        </div>
      </div>
    );
  }

  const badge = badgeConfig[supplier.trustBadge] || badgeConfig.bronze;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 md:pb-24">
      <Link href="/suppliers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Suppliers
      </Link>

      <div ref={heroRef} className={`glass rounded-2xl border border-border p-6 md:p-8 transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="flex items-start gap-4 flex-1">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-lg font-bold text-foreground shrink-0">
              {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div className="space-y-2 min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{supplier.name}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${badge.color} ${badge.border} ${badge.glow}`}>{badge.label} Supplier</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase ${dataSourceConfig[supplier.dataSource].color}`}>{dataSourceConfig[supplier.dataSource].label}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {supplier.flag} {supplier.location}</span>
                <span className="text-xs text-muted-foreground/60">{dataSourceConfig[supplier.dataSource].description}</span>
              </div>
              <div className="flex items-center gap-3">
                <StarRating rating={supplier.stats.rating} size={14} />
                <span className="font-display text-sm font-bold text-foreground">{supplier.stats.rating.toFixed(1)}</span>
                <span className="text-xs text-muted-foreground">({supplier.stats.reviews.toLocaleString()} reviews)</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 shrink-0">
            <ScoreRing score={supplier.stats.reliabilityScore} size={64} />
            <span className="text-[10px] text-muted-foreground">Reliability Score</span>
          </div>
        </div>
        <div ref={ctaRef} className={`mt-6 pt-5 border-t border-border/50 transition-all duration-700 ${ctaVisible ? "opacity-100" : "opacity-0"}`}>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={supplier.sourceUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]">
              <Mail className="h-4 w-4" /> Visit Supplier
            </a>
            {supplier.source === "cj" && (
              <Link href={`/products?q=${encodeURIComponent(supplier.name)}`} className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-surface transition-all">
                <Package className="h-4 w-4" /> Browse Products
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Contact / RFQ Form */}
      <SectionCard delay={75}>
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Mail className="h-4 w-4 text-accent" /> Contact Supplier
        </h3>
        <ContactForm supplierName={supplier.name} />
      </SectionCard>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {([
          { label: "Rating", value: supplier.stats.rating.toFixed(1), icon: Star, color: "text-amber-400" },
          { label: "Reliability", value: `${supplier.stats.reliabilityScore}%`, icon: Shield, color: "text-emerald-400" },
          { label: "Response Time", value: supplier.stats.responseTime, icon: Clock, color: "text-blue-400" },
          { label: "Order Completion", value: `${supplier.stats.orderCompletionRate}%`, icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Dispute Rate", value: `${supplier.stats.disputeRate}%`, icon: AlertTriangle, color: "text-amber-400" },
          { label: "Monthly Orders", value: supplier.stats.monthlyOrders.toLocaleString(), icon: TrendingUp, color: "text-blue-400" },
        ] as const).map((stat, i) => (
          <SectionCard key={stat.label} delay={i * 50}>
            <div className="space-y-2">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="font-display text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          </SectionCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard delay={100}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" /> About
          </h3>
          <div className="space-y-1">
            <Row label="Year Established" value={supplier.stats.yearEstablished} />
            <Row label="Location" value={`${supplier.flag} ${supplier.location}`} />
            <Row label="Specializations" value={supplier.specializations.join(", ")} />
            <Row label="Categories" value={supplier.catalog.categories.length} />
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">{supplier.description}</p>
        </SectionCard>

        <SectionCard delay={150}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-400" /> Shipping & Fulfillment
          </h3>
          <div className="space-y-1">
            <Row label="Shipping Methods" value={supplier.shipping.methods.join(", ")} />
            <Row label="Processing Time" value={supplier.shipping.processingTime} />
            <Row label="Shipping to US" value={`${supplier.stats.shippingDays} days`} />
            <Row label="Shipping to EU" value={`${supplier.stats.shippingDaysEU} days`} />
            <Row label="Free Shipping Threshold" value={supplier.shipping.freeShippingThreshold ? `$${supplier.shipping.freeShippingThreshold}+` : "N/A"} />
            <Row label="Packaging Quality" value={<span className="text-emerald-400 capitalize">{supplier.shipping.packagingQuality}</span>} />
          </div>
        </SectionCard>

        <SectionCard delay={200}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" /> Quality & Trust
          </h3>
          <div className="space-y-1">
            <Row label="Quality Score" value={<span className="text-emerald-400">{supplier.stats.qualityScore}/100</span>} />
            <Row label="Inspection" value={supplier.quality.inspection} />
            <Row label="Return Policy" value={supplier.quality.returnPolicy} />
            <Row label="Refund Policy" value={supplier.quality.refundPolicy} />
            <Row label="Replacement" value={supplier.quality.replacementPolicy} />
            <Row label="Dispute Resolution" value={supplier.quality.disputeResolution} />
            <Row label="Certifications" value={supplier.quality.certifications.join(", ") || "None"} />
          </div>
        </SectionCard>

        <SectionCard delay={250}>
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-400" /> Product Catalog
          </h3>
          <div className="space-y-1">
            <Row label="Total Products" value={supplier.stats.totalProducts.toLocaleString()} />
            <Row label="Categories" value={supplier.catalog.categories.length} />
            <Row label="Price Range" value={`$${supplier.catalog.priceRange.min} - $${supplier.catalog.priceRange.max}`} />
            <Row label="MOQ" value={`${supplier.catalog.moq} unit${supplier.catalog.moq > 1 ? "s" : ""}`} />
            <Row label="Samples" value={supplier.catalog.samplesAvailable ? <span className="text-emerald-400">Available{supplier.catalog.samplePrice ? ` - $${supplier.catalog.samplePrice}` : ""}</span> : "Not available"} />
          </div>
        </SectionCard>
      </div>

      <SectionCard delay={300}>
        <h3 className="font-display text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-blue-400" /> Communication
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Response Rate</span>
              <span className="text-xs font-bold text-foreground">{Math.min(Math.round(supplier.stats.responseTimeHours < 4 ? 95 : supplier.stats.responseTimeHours < 8 ? 85 : 70), 100)}%</span>
            </div>
            <ProgressBar value={supplier.stats.responseTimeHours < 4 ? 95 : supplier.stats.responseTimeHours < 8 ? 85 : 70} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Communication Score</span>
              <span className="text-xs font-bold text-foreground">{supplier.stats.communicationScore}/100</span>
            </div>
            <ProgressBar value={supplier.stats.communicationScore} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Response Time</span>
              <span className="text-xs font-bold text-foreground">{supplier.stats.responseTime}</span>
            </div>
            <div className="glass rounded-lg p-3 mt-1">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-xs text-muted-foreground">Avg. first response</span>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export default function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading supplier...</p>
        </div>
      </div>
    }>
      <SupplierDetailContent id={id} />
    </Suspense>
  );
}
