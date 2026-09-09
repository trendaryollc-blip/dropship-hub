import { z } from "zod";
import { createTool } from "./registry";
import { searchAllPlatforms } from "@/lib/platform-search";
import { addFavorite, removeFavorite, getFavorites, isFavorited } from "@/lib/data/favorites";
import { getProductLifecycles } from "@/lib/data/product-lifecycle";
import { getSearchHistory } from "@/lib/data/search-history";
import { getProductValidations } from "@/lib/data/product-validations";

// ─── Search Products ────────────────────────────────────────────────────────

export const searchProductsTool = createTool({
  id: "search_products",
  name: "Search Products",
  description: "Search for products across 12+ platforms (Amazon, eBay, AliExpress, CJ, Google Shopping, Walmart, Etsy, etc.)",
  category: "search",
  safetyLevel: "safe",
  inputSchema: z.object({
    query: z.string().min(1).max(500),
    platforms: z.array(z.string()).optional(),
  }),
  execute: async (input, _ctx) => {
    const results = await searchAllPlatforms(
      input.query as string,
      input.platforms as string[] | undefined
    );
    return {
      success: true,
      data: results,
      summary: `Found ${results.length} results for "${input.query}" across ${results.length} platforms.`,
    };
  },
});

// ─── Save Product (Add to Favorites) ────────────────────────────────────────

export const saveProductTool = createTool({
  id: "save_product",
  name: "Save Product",
  description: "Save a product to favorites for later access",
  category: "action",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(["product", "supplier", "niche"]).default("product"),
  }),
  execute: async (input, ctx) => {
    await addFavorite(ctx.uid, input.type as "product" | "supplier" | "niche", input.productId as string, input.title as string);
    return {
      success: true,
      data: { productId: input.productId, title: input.title },
      summary: `Saved "${input.title}" to favorites.`,
    };
  },
});

// ─── Remove Product from Favorites ──────────────────────────────────────────

export const removeProductTool = createTool({
  id: "remove_product",
  name: "Remove Product",
  description: "Remove a product from favorites",
  category: "action",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().min(1),
    type: z.enum(["product", "supplier", "niche"]).default("product"),
  }),
  execute: async (input, ctx) => {
    await removeFavorite(ctx.uid, input.type as "product" | "supplier" | "niche", input.productId as string);
    return {
      success: true,
      data: { productId: input.productId },
      summary: `Removed product from favorites.`,
    };
  },
});

// ─── Get Saved Products ─────────────────────────────────────────────────────

export const getSavedProductsTool = createTool({
  id: "get_saved_products",
  name: "Get Saved Products",
  description: "Retrieve all saved/favorited products",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    type: z.enum(["product", "supplier", "niche"]).optional(),
  }),
  execute: async (input, ctx) => {
    const favorites = await getFavorites(ctx.uid, input.type as "product" | "supplier" | "niche" | undefined);
    return {
      success: true,
      data: favorites,
      summary: `Found ${favorites.length} saved items.`,
    };
  },
});

// ─── Check if Product is Saved ──────────────────────────────────────────────

export const checkSavedTool = createTool({
  id: "check_saved",
  name: "Check if Saved",
  description: "Check if a product is already in favorites",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    productId: z.string().min(1),
    type: z.enum(["product", "supplier", "niche"]).default("product"),
  }),
  execute: async (input, ctx) => {
    const saved = await isFavorited(ctx.uid, input.type as "product" | "supplier" | "niche", input.productId as string);
    return {
      success: true,
      data: { productId: input.productId, isSaved: saved },
      summary: saved ? "Product is saved in favorites." : "Product is not saved.",
    };
  },
});

// ─── Get Product Lifecycle ──────────────────────────────────────────────────

export const getProductLifecycleTool = createTool({
  id: "get_product_lifecycle",
  name: "Get Product Lifecycle",
  description: "Get lifecycle stage (discovery, testing, winning, scaling, saturation, sunset) for tracked products",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const lifecycles = await getProductLifecycles(ctx.uid);
    return {
      success: true,
      data: lifecycles,
      summary: `Found ${lifecycles.length} tracked products. Stages: ${lifecycles.map((l) => `${l.productTitle} (${l.currentStage})`).join(", ") || "none tracked"}.`,
    };
  },
});

// ─── Get Search History ─────────────────────────────────────────────────────

export const getSearchHistoryTool = createTool({
  id: "get_search_history",
  name: "Get Search History",
  description: "Retrieve recent product search history",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async (input, ctx) => {
    const history = await getSearchHistory(ctx.uid, input.limit as number);
    return {
      success: true,
      data: history,
      summary: `Found ${history.length} recent searches.`,
    };
  },
});

// ─── Get Product Validations ────────────────────────────────────────────────

export const getProductValidationsTool = createTool({
  id: "get_product_validations",
  name: "Get Product Validations",
  description: "Get saved product validation scores (Golden Score analysis)",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async (input, ctx) => {
    const validations = await getProductValidations(ctx.uid, input.limit as number);
    return {
      success: true,
      data: validations,
      summary: `Found ${validations.length} product validations.`,
    };
  },
});
