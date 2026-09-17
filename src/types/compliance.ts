import { Timestamp } from "firebase/firestore";

// ── Compliance Check Types ───────────────────────────────────────────────────

export type ComplianceCheckType =
  | "trademark"
  | "dmca"
  | "restricted_item"
  | "ad_policy"
  | "image_originality"
  | "brand_registry"
  | "patent"
  | "export_control";

export type ComplianceSeverity = "pass" | "warning" | "violation" | "critical";

export type ComplianceRiskLevel = "safe" | "low" | "medium" | "high" | "blocked";

// ── Individual Check Result ──────────────────────────────────────────────────

export interface ComplianceCheckResult {
  checkType: ComplianceCheckType;
  severity: ComplianceSeverity;
  score: number; // 0-100, 100 = fully compliant
  title: string;
  description: string;
  details: ComplianceCheckDetail[];
  recommendation: string;
  blocked: boolean; // if true, product should NOT be listed
  checkedAt: string;
}

export interface ComplianceCheckDetail {
  label: string;
  value: string;
  status: "pass" | "warn" | "fail";
  evidence?: string;
}

// ── Trademark Check ──────────────────────────────────────────────────────────

export interface TrademarkCheckInput {
  productTitle: string;
  productDescription?: string;
  brand?: string;
  category: string;
  targetMarkets: string[];
}

export interface TrademarkCheckResult extends ComplianceCheckResult {
  checkType: "trademark";
  trademarks: TrademarkMatch[];
  brandRisk: "none" | "low" | "moderate" | "high" | "confirmed";
}

export interface TrademarkMatch {
  mark: string;
  owner: string;
  status: "active" | "inactive" | "pending";
  classes: string[];
  risk: "none" | "low" | "moderate" | "high";
  evidence: string;
}

// ── DMCA Risk Check ──────────────────────────────────────────────────────────

export interface DmcaCheckInput {
  productTitle: string;
  productImages: string[];
  productDescription?: string;
  supplierUrl?: string;
  category: string;
}

export interface DmcaCheckResult extends ComplianceCheckResult {
  checkType: "dmca";
  dmcaRiskScore: number; // 0-100
  imageRisk: "low" | "medium" | "high";
  descriptionRisk: "low" | "medium" | "high";
  historicalDmcaCount: number;
  similarProductsFlagged: number;
}

// ── Restricted Item Check ────────────────────────────────────────────────────

export interface RestrictedItemInput {
  productTitle: string;
  productDescription?: string;
  category: string;
  materials: string[];
  targetMarkets: string[];
  pricePoint: number;
}

export interface RestrictedItemResult extends ComplianceCheckResult {
  checkType: "restricted_item";
  restrictedPlatforms: RestrictedPlatform[];
  categoryRestricted: boolean;
  ageRestriction: boolean;
  licensingRequired: boolean;
}

export interface RestrictedPlatform {
  platform: string;
  restricted: boolean;
  reason: string;
  alternativeAllowed: boolean;
}

// ── Ad Policy Check ──────────────────────────────────────────────────────────

export interface AdPolicyInput {
  productTitle: string;
  productDescription?: string;
  category: string;
  targetMarkets: string[];
  sellingPrice: number;
  beforeAfterClaims?: string;
  healthClaims?: string[];
}

export interface AdPolicyResult extends ComplianceCheckResult {
  checkType: "ad_policy";
  platformPolicies: AdPlatformPolicy[];
  prohibitedContent: string[];
  restrictedContent: string[];
  requiresDisclaimers: string[];
}

export interface AdPlatformPolicy {
  platform: string;
  compliant: boolean;
  issues: string[];
  riskLevel: "low" | "medium" | "high";
}

// ── Image Originality Check ─────────────────────────────────────────────────

export interface ImageOriginalityInput {
  productImages: string[];
  productTitle: string;
  supplierUrl?: string;
}

export interface ImageOriginalityResult extends ComplianceCheckResult {
  checkType: "image_originality";
  imageResults: ImageCheckResult[];
  overallOriginality: number; // 0-100
  stockPhotoDetected: boolean;
  watermarksDetected: boolean;
}

