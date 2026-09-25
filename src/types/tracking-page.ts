import { Timestamp } from "firebase/firestore";

// ── Tracking Page Types ──────────────────────────────────────────────────────

export type TrackingPageTemplate = "modern" | "minimal" | "bold" | "elegant" | "playful";
export type TrackingStatus = "ordered" | "processing" | "shipped" | "in_transit" | "out_for_delivery" | "delivered" | "exception";

export interface TrackingPageConfig {
  id: string;
  publicId?: string;
  storeId: string;
  storeName: string;
  template: TrackingPageTemplate;
  branding: BrandingConfig;
  upsells: UpsellSlot[];
  notifications: NotificationConfig;
  customCss?: string;
  customDomain?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandingConfig {
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  businessName: string;
  supportEmail: string;
  supportUrl: string;
  socialLinks: {
    instagram?: string;
    tiktok?: string;
    facebook?: string;
    twitter?: string;
  };
}

export interface UpsellSlot {
  id: string;
  enabled: boolean;
  position: "header" | "progress_bar" | "delivery_info" | "footer";
  productTitle: string;
  productImage: string;
  productUrl: string;
  discount: number;
  ctaText: string;
}

export interface NotificationConfig {
  orderConfirmed: boolean;
  shipped: boolean;
  inTransit: boolean;
  outForDelivery: boolean;
  delivered: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  delayMinutes: number;
}

export interface TrackingEvent {
  status: TrackingStatus;
  timestamp: string;
  location?: string;
  carrier?: string;
  description: string;
}

export interface TrackingPageView {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  viewedAt: string;
  upsellClicked?: string;
  upsellConverted?: boolean;
  duration: number; // seconds
  device: string;
  country: string;
}

export interface TrackingPageStats {
  totalViews: number;
  uniqueVisitors: number;
  avgDuration: number;
  upsellClickRate: number;
  upsellConversionRate: number;
  topCountries: { country: string; views: number }[];
  deviceBreakdown: { device: string; count: number }[];
  recentViews: TrackingPageView[];
}

export interface TrackingPageTemplateOption {
  id: TrackingPageTemplate;
  name: string;
  preview: string;
  description: string;
  features: string[];
}

// ── Firestore Doc ────────────────────────────────────────────────────────────

export interface TrackingPageConfigDoc {
  id: string;
  publicId?: string;
  storeId: string;
  storeName: string;
  template: TrackingPageTemplate;
  branding: BrandingConfig;
  upsells: UpsellSlot[];
  notifications: NotificationConfig;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
