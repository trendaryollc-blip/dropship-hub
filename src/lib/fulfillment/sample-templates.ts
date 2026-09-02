export interface SampleOrderTemplate {
  id: string;
  name: string;
  description: string;
  products: SampleProduct[];
  shippingAddress: ShippingAddress;
  autoTrack: boolean;
  notifyOnDelivery: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsedAt: string | null;
}

export interface SampleProduct {
  productId: string;
  productTitle: string;
  productImage?: string;
  productPrice: number;
  source: string;
  quantity: number;
  notes?: string;
}

export interface ShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface SampleOrderBatch {
  id: string;
  templateId: string;
  templateName: string;
  status: "pending" | "processing" | "completed" | "partial" | "failed";
  totalOrders: number;
  successfulOrders: number;
  failedOrders: number;
  orders: SampleOrderResult[];
  createdAt: string;
  completedAt: string | null;
}

export interface SampleOrderResult {
  productId: string;
  productTitle: string;
  success: boolean;
  orderId?: string;
  error?: string;
}

const templates: Map<string, SampleOrderTemplate> = new Map();
const batches: Map<string, SampleOrderBatch> = new Map();

export function createTemplate(input: Omit<SampleOrderTemplate, "id" | "createdAt" | "updatedAt" | "usageCount" | "lastUsedAt">): SampleOrderTemplate {
  const id = `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const template: SampleOrderTemplate = {
    ...input,
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
    lastUsedAt: null,
  };

  templates.set(id, template);
  return template;
}

export function getTemplate(id: string): SampleOrderTemplate | null {
  return templates.get(id) || null;
}

export function getAllTemplates(): SampleOrderTemplate[] {
  return Array.from(templates.values()).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function updateTemplate(id: string, updates: Partial<SampleOrderTemplate>): SampleOrderTemplate | null {
  const existing = templates.get(id);
  if (!existing) return null;

  const updated: SampleOrderTemplate = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  templates.set(id, updated);
  return updated;
}

export function deleteTemplate(id: string): boolean {
  return templates.delete(id);
}

export function duplicateTemplate(id: string, newName: string): SampleOrderTemplate | null {
  const existing = templates.get(id);
  if (!existing) return null;

  return createTemplate({
    name: newName,
    description: existing.description,
    products: [...existing.products],
    shippingAddress: { ...existing.shippingAddress },
    autoTrack: existing.autoTrack,
    notifyOnDelivery: existing.notifyOnDelivery,
  });
}

export async function executeTemplate(templateId: string): Promise<SampleOrderBatch> {
  const template = templates.get(templateId);
  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  const batch: SampleOrderBatch = {
    id: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    templateId,
    templateName: template.name,
    status: "processing",
    totalOrders: template.products.length,
    successfulOrders: 0,
    failedOrders: 0,
    orders: [],
    createdAt: new Date().toISOString(),
    completedAt: null,
  };

  batches.set(batch.id, batch);

  for (const product of template.products) {
    const result: SampleOrderResult = {
      productId: product.productId,
      productTitle: product.productTitle,
      success: false,
    };

    try {
      const { placeCJOrder } = await import("./cj-adapter");
      const orderResult = await placeCJOrder({
        productId: product.productId,
        quantity: product.quantity,
        shippingAddress: template.shippingAddress,
      });

      if (orderResult.success && orderResult.orderId) {
        result.success = true;
        result.orderId = orderResult.orderId;
        batch.successfulOrders++;
      } else {
        result.error = orderResult.error || "Order failed";
        batch.failedOrders++;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : "Order failed";
      batch.failedOrders++;
    }

    batch.orders.push(result);
  }

  batch.status = batch.failedOrders === 0 ? "completed" : batch.successfulOrders === 0 ? "failed" : "partial";
  batch.completedAt = new Date().toISOString();

  template.usageCount++;
  template.lastUsedAt = new Date().toISOString();
  templates.set(templateId, template);

  batches.set(batch.id, batch);
  return batch;
}

export function getBatch(id: string): SampleOrderBatch | null {
  return batches.get(id) || null;
}

export function getAllBatches(limit: number = 20): SampleOrderBatch[] {
  return Array.from(batches.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export function validateTemplate(input: Partial<SampleOrderTemplate>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.name || input.name.trim().length === 0) {
    errors.push("Template name is required");
  }
  if (input.name && input.name.length > 100) {
    errors.push("Template name must be 100 characters or less");
  }
  if (!input.products || input.products.length === 0) {
    errors.push("At least one product is required");
  }
  if (input.products && input.products.length > 20) {
    errors.push("Maximum 20 products per template");
  }
  if (!input.shippingAddress) {
    errors.push("Shipping address is required");
  } else {
    if (!input.shippingAddress.fullName) errors.push("Full name is required");
    if (!input.shippingAddress.street) errors.push("Street address is required");
    if (!input.shippingAddress.city) errors.push("City is required");
    if (!input.shippingAddress.country) errors.push("Country is required");
  }

  if (input.products) {
    for (let i = 0; i < input.products.length; i++) {
      const product = input.products[i];
      if (!product.productId) errors.push(`Product ${i + 1}: Product ID is required`);
      if (!product.productTitle) errors.push(`Product ${i + 1}: Product title is required`);
      if (product.quantity < 1) errors.push(`Product ${i + 1}: Quantity must be at least 1`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getTemplateStats(): {
  totalTemplates: number;
  totalExecutions: number;
  avgProductsPerTemplate: number;
  mostUsedTemplate: SampleOrderTemplate | null;
} {
  const allTemplates = Array.from(templates.values());
  const totalExecutions = allTemplates.reduce((sum, t) => sum + t.usageCount, 0);
  const avgProductsPerTemplate = allTemplates.length > 0
    ? allTemplates.reduce((sum, t) => sum + t.products.length, 0) / allTemplates.length
    : 0;
  const mostUsedTemplate = allTemplates.sort((a, b) => b.usageCount - a.usageCount)[0] || null;

  return {
    totalTemplates: allTemplates.length,
    totalExecutions,
    avgProductsPerTemplate: +avgProductsPerTemplate.toFixed(1),
    mostUsedTemplate,
  };
}