export interface ImageCheckResult {
  imageUrl: string;
  isOriginal: boolean;
  stockPhotoProbability: number;
  watermarkDetected: boolean;
  similarFound: number;
  source?: string;
  concerns: string[];
}

// ── Brand Registry Check ────────────────────────────────────────────────────

export interface BrandRegistryInput {
  productTitle: string;
  brand?: string;
  category: string;
}

export interface BrandRegistryResult extends ComplianceCheckResult {
  checkType: "brand_registry";
  brandRegistered: boolean;
  registeredPlatforms: string[];
  brandOwner?: string;
  enrolledInAtoZ: boolean;
}

// ── Patent Check ───────────────────────────────────────────────────────────

export interface PatentCheckInput {
  productTitle: string;
  productDescription?: string;
  brand?: string;
  category: string;
  materials: string[];
  targetMarkets: string[];
}

export interface PatentCheckResult extends ComplianceCheckResult {
  checkType: "patent";
  patentRiskScore: number;
  designPatentRisk: "none" | "low" | "moderate" | "high";
  utilityPatentRisk: "none" | "low" | "moderate" | "high";
  suspectedInfringements: PatentInfringement[];
}

export interface PatentInfringement {
  patentType: "design" | "utility" | "plant";
  description: string;
  risk: "low" | "moderate" | "high";
  evidence: string;
  owner?: string;
}

// ── Export Control Check ────────────────────────────────────────────────────

export interface ExportControlInput {
  productTitle: string;
  productDescription?: string;
  category: string;
  materials: string[];
  targetMarkets: string[];
  sellingPrice: number;
}

export interface ExportControlResult extends ComplianceCheckResult {
  checkType: "export_control";
  exportControlRiskScore: number;
  embargoedMarkets: string[];
  restrictedMarkets: string[];
  licenseRequired: boolean;
  classifiedAsDualUse: boolean;
  sanctionsFlags: string[];
}

// ── Compliance Alerts ──────────────────────────────────────────────────────

export interface ComplianceAlert {
  id: string;
  uid: string;
  type: "policy_change" | "product_flagged" | "bulk_scan_complete" | "new_violation";
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  checkId?: string;
  read: boolean;
  createdAt: string;
}

// ── Combined Compliance Report ──────────────────────────────────────────────

export interface ComplianceReport {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  category: string;
  overallScore: number; // 0-100
  riskLevel: ComplianceRiskLevel;
  canList: boolean; // final verdict
  checks: ComplianceCheckResult[];
  flags: ComplianceFlag[];
  recommendations: string[];
  checkedAt: string;
  createdAt: Timestamp;
}

export interface ComplianceFlag {
  type: ComplianceCheckType;
  severity: ComplianceSeverity;
  message: string;
  actionRequired: boolean;
}

// ── Firestore Document ──────────────────────────────────────────────────────

export interface ComplianceDoc {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  category: string;
  overallScore: number;
  riskLevel: ComplianceRiskLevel;
  canList: boolean;
  checkTypes: ComplianceCheckType[];
  flagCount: number;
  violationCount: number;
  inputs: Record<string, unknown>;
  report?: ComplianceReport;
  createdAt: Timestamp;
}

// ── Input Schema Types ──────────────────────────────────────────────────────

export interface ComplianceCheckInput {
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  productDescription?: string;
  brand?: string;
  category: string;
  materials: string[];
  targetMarkets: string[];
  sellingPrice: number;
  productImages: string[];
  supplierUrl?: string;
  checkTypes: ComplianceCheckType[];
  beforeAfterClaims?: string;
  healthClaims?: string[];
}

export interface BatchComplianceInput {
  products: ComplianceCheckInput[];
  checkTypes: ComplianceCheckType[];
}

// ── Stats & Dashboard ──────────────────────────────────────────────────────

export interface ComplianceStats {
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  violationChecks: number;
  blockedProducts: number;
  avgScore: number;
  riskBreakdown: {
    safe: number;
    low: number;
    medium: number;
    high: number;
    blocked: number;
  };
  recentFlags: ComplianceFlag[];
  marketBreakdown: Record<string, { total: number; passed: number; blocked: number }>;
}
