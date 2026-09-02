export interface TaxRate {
  id: string;
  country: string;
  state?: string;
  city?: string;
  taxType: "sales_tax" | "vat" | "gst" | "customs" | "import_duty";
  rate: number;
  effectiveDate: string;
  expiryDate?: string;
  isActive: boolean;
  description?: string;
}

export interface TaxCalculation {
  subtotal: number;
  taxAmount: number;
  totalWithTax: number;
  effectiveTaxRate: number;
  taxBreakdown: TaxBreakdownItem[];
}

export interface TaxBreakdownItem {
  taxType: string;
  jurisdiction: string;
  rate: number;
  amount: number;
}

export interface TaxEstimateInput {
  amount: number;
  country: string;
  state?: string;
  city?: string;
  productCategory?: string;
}

export interface TaxReport {
  period: string;
  totalSales: number;
  totalTaxCollected: number;
  taxByJurisdiction: Array<{
    jurisdiction: string;
    taxType: string;
    sales: number;
    taxCollected: number;
  }>;
  taxByType: Array<{
    taxType: string;
    total: number;
  }>;
}

const taxRates: Map<string, TaxRate> = new Map();
const taxCalculationHistory: Array<{ input: TaxEstimateInput; result: TaxCalculation; timestamp: string }> = [];

