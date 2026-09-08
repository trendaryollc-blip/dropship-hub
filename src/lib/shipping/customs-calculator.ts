import type { CountryCustomsData, CustomsItem, CustomsItemResult, CustomsSummary, DeMinimisInfo, CustomsWarning } from "@/types/shipping";
import { getCountryData, getHSCodeRate, getCategoryDutyRate, isProhibited, isRestricted } from "./country-data";

// ── HS Code Category Mapping ──────────────────────────────────────────────────

const ITEM_CATEGORY_MAP: Record<string, string> = {
  phone: "electronics",
  smartphone: "electronics",
  tablet: "electronics",
  laptop: "electronics",
  computer: "electronics",
  earbuds: "electronics",
  earphones: "electronics",
  headphones: "electronics",
  speaker: "electronics",
  camera: "electronics",
  charger: "electronics",
  cable: "electronics",
  adapter: "electronics",
  smartwatch: "electronics",
  bluetooth: "electronics",
  usb: "electronics",
  keyboard: "electronics",
  mouse: "electronics",
  monitor: "electronics",
  tv: "electronics",
  shirt: "clothing",
  tshirt: "clothing",
  "t-shirt": "clothing",
  dress: "clothing",
  pants: "clothing",
  jeans: "clothing",
  jacket: "clothing",
  hoodie: "clothing",
  sweater: "clothing",
  coat: "clothing",
  shorts: "clothing",
  skirt: "clothing",
  suit: "clothing",
  blouse: "clothing",
  clothing: "clothing",
  apparel: "clothing",
  fashion: "clothing",
  shoe: "shoes",
  shoes: "shoes",
  sneakers: "shoes",
  boots: "shoes",
  sandals: "shoes",
  slippers: "shoes",
  heels: "shoes",
  bag: "bags",
  bags: "bags",
  handbag: "bags",
  backpack: "bags",
  wallet: "bags",
  purse: "bags",
  clutch: "bags",
  jewelry: "jewelry",
  necklace: "jewelry",
  bracelet: "jewelry",
  ring: "jewelry",
  earring: "jewelry",
  pendant: "jewelry",
  watch: "jewelry",
  toy: "toys",
  toys: "toys",
  game: "toys",
  puzzle: "toys",
  doll: "toys",
  action_figure: "toys",
  lego: "toys",
  home: "home",
  decor: "home",
  decoration: "home",
  lamp: "home",
  pillow: "home",
  blanket: "home",
  rug: "home",
  vase: "home",
  candle: "home",
  frame: "home",
  furniture: "home",
  kitchen: "home",
  beauty: "beauty",
  makeup: "beauty",
  cosmetic: "beauty",
  skincare: "beauty",
  cream: "beauty",
  serum: "beauty",
  lipstick: "beauty",
  perfume: "beauty",
  fragrance: "beauty",
};

function guessCategory(itemName: string, hsCode: string): string {
  const lowerName = itemName.toLowerCase();
  for (const [keyword, category] of Object.entries(ITEM_CATEGORY_MAP)) {
    if (lowerName.includes(keyword)) return category;
  }
  const hsPrefix = hsCode.substring(0, 2);
  if (["84", "85", "90"].includes(hsPrefix)) return "electronics";
  if (["61", "62", "63"].includes(hsPrefix)) return "clothing";
  if (["64"].includes(hsPrefix)) return "shoes";
  if (["42"].includes(hsPrefix)) return "bags";
  if (["71"].includes(hsPrefix)) return "jewelry";
  if (["95"].includes(hsPrefix)) return "toys";
  return "default";
}

// ── Main Customs Calculation ──────────────────────────────────────────────────

