import { describe, it, expect } from "vitest";
import {
  runTrademarkCheck,
  runDmcaCheck,
  runRestrictedItemCheck,
  runAdPolicyCheck,
  runImageOriginalityCheck,
  runBrandRegistryCheck,
  runPatentCheck,
  runExportControlCheck,
  runComplianceCheck,
} from "@/lib/compliance";
import type {
  TrademarkCheckInput,
  DmcaCheckInput,
  RestrictedItemInput,
  AdPolicyInput,
  ImageOriginalityInput,
  BrandRegistryInput,
  PatentCheckInput,
  ExportControlInput,
  ComplianceCheckInput,
} from "@/types/compliance";

// ── Shared Helpers ──────────────────────────────────────────────────────────

function baseTrademarkInput(overrides: Partial<TrademarkCheckInput> = {}): TrademarkCheckInput {
  return {
    productTitle: "Basic Cotton T-Shirt",
    productDescription: "A comfortable cotton t-shirt for everyday wear.",
    category: "fashion",
    targetMarkets: ["US"],
    ...overrides,
  };
}

function baseDmcaInput(overrides: Partial<DmcaCheckInput> = {}): DmcaCheckInput {
  return {
    productTitle: "Comfortable Summer Dress",
    productImages: ["https://myshop.com/images/dress-1.jpg"],
    productDescription: "A beautiful summer dress for casual outings.",
    category: "fashion",
    ...overrides,
  };
}

function baseRestrictedInput(overrides: Partial<RestrictedItemInput> = {}): RestrictedItemInput {
  return {
    productTitle: "Summer Floral Dress",
    productDescription: "A light floral dress for summer.",
    category: "fashion",
    materials: ["cotton", "polyester"],
    targetMarkets: ["US", "EU"],
    pricePoint: 29.99,
    ...overrides,
  };
}

function baseAdPolicyInput(overrides: Partial<AdPolicyInput> = {}): AdPolicyInput {
  return {
    productTitle: "Ergonomic Office Chair",
    productDescription: "A comfortable office chair with lumbar support.",
    category: "home",
    targetMarkets: ["US"],
    sellingPrice: 149.99,
    ...overrides,
  };
}

function baseImageInput(overrides: Partial<ImageOriginalityInput> = {}): ImageOriginalityInput {
  return {
    productImages: ["https://myshop.com/images/product-1.jpg"],
    productTitle: "Wireless Bluetooth Speaker",
    ...overrides,
  };
}

function baseBrandInput(overrides: Partial<BrandRegistryInput> = {}): BrandRegistryInput {
  return {
    productTitle: "Portable Bluetooth Speaker",
    category: "electronics",
    ...overrides,
  };
}

function basePatentInput(overrides: Partial<PatentCheckInput> = {}): PatentCheckInput {
  return {
    productTitle: "Wireless Bluetooth Earbuds",
    productDescription: "Noise cancelling wireless earbuds with long battery life.",
    category: "electronics",
    materials: ["plastic"],
    targetMarkets: ["US"],
    ...overrides,
  };
}

function baseExportInput(overrides: Partial<ExportControlInput> = {}): ExportControlInput {
  return {
    productTitle: "Cotton Bed Sheets",
    productDescription: "Soft cotton bed sheets for queen size bed.",
    category: "home",
    materials: ["cotton"],
    targetMarkets: ["US", "EU", "UK"],
    sellingPrice: 39.99,
    ...overrides,
  };
}

