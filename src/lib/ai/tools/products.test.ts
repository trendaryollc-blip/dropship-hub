import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchProductsTool,
  saveProductTool,
  removeProductTool,
  getSavedProductsTool,
  checkSavedTool,
  getProductLifecycleTool,
  getSearchHistoryTool,
  getProductValidationsTool,
} from "./products";

vi.mock("@/lib/data/favorites", () => ({
  addFavorite: vi.fn().mockResolvedValue(undefined),
  removeFavorite: vi.fn().mockResolvedValue(undefined),
  getFavorites: vi.fn().mockResolvedValue([]),
  isFavorited: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/platform-search", () => ({
  searchAllPlatforms: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/product-lifecycle", () => ({
  getProductLifecycles: vi.fn().mockResolvedValue([]),
  addProductLifecycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/data/search-history", () => ({
  addSearchHistory: vi.fn().mockResolvedValue(undefined),
  getSearchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/lib/data/product-validations", () => ({
  addProductValidation: vi.fn().mockResolvedValue(undefined),
  getProductValidations: vi.fn().mockResolvedValue([]),
}));

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Product Tools", () => {
  describe("searchProductsTool", () => {
    it("searches products across platforms", async () => {
      const result = await searchProductsTool.execute({
        query: "wireless earbuds",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("saveProductTool", () => {
    it("saves a product to favorites", async () => {
      const result = await saveProductTool.execute({
        productId: "prod_1",
        title: "Wireless Earbuds",
        type: "product",
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Saved");
    });
  });

  describe("removeProductTool", () => {
    it("removes a product from favorites", async () => {
      const result = await removeProductTool.execute({
        productId: "prod_1",
        type: "product",
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Removed");
    });
  });

  describe("getSavedProductsTool", () => {
    it("gets saved products", async () => {
      const result = await getSavedProductsTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("checkSavedTool", () => {
    it("checks if product is saved", async () => {
      const result = await checkSavedTool.execute({
        productId: "prod_1",
        type: "product",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getProductLifecycleTool", () => {
    it("gets product lifecycle data", async () => {
      const result = await getProductLifecycleTool.execute({
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("getSearchHistoryTool", () => {
    it("gets search history", async () => {
      const result = await getSearchHistoryTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("getProductValidationsTool", () => {
    it("gets product validations", async () => {
      const result = await getProductValidationsTool.execute({}, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });
});