export function calculateCustoms(
  originCountry: string,
  destinationCountry: string,
  items: CustomsItem[],
  currency: string = "USD",
  shippingCost: number = 0
): {
  items: CustomsItemResult[];
  summary: CustomsSummary;
  deMinimis: DeMinimisInfo;
  warnings: CustomsWarning[];
  tips: string[];
} {
  const destData = getCountryData(destinationCountry);
  const warnings: CustomsWarning[] = [];
  const tips: string[] = [];
  const itemResults: CustomsItemResult[] = [];

  let totalDeclaredValue = 0;
  let _totalWeight = 0;
  let totalDuties = 0;
  let totalVAT = 0;
  let totalTaxes = 0;

  for (const item of items) {
    const itemTotalValue = item.unitValue * item.quantity;
    totalDeclaredValue += itemTotalValue;
    _totalWeight += item.weightKg * item.quantity;

    const category = guessCategory(item.name, item.hsCode);
    const hsRate = getHSCodeRate(item.hsCode);

    let dutyRate: number;
    let vatRate: number;
    const notes: string[] = [];

    if (hsRate) {
      dutyRate = hsRate.dutyRate;
      vatRate = destData.vatRates.standard;
      notes.push(hsRate.notes);
      if (hsRate.restricted) {
        warnings.push({
          type: "restricted",
          severity: "warning",
          message: `"${item.name}" (HS ${item.hsCode}) may require additional documentation or permits in ${destData.countryName}`,
          item: item.name,
        });
      }
    } else {
      dutyRate = getCategoryDutyRate(destinationCountry, category);
      vatRate = destData.vatRates.standard;
      notes.push(`Category: ${category} (estimated duty: ${(dutyRate * 100).toFixed(1)}%)`);
    }

    if (isProhibited(destinationCountry, item.name)) {
      warnings.push({
        type: "prohibited",
        severity: "critical",
        message: `"${item.name}" may be prohibited in ${destData.countryName}. Check local regulations before shipping.`,
        item: item.name,
      });
    }

    if (isRestricted(destinationCountry, item.name)) {
      warnings.push({
        type: "restricted",
        severity: "warning",
        message: `"${item.name}" may be restricted in ${destData.countryName}. Additional documentation may be required.`,
        item: item.name,
      });
    }

    const dutyAmount = itemTotalValue * dutyRate;
    const vatBase = itemTotalValue + dutyAmount + shippingCost;
    const vatAmount = vatBase * vatRate;
    const taxAmount = 0;
    const totalItemTaxes = dutyAmount + vatAmount + taxAmount;
    const landedCost = itemTotalValue + shippingCost + totalItemTaxes;

    totalDuties += dutyAmount;
    totalVAT += vatAmount;
    totalTaxes += taxAmount;

    itemResults.push({
      name: item.name,
      hsCode: item.hsCode,
      quantity: item.quantity,
      unitValue: item.unitValue,
      totalValue: itemTotalValue,
      weightKg: item.weightKg * item.quantity,
      dutyRate,
      dutyAmount,
      vatRate,
      vatAmount,
      taxRate: 0,
      taxAmount,
      totalTaxes: totalItemTaxes,
      landedCost,
      notes,
    });
  }

  const deMinimis = getDeMinimisInfo(destinationCountry, destData);

  if (totalDeclaredValue <= deMinimis.threshold && deMinimis.applies) {
    tips.push(`Order value (${currency} ${totalDeclaredValue.toFixed(2)}) is under ${destData.countryName}'s de minimis threshold (${deMinimis.currency} ${deMinimis.threshold}). Duties may be waived.`);
  }

  if (totalDeclaredValue > deMinimis.threshold && deMinimis.applies) {
    warnings.push({
      type: "value_threshold",
      severity: "info",
      message: `Order value exceeds de minimis threshold. Full customs duties and taxes will apply.`,
    });
  }

  if (destData.averageClearanceDays > 2) {
    tips.push(`${destData.countryName} has an average customs clearance time of ${destData.averageClearanceDays} days. Plan accordingly.`);
  }

  if (destData.requiresCustomsForm) {
    tips.push(`Customs declaration form required for ${destData.countryName}. Ensure accurate HS codes and declared values.`);
  }

  const totalFees = 0;
  const totalLandedCost = totalDeclaredValue + shippingCost + totalDuties + totalVAT + totalTaxes + totalFees;
  const effectiveTaxRate = totalDeclaredValue > 0 ? ((totalDuties + totalVAT + totalTaxes) / totalDeclaredValue) * 100 : 0;

  const breakdown = [
    { name: "Product Value", amount: totalDeclaredValue, color: "#3b82f6" },
    { name: "Shipping", amount: shippingCost, color: "#f97316" },
    { name: "Import Duties", amount: totalDuties, color: "#ef4444" },
    { name: "VAT/GST", amount: totalVAT, color: "#a855f7" },
    { name: "Other Taxes", amount: totalTaxes, color: "#eab308" },
    { name: "Fees", amount: totalFees, color: "#6b7280" },
  ].filter((b) => b.amount > 0);

  const summary: CustomsSummary = {
    subtotal: totalDeclaredValue,
    shippingCost,
    totalDuties,
    totalVAT,
    totalTaxes,
    totalFees,
    totalLandedCost,
    effectiveTaxRate,
    breakdown,
  };

  return {
    items: itemResults,
    summary,
    deMinimis,
    warnings,
    tips,
  };
}

// ── De Minimis Calculation ────────────────────────────────────────────────────