function baseComplianceInput(overrides: Partial<ComplianceCheckInput> = {}): ComplianceCheckInput {
  return {
    productTitle: "Stainless Steel Water Bottle",
    productDescription: "A durable stainless steel water bottle, BPA free.",
    productImages: ["https://myshop.com/images/bottle-1.jpg"],
    productImage: "https://myshop.com/images/bottle-1.jpg",
    category: "kitchen",
    materials: ["stainless steel"],
    targetMarkets: ["US", "EU"],
    sellingPrice: 24.99,
    checkTypes: ["trademark", "dmca", "restricted_item", "ad_policy", "image_originality", "brand_registry", "patent", "export_control"],
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. TRADEMARK CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runTrademarkCheck", () => {
  it("returns clear for generic product with no brand matches", () => {
    const result = runTrademarkCheck(baseTrademarkInput());
    expect(result.score).toBe(100);
    expect(result.trademarks).toHaveLength(0);
    expect(result.severity).toBe("pass");
    expect(result.blocked).toBe(false);
    expect(result.brandRisk).toBe("none");
  });

  it("detects known trademark in title (Nike Air Max shoes)", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Nike Air Max shoes" })
    );
    expect(result.trademarks.length).toBeGreaterThan(0);
    const nikeMatch = result.trademarks.find((t) => t.mark.toLowerCase() === "nike");
    expect(nikeMatch).toBeDefined();
    expect(nikeMatch!.owner).toBe("Nike, Inc.");
    expect(nikeMatch!.risk).toBe("high");
    expect(result.severity).toBe("violation");
    expect(result.blocked).toBe(true);
  });

  it("detects brand field match", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ brand: "Nike" })
    );
    const brandMatch = result.trademarks.find(
      (t) => t.evidence.includes("Brand field")
    );
    expect(brandMatch).toBeDefined();
    expect(brandMatch!.owner).toBe("Nike, Inc.");
  });

  it("does not detect misspellings like 'addidas' (documents limitation)", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Addidas Running Shoes" })
    );
    const adidasMatch = result.trademarks.find(
      (t) => t.mark.toLowerCase() === "adidas"
    );
    expect(adidasMatch).toBeUndefined();
    expect(result.trademarks).toHaveLength(0);
  });

  it("returns high risk for high-risk trademarks", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Gucci leather wallet" })
    );
    expect(result.brandRisk).toBe("high");
    expect(result.severity).toBe("violation");
    expect(result.blocked).toBe(true);
    expect(result.trademarks[0].risk).toBe("high");
  });

  it("returns score 100 for no matches", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({
        productTitle: "Handmade ceramic mug",
        productDescription: "A simple ceramic mug for your morning coffee.",
      })
    );
    expect(result.score).toBe(100);
  });

  it("returns blocked=true for high-risk matches", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Adidas Ultraboost Sneakers" })
    );
    expect(result.blocked).toBe(true);
  });

  it("handles empty description gracefully", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productDescription: "" })
    );
    expect(result.score).toBe(100);
    expect(result.trademarks).toHaveLength(0);
    expect(result.severity).toBe("pass");
  });

  it("detects moderate-risk trademark with lower score", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Zara style summer dress" })
    );
    const zaraMatch = result.trademarks.find((t) => t.mark.toLowerCase() === "zara");
    expect(zaraMatch).toBeDefined();
    expect(zaraMatch!.risk).toBe("moderate");
    expect(result.brandRisk).toBe("moderate");
    expect(result.score).toBe(40);
    expect(result.blocked).toBe(false);
  });

  it("returns score 100 for empty product title with no description", () => {
    const result = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "", productDescription: "" })
    );
    expect(result.score).toBe(100);
    expect(result.trademarks).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. DMCA CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runDmcaCheck", () => {
  it("returns low risk for original content", () => {
    const result = runDmcaCheck(baseDmcaInput());
    expect(result.severity).toBe("pass");
    expect(result.blocked).toBe(false);
    expect(result.imageRisk).toBe("low");
    expect(result.descriptionRisk).toBe("low");
    expect(result.dmcaRiskScore).toBeLessThan(30);
  });

  it("detects marketplace CDN images (amazonaws)", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productImages: ["https://my-bucket.s3.amazonaws.com/product.jpg"],
      })
    );
    expect(result.imageRisk).toBe("high");
  });

  it("detects shopify CDN images (shopifycdn)", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productImages: ["https://cdn.shopifycdn.net/s/files/1/image.jpg"],
      })
    );
    expect(result.imageRisk).toBe("high");
  });

  it("detects ebay images", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productImages: ["https://i.ebayimg.com/images/g/example.jpg"],
      })
    );
    expect(result.imageRisk).toBe("high");
  });

  it("detects copied description patterns (multiple generic phrases)", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productDescription:
          "This is an official product and it is authentic. We also have genuine items imported from overseas.",
      })
    );
    expect(result.descriptionRisk).toBe("medium");
  });

  it("detects copyright symbols in description", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productDescription: "This product is © 2024 Brand Name. All rights reserved.",
      })
    );
    expect(result.descriptionRisk).toBe("high");
  });

  it("detects 'replica', 'dupe' etc. in title", () => {
    const result = runDmcaCheck(
      baseDmcaInput({ productTitle: "Replica designer handbag dupe" })
    );
    expect(result.similarProductsFlagged).toBeGreaterThan(0);
  });

  it("returns high risk for multiple issues combined", () => {
    const result = runDmcaCheck(
      baseDmcaInput({
        productTitle: "Replica inspired by luxury handbag",
        productImages: [],
        productDescription:
          "This is an official product, authentic quality. Also genuine material imported from overseas.",
        category: "fashion",
      })
    );
    expect(result.severity).toBe("violation");
    expect(result.blocked).toBe(true);
    expect(result.dmcaRiskScore).toBeGreaterThanOrEqual(60);
  });

  it("sets high imageRisk when no images are provided", () => {
    const result = runDmcaCheck(
      baseDmcaInput({ productImages: [] })
    );
    expect(result.imageRisk).toBe("high");
  });

  it("handles empty product gracefully", () => {
    const result = runDmcaCheck({
      productTitle: "",
      productImages: [],
      productDescription: "",
      category: "",
    });
    expect(result.checkType).toBe("dmca");
    expect(typeof result.score).toBe("number");
  });

  it("detects high DMCA category risk for fashion", () => {
    const result = runDmcaCheck(
      baseDmcaInput({ category: "fashion" })
    );
    const catDetail = result.details.find((d) => d.label === "Category DMCA Risk");
    expect(catDetail?.value).toBe("HIGH");
  });

  it("returns low risk for non-DMCA category with original images", () => {
    const result = runDmcaCheck(
      baseDmcaInput({ category: "books" })
    );
    const catDetail = result.details.find((d) => d.label === "Category DMCA Risk");
    expect(catDetail?.value).toBe("LOW");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. RESTRICTED ITEM CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runRestrictedItemCheck", () => {
  it("returns no restrictions for fashion category", () => {
    const result = runRestrictedItemCheck(baseRestrictedInput());
    expect(result.score).toBe(100);
    expect(result.categoryRestricted).toBe(false);
    expect(result.severity).toBe("pass");
    expect(result.restrictedPlatforms.every((p) => !p.restricted)).toBe(true);
  });

  it("detects weapons category from keywords", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Tactical combat knife" })
    );
    expect(result.detectedCategory ?? result.details[0]?.value).toBeDefined();
    expect(result.categoryRestricted).toBe(true);
    expect(result.restrictedPlatforms.some((p) => p.restricted)).toBe(true);
  });

  it("detects tobacco products", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Premium tobacco cigarette case" })
    );
    expect(result.categoryRestricted).toBe(true);
    expect(result.ageRestriction).toBe(true);
    expect(result.licensingRequired).toBe(true);
  });

  it("detects alcohol", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Craft beer glass set" })
    );
    expect(result.categoryRestricted).toBe(true);
    expect(result.ageRestriction).toBe(true);
  });

  it("detects supplements", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({
        productTitle: "Protein supplement powder",
        category: "health",
      })
    );
    expect(result.categoryRestricted).toBe(true);
  });

  it("returns platform restrictions correctly", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Tactical assault rifle scope" })
    );
    const restrictedPlatforms = result.restrictedPlatforms.filter((p) => p.restricted);
    expect(restrictedPlatforms.length).toBeGreaterThan(0);
    expect(restrictedPlatforms.some((p) => p.platform === "shopify")).toBe(true);
    expect(restrictedPlatforms.some((p) => p.platform === "facebook")).toBe(true);
  });

  it("detects age restriction for weapons", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Brass knuckles self defense" })
    );
    expect(result.ageRestriction).toBe(true);
  });

  it("detects licensing requirement for weapons", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Rifle scope mount" })
    );
    expect(result.licensingRequired).toBe(true);
  });

  it("detects knife in title as weapons category", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({ productTitle: "Folding pocket knife camping" })
    );
    expect(result.categoryRestricted).toBe(true);
  });

  it("detects hazmat category from custom materials", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({
        productTitle: "Chemical cleaning solution",
        materials: ["chemical", "acid"],
        category: "cleaning",
      })
    );
    expect(result.categoryRestricted).toBe(true);
  });

  it("returns restricted for drugs category", () => {
    const result = runRestrictedItemCheck(
      baseRestrictedInput({
        productTitle: "Drug testing kit",
        category: "health",
      })
    );
    expect(result.categoryRestricted).toBe(true);
    expect(result.restrictedPlatforms.some((p) => p.restricted)).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. AD POLICY CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runAdPolicyCheck", () => {
  it("returns compliant for clean content", () => {
    const result = runAdPolicyCheck(baseAdPolicyInput());
    expect(result.severity).toBe("pass");
    expect(result.prohibitedContent).toHaveLength(0);
    expect(result.platformPolicies.every((p) => p.compliant)).toBe(true);
  });

  it("detects prohibited terms like 'miracle cure'", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({ productTitle: "Miracle cure for back pain" })
    );
    expect(result.prohibitedContent.length).toBeGreaterThanOrEqual(2);
    expect(result.severity).toBe("violation");
  });

  it("detects 'FDA approved' as prohibited", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Natural health supplement",
        productDescription: "FDA approved formula for daily wellness.",
      })
    );
    const fdaMatches = result.prohibitedContent.filter((c) =>
      c.toLowerCase().includes("fda")
    );
    expect(fdaMatches.length).toBeGreaterThan(0);
  });

  it("detects restricted terms like 'gambling' and 'vpn'", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Online gambling vpn service",
        category: "services",
      })
    );
    expect(result.restrictedContent.length).toBeGreaterThanOrEqual(1);
  });

  it("returns platform-specific results for Facebook, Google, TikTok", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Miracle weight loss supplement",
      })
    );
    const platformNames = result.platformPolicies.map((p) => p.platform);
    expect(platformNames).toContain("Facebook/Instagram");
    expect(platformNames).toContain("Google Ads");
    expect(platformNames).toContain("TikTok Ads");
  });

  it("detects before/after claims making TikTok non-compliant", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Skin cream with before and after results",
        beforeAfterClaims: "before and after transformation",
      })
    );
    const tiktok = result.platformPolicies.find((p) => p.platform === "TikTok Ads");
    expect(tiktok?.compliant).toBe(false);
  });

  it("adds disclaimers required for health claims", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Vitamin supplement",
        healthClaims: ["Supports immune system", "Boosts energy"],
      })
    );
    expect(result.requiresDisclaimers.length).toBeGreaterThan(0);
    expect(
      result.requiresDisclaimers.some((d) => d.includes("Results may vary"))
    ).toBe(true);
  });

  it("adds disclaimer for high selling price", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({ sellingPrice: 299.99 })
    );
    expect(
      result.requiresDisclaimers.some((d) => d.includes("return/refund"))
    ).toBe(true);
  });

  it("detects restricted 'sale' content", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Clearance sale discount shoes",
      })
    );
    expect(result.restrictedContent.length).toBeGreaterThan(0);
    expect(
      result.restrictedContent.some((r) => r === "sale" || r === "discount")
    ).toBe(true);
  });

  it("returns non-compliant for multiple platforms with prohibited content", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Miracle cure guaranteed 100% effective",
      })
    );
    const nonCompliant = result.platformPolicies.filter((p) => !p.compliant);
    expect(nonCompliant.length).toBeGreaterThanOrEqual(2);
  });

  it("returns severity violation for prohibited terms", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({ productTitle: "Act now limited time offer" })
    );
    expect(result.severity).toBe("violation");
    expect(result.prohibitedContent.length).toBeGreaterThan(0);
  });

  it("returns severity warning for only restricted terms (no prohibited)", () => {
    const result = runAdPolicyCheck(
      baseAdPolicyInput({
        productTitle: "Discount cbd vape supplement",
        category: "health",
      })
    );
    if (result.prohibitedContent.length === 0 && result.restrictedContent.length >= 3) {
      expect(result.severity).toBe("warning");
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. IMAGE ORIGINALITY CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runImageOriginalityCheck", () => {
  it("returns high originality for clean image URLs", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: ["https://mybrand.com/photos/product-shot.jpg"],
      })
    );
    expect(result.overallOriginality).toBe(100);
    expect(result.stockPhotoDetected).toBe(false);
    expect(result.imageResults[0].isOriginal).toBe(true);
  });

  it("detects stock photos from Shutterstock", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://www.shutterstock.com/image-photo/example-product-123456.jpg",
        ],
      })
    );
    expect(result.stockPhotoDetected).toBe(true);
    expect(result.imageResults[0].isOriginal).toBe(false);
    expect(result.imageResults[0].stockPhotoProbability).toBe(90);
  });

  it("detects marketplace CDN images", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://i5.walmartimages.com/asr/example-product.jpg",
        ],
      })
    );
    expect(result.imageResults[0].isOriginal).toBe(false);
    expect(result.imageResults[0].concerns.length).toBeGreaterThan(0);
  });

  it("detects watermarks", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://myshop.com/images/product-watermark-preview.jpg",
        ],
      })
    );
    expect(result.watermarksDetected).toBe(true);
    expect(result.imageResults[0].watermarkDetected).toBe(true);
  });

  it("detects placeholder images", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: ["https://myshop.com/images/no-image.png"],
      })
    );
    expect(result.imageResults[0].isOriginal).toBe(false);
    expect(
      result.imageResults[0].concerns.some((c) => c.includes("placeholder"))
    ).toBe(true);
  });

  it("returns 100 originality when no images provided", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({ productImages: [] })
    );
    expect(result.overallOriginality).toBe(100);
    expect(result.imageResults).toHaveLength(0);
  });

  it("calculates correct average originality for mixed images", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://mybrand.com/original-photo.jpg",
          "https://www.shutterstock.com/image-photo/stock-example.jpg",
        ],
      })
    );
    expect(result.overallOriginality).toBe(55);
  });

  it("detects multiple concerns per image", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://www.shutterstock.com/images/watermark-preview-sample.jpg",
        ],
      })
    );
    const concerns = result.imageResults[0].concerns;
    expect(concerns.length).toBeGreaterThanOrEqual(2);
  });

  it("detects AliExpress/Alibaba hosted images", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://ae01.alicdn.com/kf/example-product.jpg",
        ],
      })
    );
    expect(result.imageResults[0].isOriginal).toBe(false);
    expect(
      result.imageResults[0].concerns.some((c) => c.includes("AliExpress"))
    ).toBe(true);
  });

  it("detects Getty/iStock photos", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({
        productImages: [
          "https://media.gettyimages.com/id/example/photo.jpg",
        ],
      })
    );
    expect(result.stockPhotoDetected).toBe(true);
  });

  it("returns warning severity when no images provided", () => {
    const result = runImageOriginalityCheck(
      baseImageInput({ productImages: [] })
    );
    expect(result.severity).toBe("warning");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. BRAND REGISTRY CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runBrandRegistryCheck", () => {
  it("returns no registration for generic brand", () => {
    const result = runBrandRegistryCheck(baseBrandInput());
    expect(result.brandRegistered).toBe(false);
    expect(result.score).toBe(100);
    expect(result.severity).toBe("pass");
    expect(result.blocked).toBe(false);
  });

  it("detects registered brand (Nike)", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "Nike Air Max Sneakers",
        brand: "Nike",
      })
    );
    expect(result.brandRegistered).toBe(true);
    expect(result.brandOwner).toBe("Nike, Inc.");
    expect(result.blocked).toBe(true);
    expect(result.score).toBe(20);
  });

  it("returns correct registered platforms", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "Samsung Galaxy Phone Case",
        brand: "Samsung",
      })
    );
    expect(result.registeredPlatforms).toContain("Amazon Brand Registry");
  });

  it("returns blocked=true for registered brands", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "Apple iPhone case",
        brand: "Apple",
      })
    );
    expect(result.blocked).toBe(true);
    expect(result.brandRegistered).toBe(true);
  });

  it("returns correct brand owner", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "LEGO compatible building blocks",
        brand: "LEGO",
      })
    );
    expect(result.brandOwner).toBe("LEGO Group");
  });

  it("handles no brand field", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({ productTitle: "Generic cotton socks" })
    );
    expect(result.brandRegistered).toBe(false);
    expect(result.registeredPlatforms).toHaveLength(0);
  });

  it("detects brand from title when brand field is absent", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "Puma running shoes",
      })
    );
    expect(result.brandRegistered).toBe(true);
    expect(result.brandOwner).toBe("Puma SE");
  });

  it("detects brand from brand field even when title is generic", () => {
    const result = runBrandRegistryCheck(
      baseBrandInput({
        productTitle: "Comfortable running shoes for men",
        brand: "Adidas",
      })
    );
    expect(result.brandRegistered).toBe(true);
    expect(result.brandOwner).toBe("Adidas AG");
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 7. PATENT CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runPatentCheck", () => {
  it("returns no patent issues for generic product", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "Ceramic flower vase",
        productDescription: "A decorative ceramic vase for home decoration.",
        category: "home",
      })
    );
    expect(result.suspectedInfringements).toHaveLength(0);
    expect(result.score).toBe(100);
    expect(result.severity).toBe("pass");
    expect(result.designPatentRisk).toBe("none");
    expect(result.utilityPatentRisk).toBe("none");
  });

  it("detects known patent risk keyword (magsafe)", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "MagSafe compatible wireless charger",
      })
    );
    expect(result.suspectedInfringements.length).toBeGreaterThan(0);
    const magsafe = result.suspectedInfringements.find(
      (i) => i.evidence.includes("magsafe")
    );
    expect(magsafe).toBeDefined();
    expect(magsafe!.risk).toBe("high");
  });

  it("detects design patent indicators (rounded rectangle)", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "Slim rounded rectangle phone case",
      })
    );
    expect(result.designPatentRisk).not.toBe("none");
    expect(
      result.suspectedInfringements.some((i) => i.patentType === "design")
    ).toBe(true);
  });

  it("detects utility patent indicators (noise cancelling)", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "Wireless noise cancelling headphones",
      })
    );
    expect(result.utilityPatentRisk).not.toBe("none");
    expect(
      result.suspectedInfringements.some((i) => i.patentType === "utility")
    ).toBe(true);
  });

  it("detects 'face id' utility patent risk", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "Face ID compatible screen protector",
      })
    );
    expect(
      result.suspectedInfringements.some(
        (i) => i.evidence.includes("face id") && i.risk === "high"
      )
    ).toBe(true);
  });

  it("adds risk for high-patent category (electronics)", () => {
    const result = runPatentCheck(
      basePatentInput({ category: "electronics" })
    );
    const catDetail = result.details.find(
      (d) => d.label === "High-Patent Category"
    );
    expect(catDetail?.value).toBe("YES");
  });

  it("returns high risk for multiple infringements", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle:
          "MagSafe rounded rectangle foldable screen case with noise cancelling",
        productDescription:
          "Face ID compatible with dynamic island design",
      })
    );
    expect(result.suspectedInfringements.length).toBeGreaterThanOrEqual(3);
    expect(result.patentRiskScore).toBeGreaterThanOrEqual(60);
  });

  it("returns correct designPatentRisk and utilityPatentRisk", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "MagSafe dynamic island phone case",
        productDescription: "Rounded rectangle design with wireless charging",
      })
    );
    expect(["low", "moderate", "high"]).toContain(result.designPatentRisk);
    expect(["low", "moderate", "high"]).toContain(result.utilityPatentRisk);
  });

  it("handles empty description gracefully", () => {
    const result = runPatentCheck(
      basePatentInput({
        productTitle: "Ceramic flower vase",
        category: "home",
        productDescription: "",
      })
    );
    expect(result.score).toBe(100);
    expect(result.suspectedInfringements).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 8. EXPORT CONTROL CHECK
// ══════════════════════════════════════════════════════════════════════════════

describe("runExportControlCheck", () => {
  it("returns no issues for non-restricted product", () => {
    const result = runExportControlCheck(baseExportInput());
    expect(result.embargoedMarkets).toHaveLength(0);
    expect(result.classifiedAsDualUse).toBe(false);
    expect(result.score).toBe(100);
    expect(result.severity).toBe("pass");
    expect(result.blocked).toBe(false);
  });

  it("detects embargoed market (North Korea)", () => {
    const result = runExportControlCheck(
      baseExportInput({ targetMarkets: ["US", "KP"] })
    );
    expect(result.embargoedMarkets).toContain("KP");
    expect(result.blocked).toBe(true);
    expect(result.score).toBe(10);
    expect(result.severity).toBe("violation");
  });

  it("detects dual-use category (nuclear)", () => {
    const result = runExportControlCheck(
      baseExportInput({
        productTitle: "Nuclear measurement equipment",
        category: "electronics",
      })
    );
    expect(result.classifiedAsDualUse).toBe(true);
    expect(result.licenseRequired).toBe(true);
  });

  it("detects controlled materials (uranium)", () => {
    const result = runExportControlCheck(
      baseExportInput({
        productTitle: "Uranium analysis kit",
        materials: ["uranium"],
      })
    );
    expect(result.classifiedAsDualUse).toBe(true);
    expect(result.licenseRequired).toBe(true);
    expect(
      result.sanctionsFlags.some((f) => f.includes("uranium"))
    ).toBe(true);
  });

  it("sets license required for dual-use products", () => {
    const result = runExportControlCheck(
      baseExportInput({
        productTitle: "Advanced encryption device",
        category: "electronics",
      })
    );
    expect(result.licenseRequired).toBe(true);
  });

  it("returns blocked for embargoed markets", () => {
    const result = runExportControlCheck(
      baseExportInput({ targetMarkets: ["IR"] })
    );
    expect(result.blocked).toBe(true);
    expect(result.embargoedMarkets).toContain("IR");
  });

  it("handles multiple target markets with one embargoed", () => {
    const result = runExportControlCheck(
      baseExportInput({ targetMarkets: ["US", "EU", "KP", "UK"] })
    );
    expect(result.embargoedMarkets).toContain("KP");
    expect(result.embargoedMarkets).toHaveLength(1);
    expect(result.blocked).toBe(true);
  });

  it("handles multiple embargoed markets", () => {
    const result = runExportControlCheck(
      baseExportInput({ targetMarkets: ["KP", "IR", "SY"] })
    );
    expect(result.embargoedMarkets).toHaveLength(3);
    expect(result.blocked).toBe(true);
  });

  it("detects military category as dual-use", () => {
    const result = runExportControlCheck(
      baseExportInput({
        productTitle: "Military grade tactical vest",
        category: "military",
      })
    );
    expect(result.classifiedAsDualUse).toBe(true);
    expect(result.licenseRequired).toBe(true);
  });

  it("detects missile technology keywords", () => {
    const result = runExportControlCheck(
      baseExportInput({
        productTitle: "Missile guidance system components",
      })
    );
    expect(result.classifiedAsDualUse).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 9. COMPLIANCE CHECK ORCHESTRATOR
// ══════════════════════════════════════════════════════════════════════════════

describe("runComplianceCheck", () => {
  it("runs only selected check types", () => {
    const result = runComplianceCheck(
      baseComplianceInput({ checkTypes: ["trademark"] })
    );
    expect(result.checks).toHaveLength(1);
    expect(result.checks[0].checkType).toBe("trademark");
  });

  it("calculates correct overall score as average of check scores", () => {
    const result = runComplianceCheck(
      baseComplianceInput({ checkTypes: ["trademark", "dmca"] })
    );
    const avg =
      result.checks.reduce((sum, c) => sum + c.score, 0) /
      result.checks.length;
    expect(result.overallScore).toBe(Math.round(avg));
  });

  it("determines risk level 'safe' for all-pass product", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark", "brand_registry"],
        productTitle: "Generic cotton tote bag",
        brand: "MyBrand",
      })
    );
    expect(result.riskLevel).toBe("safe");
  });

  it("determines risk level 'blocked' when any check is blocked", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark"],
        productTitle: "Nike Air Jordan sneakers",
      })
    );
    expect(result.riskLevel).toBe("blocked");
  });

  it("returns canList=false when blocked", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark"],
        productTitle: "Gucci leather handbag",
      })
    );
    expect(result.canList).toBe(false);
  });

  it("returns canList=true for safe products", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark", "patent"],
        productTitle: "Handmade wooden cutting board",
      })
    );
    expect(result.canList).toBe(true);
  });

  it("builds flags correctly for non-pass checks", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark"],
        productTitle: "Nike running shoes",
      })
    );
    expect(result.flags.length).toBeGreaterThan(0);
    expect(result.flags[0].type).toBe("trademark");
    expect(result.flags[0].severity).toBe("violation");
    expect(result.flags[0].actionRequired).toBe(true);
  });

  it("collects recommendations from non-pass checks", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark"],
        productTitle: "Adidas ultraboost shoes",
      })
    );
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(
      result.recommendations.some((r) => r.includes("trademark") || r.includes("Remove"))
    ).toBe(true);
  });

  it("handles empty checkTypes array", () => {
    const result = runComplianceCheck(
      baseComplianceInput({ checkTypes: [] })
    );
    expect(result.checks).toHaveLength(0);
    expect(result.overallScore).toBe(100);
    expect(result.riskLevel).toBe("safe");
    expect(result.canList).toBe(true);
    expect(result.flags).toHaveLength(0);
  });

  it("handles all check types together", () => {
    const result = runComplianceCheck(baseComplianceInput());
    expect(result.checks.length).toBe(8);
    expect(result.checks.map((c) => c.checkType).sort()).toEqual([
      "ad_policy",
      "brand_registry",
      "dmca",
      "export_control",
      "image_originality",
      "patent",
      "restricted_item",
      "trademark",
    ]);
  });

  it("determines risk level 'high' for violation without blocked", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["ad_policy"],
        productTitle: "Miracle cure weight loss supplement",
      })
    );
    if (
      result.checks.some((c) => c.severity === "violation") &&
      !result.checks.some((c) => c.blocked)
    ) {
      expect(result.riskLevel).toBe("high");
    }
  });

  it("determines risk level 'medium' for warnings only", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["image_originality"],
        productImages: [],
      })
    );
    if (
      result.checks.some((c) => c.severity === "warning") &&
      !result.checks.some((c) => c.severity === "violation") &&
      !result.checks.some((c) => c.blocked)
    ) {
      expect(result.riskLevel).toBe("medium");
    }
  });

  it("sets product image from first product image", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        productImages: ["https://myshop.com/image-a.jpg", "https://myshop.com/image-b.jpg"],
      })
    );
    expect(result.productImage).toBe("https://myshop.com/image-a.jpg");
  });

  it("does not include passing checks in flags", () => {
    const result = runComplianceCheck(
      baseComplianceInput({
        checkTypes: ["trademark", "patent"],
        productTitle: "Generic cotton socks",
      })
    );
    expect(result.flags).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 10. EDGE CASES
// ══════════════════════════════════════════════════════════════════════════════

describe("Edge Cases", () => {
  it("handles empty product title across all engines", () => {
    expect(() => {
      runTrademarkCheck({
        productTitle: "",
        category: "",
        targetMarkets: [],
      });
    }).not.toThrow();

    expect(() => {
      runDmcaCheck({
        productTitle: "",
        productImages: [],
        category: "",
      });
    }).not.toThrow();

    expect(() => {
      runRestrictedItemCheck({
        productTitle: "",
        category: "",
        materials: [],
        targetMarkets: [],
        pricePoint: 0,
      });
    }).not.toThrow();

    expect(() => {
      runAdPolicyCheck({
        productTitle: "",
        category: "",
        targetMarkets: [],
        sellingPrice: 0,
      });
    }).not.toThrow();

    expect(() => {
      runImageOriginalityCheck({
        productImages: [],
        productTitle: "",
      });
    }).not.toThrow();

    expect(() => {
      runBrandRegistryCheck({
        productTitle: "",
        category: "",
      });
    }).not.toThrow();

    expect(() => {
      runPatentCheck({
        productTitle: "",
        category: "",
        materials: [],
        targetMarkets: [],
      });
    }).not.toThrow();

    expect(() => {
      runExportControlCheck({
        productTitle: "",
        category: "",
        materials: [],
        targetMarkets: [],
        sellingPrice: 0,
      });
    }).not.toThrow();
  });

  it("handles very long product descriptions", () => {
    const longDescription = "A wonderful product. ".repeat(500);
    expect(() => {
      runTrademarkCheck({
        productTitle: "Test Product",
        productDescription: longDescription,
        category: "home",
        targetMarkets: ["US"],
      });
    }).not.toThrow();

    const result = runDmcaCheck({
      productTitle: "Test Product",
      productImages: ["https://example.com/image.jpg"],
      productDescription: longDescription,
      category: "home",
    });
    expect(result.checkType).toBe("dmca");
  });

  it("handles special characters in inputs", () => {
    expect(() => {
      runTrademarkCheck({
        productTitle: "Product with <script>alert('xss')</script>",
        productDescription: "Description with &amp; &lt; &gt; characters",
        category: "home",
        targetMarkets: ["US"],
      });
    }).not.toThrow();

    const result = runAdPolicyCheck({
      productTitle: "Product @#$%^&*()_+ special chars!",
      productDescription: "Description with {brackets} and [brackets]",
      category: "home",
      targetMarkets: ["US"],
      sellingPrice: 10,
    });
    expect(result.checkType).toBe("ad_policy");
  });

  it("handles unicode characters", () => {
    expect(() => {
      runTrademarkCheck({
        productTitle: "Japanese-style カタカナ product",
        productDescription: "A product with émojis 🎉 and ünïcödé characters",
        category: "fashion",
        targetMarkets: ["JP"],
      });
    }).not.toThrow();

    const result = runImageOriginalityCheck({
      productImages: ["https://example.com/produit-français.jpg"],
      productTitle: "Produit Français 🇫🇷",
    });
    expect(result.checkType).toBe("image_originality");
  });

  it("handles products with multiple issues across checks", () => {
    const result = runComplianceCheck({
      productTitle: "Nike Air Max replica shoes",
      productDescription: "Official authentic product, genuine Nike style. FDA approved quality.",
      productImages: ["https://www.shutterstock.com/image-photo/nike-shoes.jpg"],
      productImage: "https://www.shutterstock.com/image-photo/nike-shoes.jpg",
      category: "fashion",
      materials: ["leather"],
      targetMarkets: ["US", "EU"],
      sellingPrice: 89.99,
      checkTypes: ["trademark", "dmca", "ad_policy", "image_originality", "brand_registry"],
    });

    expect(result.canList).toBe(false);
    expect(result.flags.length).toBeGreaterThan(1);
    expect(result.overallScore).toBeLessThan(50);
    expect(["high", "blocked"]).toContain(result.riskLevel);
  });

  it("handles concurrent checks without interference", () => {
    const result1 = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Nike running shoes" })
    );
    const result2 = runTrademarkCheck(
      baseTrademarkInput({ productTitle: "Generic cotton socks" })
    );

    expect(result1.trademarks.length).toBeGreaterThan(0);
    expect(result2.trademarks).toHaveLength(0);
  });

  it("handles products with mixed risk levels across checks", () => {
    const result = runComplianceCheck({
      productTitle: "Handmade wooden bookmark",
      productDescription: "A decorative wooden bookmark for reading.",
      productImages: ["https://www.shutterstock.com/image-photo/bookmark.jpg"],
      productImage: "https://www.shutterstock.com/image-photo/bookmark.jpg",
      category: "home",
      materials: ["wood"],
      targetMarkets: ["US"],
      sellingPrice: 9.99,
      checkTypes: ["trademark", "image_originality", "dmca"],
    });

    const trademarkCheck = result.checks.find((c) => c.checkType === "trademark");
    expect(trademarkCheck?.severity).toBe("pass");

    const imageCheck = result.checks.find(
      (c) => c.checkType === "image_originality"
    );
    expect(imageCheck?.severity).toBe("violation");

    expect(result.flags.some((f) => f.type === "image_originality")).toBe(true);
    expect(result.flags.some((f) => f.type === "trademark")).toBe(false);
  });

  it("handles zero price point", () => {
    expect(() => {
      runAdPolicyCheck({
        productTitle: "Free sample product",
        category: "home",
        targetMarkets: ["US"],
        sellingPrice: 0,
      });
    }).not.toThrow();

    expect(() => {
      runExportControlCheck({
        productTitle: "Test product",
        category: "home",
        materials: [],
        targetMarkets: ["US"],
        sellingPrice: 0,
      });
    }).not.toThrow();
  });

  it("handles products with only spaces as title", () => {
    const result = runTrademarkCheck({
      productTitle: "   ",
      productDescription: "   ",
      category: "home",
      targetMarkets: ["US"],
    });
    expect(result.score).toBe(100);
    expect(result.trademarks).toHaveLength(0);
  });

  it("handles empty materials array", () => {
    const result = runRestrictedItemCheck({
      productTitle: "Test product",
      category: "fashion",
      materials: [],
      targetMarkets: ["US"],
      pricePoint: 10,
    });
    expect(result.checkType).toBe("restricted_item");
  });

  it("handles empty targetMarkets array across engines", () => {
    expect(() => {
      runExportControlCheck({
        productTitle: "Test product",
        category: "home",
        materials: [],
        targetMarkets: [],
        sellingPrice: 10,
      });
    }).not.toThrow();

    const result = runComplianceCheck({
      productTitle: "Test product",
      productImages: [],
      category: "home",
      materials: [],
      targetMarkets: [],
      sellingPrice: 10,
      checkTypes: ["export_control"],
    });
    expect(result.checks[0].severity).toBe("pass");
  });
});
