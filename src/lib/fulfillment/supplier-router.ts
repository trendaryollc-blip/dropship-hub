import type { RoutingResult, RoutingSupplierChoice, AutomationTrigger } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";
import { DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";

interface SupplierInventory {
  supplierId: string;
  supplierName: string;
  inStock: boolean;
  stockLevel: number;
  unitCost: number;
  shippingCost: number;
  shippingDays: number;
  reliabilityScore: number;
  qualityScore: number;
}

interface RoutingInput {
  order: FulfillmentOrder;
  supplierInventory: SupplierInventory[];
  optimization: "speed" | "cost" | "balanced";
  maxShippingDays: number;
  minReliability: number;
  customerCountry: string;
  preferLocalWarehouse: boolean;
}

function calculateTotalScore(
  supplier: SupplierInventory,
  optimization: "speed" | "cost" | "balanced",
  preferLocal: boolean
): number {
  const weights: Record<string, { reliability: number; quality: number; cost: number; speed: number; stock: number }> = {
    cost: { reliability: 0.1, quality: 0.05, cost: 0.65, speed: 0.1, stock: 0.1 },
    speed: { reliability: 0.1, quality: 0.05, cost: 0.1, speed: 0.65, stock: 0.1 },
    balanced: { reliability: 0.2, quality: 0.1, cost: 0.3, speed: 0.3, stock: 0.1 },
  };
  const w = weights[optimization];
  const localBonus = preferLocal ? 0.05 : 0;

  const normalizedReliability = supplier.reliabilityScore / 100;
  const normalizedQuality = supplier.qualityScore / 100;
  const maxCost = 200;
  const normalizedCost = 1 - Math.min(supplier.unitCost + supplier.shippingCost, maxCost) / maxCost;
  const normalizedSpeed = 1 - Math.min(supplier.shippingDays, 30) / 30;
  const normalizedStock = Math.min(supplier.stockLevel, 100) / 100;

  const score =
    normalizedReliability * w.reliability +
    normalizedQuality * w.quality +
    normalizedCost * w.cost +
    normalizedSpeed * w.speed +
    normalizedStock * w.stock +
    localBonus;

  return Math.round(Math.min(Math.max(score * 100, 0), 100));
}

function buildRejectionReason(supplier: SupplierInventory, input: RoutingInput): string | null {
  if (!supplier.inStock) return "Out of stock";
  if (supplier.stockLevel <= 0) return "Zero stock level";
  if (supplier.reliabilityScore < input.minReliability) return `Reliability ${supplier.reliabilityScore}% below minimum ${input.minReliability}%`;
  if (supplier.shippingDays > input.maxShippingDays) return `Shipping ${supplier.shippingDays} days exceeds max ${input.maxShippingDays}`;
  if (supplier.unitCost + supplier.shippingCost <= 0) return "Invalid pricing";
  return null;
}

function rankSuppliers(input: RoutingInput): RoutingSupplierChoice[] {
  const choices: RoutingSupplierChoice[] = input.supplierInventory.map((supplier) => {
    const rejectionReason = buildRejectionReason(supplier, input);
    const totalCost = supplier.unitCost + supplier.shippingCost;
    const totalScore = rejectionReason ? 0 : calculateTotalScore(supplier, input.optimization, input.preferLocalWarehouse);

    return {
      supplierId: supplier.supplierId,
      supplierName: supplier.supplierName,
      unitCost: supplier.unitCost,
      shippingCost: supplier.shippingCost,
      totalCost,
      shippingDays: supplier.shippingDays,
      inStock: supplier.inStock,
      stockLevel: supplier.stockLevel,
      reliabilityScore: supplier.reliabilityScore,
      qualityScore: supplier.qualityScore,
      totalScore,
      rejectionReason: rejectionReason || undefined,
    };
  });

  choices.sort((a, b) => {
    if (a.rejectionReason && !b.rejectionReason) return 1;
    if (!a.rejectionReason && b.rejectionReason) return -1;
    return b.totalScore - a.totalScore;
  });

  return choices;
}

function buildReasoning(selected: RoutingSupplierChoice, optimization: string): string {
  if (selected.rejectionReason) {
    return `Selected ${selected.supplierName} despite: ${selected.rejectionReason}. No better alternatives available.`;
  }
  const factors: string[] = [];
  if (optimization === "cost") factors.push(`lowest cost ($${selected.totalCost.toFixed(2)})`);
  if (optimization === "speed") factors.push(`fastest shipping (${selected.shippingDays} days)`);
  if (optimization === "balanced") factors.push(`best balance of cost ($${selected.totalCost.toFixed(2)}) and speed (${selected.shippingDays} days)`);
  factors.push(`${selected.reliabilityScore}% reliability`);
  factors.push(`${selected.stockLevel} units in stock`);
  return `Selected ${selected.supplierName}: ${factors.join(", ")}.`;
}

export function routeOrder(input: RoutingInput): RoutingResult {
  const ranked = rankSuppliers(input);
  const selected = ranked[0];

  if (!selected) {
    return {
      orderId: input.order.id,
      selectedSupplier: {
        supplierId: "manual",
        supplierName: "Manual",
        unitCost: 0,
        shippingCost: 0,
        totalCost: 0,
        shippingDays: 30,
        inStock: true,
        stockLevel: 0,
        reliabilityScore: 100,
        qualityScore: 100,
        totalScore: 0,
        rejectionReason: "No suppliers available",
      },
      alternatives: [],
      reason: "No suppliers available for this order. Manual fulfillment required.",
      routedAt: new Date().toISOString(),
      ruleId: null,
      trigger: "manual",
    };
  }

  return {
    orderId: input.order.id,
    selectedSupplier: selected,
    alternatives: ranked.slice(1, 6),
    reason: buildReasoning(selected, input.optimization),
    routedAt: new Date().toISOString(),
    ruleId: null,
    trigger: "manual",
  };
}

export function createRoutingInput(
  order: FulfillmentOrder,
  supplierInventory: SupplierInventory[],
  optimization: "speed" | "cost" | "balanced" = "balanced",
  settings?: {
    maxShippingDays?: number;
    minReliability?: number;
    preferLocalWarehouse?: boolean;
  }
): RoutingInput {
  return {
    order,
    supplierInventory,
    optimization,
    maxShippingDays: settings?.maxShippingDays ?? DEFAULT_FULFILLMENT_SETTINGS.maxShippingDays,
    minReliability: settings?.minReliability ?? DEFAULT_FULFILLMENT_SETTINGS.minReliabilityScore,
    customerCountry: order.shippingAddress?.country || "US",
    preferLocalWarehouse: settings?.preferLocalWarehouse ?? false,
  };
}

export function selectBestSupplier(
  suppliers: SupplierInventory[],
  optimization: "speed" | "cost" | "balanced" = "balanced",
  minReliability: number = 80
): SupplierInventory | null {
  const eligible = suppliers.filter(
    (s) => s.inStock && s.stockLevel > 0 && s.reliabilityScore >= minReliability
  );
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const scoreA = calculateTotalScore(a, optimization, false);
    const scoreB = calculateTotalScore(b, optimization, false);
    return scoreB - scoreA;
  });

  return eligible[0];
}