const DEFAULT_TAX_RATES: TaxRate[] = [
  { id: "us_federal", country: "US", taxType: "customs", rate: 0, effectiveDate: "2024-01-01", isActive: true, description: "US Federal Customs" },
  { id: "us_ca", country: "US", state: "CA", taxType: "sales_tax", rate: 0.0725, effectiveDate: "2024-01-01", isActive: true, description: "California Sales Tax" },
  { id: "us_ny", country: "US", state: "NY", taxType: "sales_tax", rate: 0.08, effectiveDate: "2024-01-01", isActive: true, description: "New York Sales Tax" },
  { id: "us_tx", country: "US", state: "TX", taxType: "sales_tax", rate: 0.0625, effectiveDate: "2024-01-01", isActive: true, description: "Texas Sales Tax" },
  { id: "us_fl", country: "US", state: "FL", taxType: "sales_tax", rate: 0.06, effectiveDate: "2024-01-01", isActive: true, description: "Florida Sales Tax" },
  { id: "us_wa", country: "US", state: "WA", taxType: "sales_tax", rate: 0.065, effectiveDate: "2024-01-01", isActive: true, description: "Washington Sales Tax" },
  { id: "us_il", country: "US", state: "IL", taxType: "sales_tax", rate: 0.0625, effectiveDate: "2024-01-01", isActive: true, description: "Illinois Sales Tax" },
  { id: "us_pa", country: "US", state: "PA", taxType: "sales_tax", rate: 0.06, effectiveDate: "2024-01-01", isActive: true, description: "Pennsylvania Sales Tax" },
  { id: "us_oh", country: "US", state: "OH", taxType: "sales_tax", rate: 0.0575, effectiveDate: "2024-01-01", isActive: true, description: "Ohio Sales Tax" },
  { id: "us_ga", country: "US", state: "GA", taxType: "sales_tax", rate: 0.04, effectiveDate: "2024-01-01", isActive: true, description: "Georgia Sales Tax" },
  { id: "us_nc", country: "US", state: "NC", taxType: "sales_tax", rate: 0.0475, effectiveDate: "2024-01-01", isActive: true, description: "North Carolina Sales Tax" },
  { id: "us_mi", country: "US", state: "MI", taxType: "sales_tax", rate: 0.06, effectiveDate: "2024-01-01", isActive: true, description: "Michigan Sales Tax" },
  { id: "us_nj", country: "US", state: "NJ", taxType: "sales_tax", rate: 0.06625, effectiveDate: "2024-01-01", isActive: true, description: "New Jersey Sales Tax" },
  { id: "us_va", country: "US", state: "VA", taxType: "sales_tax", rate: 0.053, effectiveDate: "2024-01-01", isActive: true, description: "Virginia Sales Tax" },
  { id: "uk_vat", country: "UK", taxType: "vat", rate: 0.20, effectiveDate: "2024-01-01", isActive: true, description: "UK VAT" },
  { id: "de_vat", country: "DE", taxType: "vat", rate: 0.19, effectiveDate: "2024-01-01", isActive: true, description: "Germany VAT" },
  { id: "fr_vat", country: "FR", taxType: "vat", rate: 0.20, effectiveDate: "2024-01-01", isActive: true, description: "France VAT" },
  { id: "it_vat", country: "IT", taxType: "vat", rate: 0.22, effectiveDate: "2024-01-01", isActive: true, description: "Italy VAT" },
  { id: "es_vat", country: "ES", taxType: "vat", rate: 0.21, effectiveDate: "2024-01-01", isActive: true, description: "Spain VAT" },
  { id: "nl_vat", country: "NL", taxType: "vat", rate: 0.21, effectiveDate: "2024-01-01", isActive: true, description: "Netherlands VAT" },
  { id: "au_gst", country: "AU", taxType: "gst", rate: 0.10, effectiveDate: "2024-01-01", isActive: true, description: "Australia GST" },
  { id: "ca_gst", country: "CA", taxType: "gst", rate: 0.05, effectiveDate: "2024-01-01", isActive: true, description: "Canada GST" },
  { id: "ca_bc_pst", country: "CA", state: "BC", taxType: "gst", rate: 0.12, effectiveDate: "2024-01-01", isActive: true, description: "British Columbia GST+PST" },
  { id: "ca_on_hst", country: "CA", state: "ON", taxType: "gst", rate: 0.13, effectiveDate: "2024-01-01", isActive: true, description: "Ontario HST" },
  { id: "ca_qc_qst", country: "CA", state: "QC", taxType: "gst", rate: 0.14975, effectiveDate: "2024-01-01", isActive: true, description: "Quebec GST+QST" },
  { id: "jp_consumption", country: "JP", taxType: "gst", rate: 0.10, effectiveDate: "2024-01-01", isActive: true, description: "Japan Consumption Tax" },
  { id: "in_gst", country: "IN", taxType: "gst", rate: 0.18, effectiveDate: "2024-01-01", isActive: true, description: "India GST" },
  { id: "br_icms", country: "BR", taxType: "customs", rate: 0.17, effectiveDate: "2024-01-01", isActive: true, description: "Brazil ICMS" },
  { id: "mx_iva", country: "MX", taxType: "vat", rate: 0.16, effectiveDate: "2024-01-01", isActive: true, description: "Mexico IVA" },
];

export function initializeDefaultTaxRates(): void {
  for (const rate of DEFAULT_TAX_RATES) {
    taxRates.set(rate.id, rate);
  }
}

export function clearAllTaxRates(): void {
  taxRates.clear();
}