export function getDeMinimisInfo(countryCode: string, data: CountryCustomsData): DeMinimisInfo {
  const threshold = data.deMinimisThreshold;
  const currency = data.deMinimisCurrency;

  const explanations: Record<string, string> = {
    US: "The US de minimis threshold is $800. Shipments valued under $800 are generally duty-free.",
    GB: "The UK de minimis threshold is £135. For goods over £135, VAT is collected at the border.",
    DE: "EU de minimis threshold is €150 for customs duties. VAT applies to all B2C distance sales.",
    FR: "EU de minimis threshold is €150. Same rules as Germany.",
    CA: "Canada has a low de minimis threshold of CAD $20. Most shipments incur duties and taxes.",
    AU: "Australia's de minimis threshold is AUD $1000. Below this, no import duty applies.",
    JP: "Japan's de minimis threshold is ¥10,000 (approximately $65-70).",
    BR: "Brazil has a very low de minimis threshold of $50. High import duties apply.",
    IN: "India's de minimis threshold is $50 for most items.",
    AE: "UAE de minimis threshold is AED 1000 (approximately $270).",
    SG: "Singapore's de minimis threshold is SGD 400. Most goods are duty-free.",
    KR: "South Korea's de minimis threshold is $150 for customs duties.",
    SA: "Saudi Arabia's de minimis threshold is SAR 1000 (approximately $270).",
    MX: "Mexico's de minimis threshold is $50 USD. Duties apply on most imports.",
  };

  return {
    threshold,
    currency,
    applies: true,
    explanation: explanations[countryCode.toUpperCase()] || `De minimis threshold for ${countryCode} is ${currency} ${threshold}.`,
  };
}

// ── HS Code Lookup ────────────────────────────────────────────────────────────

const HS_CODE_DESCRIPTIONS: Record<string, string> = {
  "8517": "Telephones & communication devices",
  "8518": "Headphones, earphones, speakers",
  "8528": "Monitors, projectors, displays",
  "6110": "Jerseys, sweaters, pullovers (knitted)",
  "6104": "Women's suits, dresses (knitted)",
  "6403": "Footwear with leather uppers",
  "6402": "Footwear with rubber/plastic uppers",
  "4202": "Bags, cases, wallets",
  "9503": "Toys, puzzles, models",
  "3304": "Beauty / cosmetic preparations",
  "8471": "Computers, laptops, tablets",
  "7113": "Jewelry of precious metal",
  "9405": "Lamps, lighting fittings",
  "8516": "Electric water/space heaters",
};

const HS_KEYWORDS: Record<string, string[]> = {
  "8517": ["phone", "smartphone", "mobile"],
  "8518": ["earbuds", "earphones", "headphones", "speaker", "audio"],
  "8528": ["monitor", "display", "projector", "screen"],
  "6110": ["sweater", "pullover", "jersey", "knit", "shirt", "t-shirt"],
  "6403": ["leather shoe", "boot", "leather sneaker"],
  "6402": ["rubber shoe", "plastic shoe", "sneaker", "athletic shoe"],
  "4202": ["bag", "wallet", "handbag", "backpack", "clutch"],
  "9503": ["toy", "puzzle", "doll", "figure", "game"],
  "3304": ["makeup", "cosmetic", "beauty", "lipstick", "serum"],
  "8471": ["laptop", "computer", "tablet", "macbook"],
  "7113": ["jewelry", "necklace", "bracelet", "ring", "earring"],
  "9405": ["lamp", "light", "chandelier"],
  "8516": ["heater", "hair dryer", "straightener"],
};

export function lookupHSCode(itemName: string): { hsCode: string; description: string; confidence: number } | null {
  const lowerName = itemName.toLowerCase();

  for (const [code, description] of Object.entries(HS_CODE_DESCRIPTIONS)) {
    const kws = HS_KEYWORDS[code] || [];
    for (const kw of kws) {
      if (lowerName.includes(kw)) {
        return { hsCode: code, description, confidence: 0.85 };
      }
    }
  }

  return null;
}

// ── Utility Functions ─────────────────────────────────────────────────────────

export function estimateCustomsValue(
  productCost: number,
  quantity: number,
  shippingCost: number
): number {
  return productCost * quantity + shippingCost;
}

export function calculateEffectiveTaxRate(totalTaxes: number, declaredValue: number): number {
  if (declaredValue <= 0) return 0;
  return (totalTaxes / declaredValue) * 100;
}

export function formatCurrency(amount: number, currency: string): string {
  const formatters: Record<string, Intl.NumberFormat> = {};
  if (!formatters[currency]) {
    try {
      formatters[currency] = new Intl.NumberFormat("en-US", { style: "currency", currency });
    } catch {
      formatters[currency] = new Intl.NumberFormat("en-US", { style: "decimal", minimumFractionDigits: 2 });
    }
  }
  return formatters[currency].format(amount);
}
