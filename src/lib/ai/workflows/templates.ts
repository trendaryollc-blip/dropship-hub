import type { WorkflowDefinition } from "../types";

// ─── Pre-built Workflow Templates ────────────────────────────────────────────
// Ready-to-use workflows that users can activate with one click.

export const WORKFLOW_TEMPLATES: WorkflowDefinition[] = [
  // ─── Product Launch Pipeline ─────────────────────────────────────────────
  {
    id: "product_launch",
    name: "Product Launch Pipeline",
    description: "Research, validate, and push a winning product to your store in one flow",
    steps: [
      {
        toolId: "search_products",
        inputMapping: {
          query: "$input.query",
          niche: "$input.niche",
          maxCost: "$input.maxCost",
        },
      },
      {
        toolId: "validate_product",
        inputMapping: {
          productId: "$steps.search_products.data[0].id",
        },
      },
      {
        toolId: "calculate_profit",
        inputMapping: {
          productCost: "$steps.validate_product.data.cost",
          sellingPrice: "$steps.validate_product.data.suggestedPrice",
          shippingCost: "$steps.validate_product.data.shippingCost",
        },
      },
      {
        toolId: "generate_listing",
        inputMapping: {
          productName: "$steps.validate_product.data.name",
          platform: "$input.platform",
          price: "$steps.calculate_profit.data.recommendedPrice",
        },
      },
      {
        toolId: "push_to_store",
        inputMapping: {
          productId: "$steps.validate_product.data.id",
          storeId: "$input.storeId",
          platform: "$input.platform",
          title: "$steps.validate_product.data.name",
          price: "$steps.calculate_profit.data.recommendedPrice",
        },
      },
    ],
  },

  // ─── Order Fulfillment Flow ──────────────────────────────────────────────
  {
    id: "fulfill_order",
    name: "Order Fulfillment Flow",
    description: "Route, place, and track an order automatically",
    steps: [
      {
        toolId: "route_order",
        inputMapping: {
          orderId: "$input.orderId",
          items: "$input.items",
          customerCountry: "$input.customerCountry",
        },
      },
      {
        toolId: "place_order",
        inputMapping: {
          productId: "$steps.route_order.data.selectedSupplier.productId",
          quantity: "$input.quantity",
          shippingAddress: "$input.shippingAddress",
        },
        condition: {
          field: "$steps.route_order.data.selectedSupplier",
          operator: "not_equals",
          value: "null",
        },
      },
      {
        toolId: "get_tracking",
        inputMapping: {
          cjOrderNumber: "$steps.place_order.data.orderId",
        },
      },
    ],
  },

  // ─── Daily Business Health Check ─────────────────────────────────────────
  {
    id: "daily_health_check",
    name: "Daily Business Health Check",
    description: "Run a comprehensive daily health check on your business",
    steps: [
      {
        toolId: "get_profit_entries",
        inputMapping: { limit: "30" },
      },
      {
        toolId: "get_alerts",
        inputMapping: { limit: "20" },
      },
      {
        toolId: "get_orders",
        inputMapping: { limit: "50" },
      },
      {
        toolId: "get_price_war_stats",
        inputMapping: {},
      },
    ],
  },

  // ─── Price Optimization Flow ─────────────────────────────────────────────
  {
    id: "price_optimization",
    name: "Price Optimization Flow",
    description: "Analyze competitors and optimize pricing for a product",
    steps: [
      {
        toolId: "search_products",
        inputMapping: {
          query: "$input.query",
        },
      },
      {
        toolId: "calculate_margin",
        inputMapping: {
          costPrice: "$steps.search_products.data[0].cost",
          desiredMarginPercent: "$input.targetMargin",
        },
      },
      {
        toolId: "optimize_pricing",
        inputMapping: {
          productId: "$steps.search_products.data[0].id",
          currentPrice: "$steps.search_products.data[0].price",
          costPrice: "$steps.search_products.data[0].cost",
        },
      },
    ],
  },

  // ─── Supplier Comparison Flow ────────────────────────────────────────────
  {
    id: "supplier_comparison",
    name: "Supplier Comparison Flow",
    description: "Compare suppliers for a product and get recommendations",
    steps: [
      {
        toolId: "search_suppliers",
        inputMapping: {
          query: "$input.query",
        },
      },
      {
        toolId: "get_supplier_scorecards",
        inputMapping: {},
      },
      {
        toolId: "calculate_landed_cost",
        inputMapping: {
          productCost: "$steps.search_suppliers.data[0].cost",
          shippingCost: "$steps.search_suppliers.data[0].shippingCost",
        },
      },
    ],
  },

  // ─── Shipping Rate Optimization ──────────────────────────────────────────
  {
    id: "shipping_optimization",
    name: "Shipping Rate Optimization",
    description: "Find the best shipping rates and predict delivery for an order",
    steps: [
      {
        toolId: "compare_shipping_rates",
        inputMapping: {
          originCountry: "$input.originCountry",
          destinationCountry: "$input.destinationCountry",
          weightKg: "$input.weightKg",
          lengthCm: "$input.lengthCm",
          widthCm: "$input.widthCm",
          heightCm: "$input.heightCm",
        },
      },
      {
        toolId: "predict_delivery",
        inputMapping: {
          originCountry: "$input.originCountry",
          destinationCountry: "$input.destinationCountry",
          weightKg: "$input.weightKg",
          carrierId: "cj",
        },
      },
      {
        toolId: "calculate_customs",
        inputMapping: {
          originCountry: "$input.originCountry",
          destinationCountry: "$input.destinationCountry",
          items: "$input.items",
        },
      },
    ],
  },

  // ─── Inventory Sync & Alert Flow ─────────────────────────────────────────
  {
    id: "inventory_sync_alert",
    name: "Inventory Sync & Alert",
    description: "Sync inventory from supplier and alert on low stock",
    steps: [
      {
        toolId: "get_supplier_inventory",
        inputMapping: {
          productIds: "$input.productIds",
        },
      },
      {
        toolId: "sync_inventory",
        inputMapping: {
          storeId: "$input.storeId",
          storePlatform: "$input.storePlatform",
          productMappings: "$input.productMappings",
        },
      },
    ],
  },

  // ─── Bulk Order Processing ───────────────────────────────────────────────
  {
    id: "bulk_order_processing",
    name: "Bulk Order Processing",
    description: "Route and process multiple pending orders in batch",
    steps: [
      {
        toolId: "get_orders",
        inputMapping: { limit: "50" },
      },
      {
        toolId: "bulk_route_orders",
        inputMapping: {
          orders: "$steps.get_orders.data",
          optimization: "$input.optimization",
        },
      },
      {
        toolId: "optimize_fulfillment",
        inputMapping: {
          limit: "50",
          optimization: "$input.optimization",
        },
      },
    ],
  },
];

// ─── Template Helpers ────────────────────────────────────────────────────────

export function getWorkflowTemplate(id: string): WorkflowDefinition | undefined {
  return WORKFLOW_TEMPLATES.find((t) => t.id === id);
}

export function getWorkflowTemplates(): WorkflowDefinition[] {
  return WORKFLOW_TEMPLATES;
}

export function getTemplateCategories(): string[] {
  return ["Product Launch", "Fulfillment", "Analytics", "Pricing", "Shipping", "Inventory"];
}