export function addTaxRate(input: Omit<TaxRate, "id">): TaxRate {
  const id = `tax_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rate: TaxRate = { ...input, id };
  taxRates.set(id, rate);
  return rate;
}

export function getTaxRate(id: string): TaxRate | null {
  return taxRates.get(id) || null;
}

export function getTaxRatesByCountry(country: string): TaxRate[] {
  return Array.from(taxRates.values()).filter(
    (r) => r.country === country && r.isActive
  );
}

export function getTaxRatesByState(country: string, state: string): TaxRate[] {
  return Array.from(taxRates.values()).filter(
    (r) => r.country === country && r.state === state && r.isActive
  );
}

export function getAllTaxRates(): TaxRate[] {
  return Array.from(taxRates.values()).filter((r) => r.isActive);
}

export function updateTaxRate(id: string, updates: Partial<TaxRate>): TaxRate | null {
  const existing = taxRates.get(id);
  if (!existing) return null;

  const updated = { ...existing, ...updates, id: existing.id };
  taxRates.set(id, updated);
  return updated;
}

export function deleteTaxRate(id: string): boolean {
  const existing = taxRates.get(id);
  if (!existing) return false;

  existing.isActive = false;
  taxRates.set(id, existing);
  return true;
}

export function calculateTax(input: TaxEstimateInput): TaxCalculation {
  const { amount, country, state, city } = input;
  const taxBreakdown: TaxBreakdownItem[] = [];
  let totalTax = 0;

  const applicableRates = state
    ? getTaxRatesByState(country, state)
    : getTaxRatesByCountry(country);

  for (const rate of applicableRates) {
    const taxAmount = +(amount * rate.rate).toFixed(2);
    totalTax += taxAmount;

    taxBreakdown.push({
      taxType: rate.taxType,
      jurisdiction: state ? `${country}/${state}` : country,
      rate: rate.rate,
      amount: taxAmount,
    });
  }

  const effectiveTaxRate = amount > 0 ? +((totalTax / amount) * 100).toFixed(2) : 0;

  const result: TaxCalculation = {
    subtotal: amount,
    taxAmount: +totalTax.toFixed(2),
    totalWithTax: +(amount + totalTax).toFixed(2),
    effectiveTaxRate,
    taxBreakdown,
  };

  taxCalculationHistory.push({ input, result, timestamp: new Date().toISOString() });

  return result;
}

export function estimateTaxForOrder(order: {
  subtotal: number;
  shippingCost: number;
  country: string;
  state?: string;
  city?: string;
}): TaxCalculation {
  const taxableAmount = order.subtotal + order.shippingCost;
  return calculateTax({
    amount: taxableAmount,
    country: order.country,
    state: order.state,
    city: order.city,
  });
}

export function generateTaxReport(period: {
  startDate: string;
  endDate: string;
  sales: Array<{
    amount: number;
    taxAmount: number;
    country: string;
    state?: string;
    taxType: string;
  }>;
}): TaxReport {
  const { sales } = period;
  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0);
  const totalTaxCollected = sales.reduce((sum, s) => sum + s.taxAmount, 0);

  const jurisdictionMap = new Map<string, { sales: number; taxCollected: number; taxType: string }>();
  const taxTypeMap = new Map<string, number>();

  for (const sale of sales) {
    const jurisdiction = sale.state ? `${sale.country}/${sale.state}` : sale.country;
    const existing = jurisdictionMap.get(jurisdiction) || { sales: 0, taxCollected: 0, taxType: sale.taxType };
    existing.sales += sale.amount;
    existing.taxCollected += sale.taxAmount;
    jurisdictionMap.set(jurisdiction, existing);

    taxTypeMap.set(sale.taxType, (taxTypeMap.get(sale.taxType) || 0) + sale.taxAmount);
  }

  return {
    period: `${period.startDate} to ${period.endDate}`,
    totalSales: +totalSales.toFixed(2),
    totalTaxCollected: +totalTaxCollected.toFixed(2),
    taxByJurisdiction: Array.from(jurisdictionMap.entries()).map(([jurisdiction, data]) => ({
      jurisdiction,
      ...data,
      sales: +data.sales.toFixed(2),
      taxCollected: +data.taxCollected.toFixed(2),
    })),
    taxByType: Array.from(taxTypeMap.entries()).map(([taxType, total]) => ({
      taxType,
      total: +total.toFixed(2),
    })),
  };
}

export function getTaxCalculationHistory(limit: number = 50): Array<{ input: TaxEstimateInput; result: TaxCalculation; timestamp: string }> {
  return taxCalculationHistory
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

export function validateTaxInput(input: TaxEstimateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.amount || input.amount <= 0) {
    errors.push("Amount must be greater than 0");
  }
  if (!input.country || input.country.length !== 2) {
    errors.push("Valid country code is required (2-letter ISO code)");
  }

  return { valid: errors.length === 0, errors };
}
