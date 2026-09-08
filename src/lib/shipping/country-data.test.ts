import { describe, it, expect } from "vitest";
import {
  getCountryData,
  getZone,
  getHSCodeRate,
  isSameCountry,
  getSupportedCountries,
  getCategoryDutyRate,
  isProhibited,
  isRestricted,
  COUNTRY_CUSTOMS_DATA,
  SHIPPING_ZONES,
  HS_CODE_RATES,
} from "@/lib/shipping/country-data";

describe("Country Data", () => {
  describe("getCountryData", () => {
    it("returns US customs data", () => {
      const data = getCountryData("US");
      expect(data.countryCode).toBe("US");
      expect(data.countryName).toBe("United States");
      expect(data.deMinimisThreshold).toBe(800);
      expect(data.currency).toBe("USD");
    });

    it("returns UK customs data", () => {
      const data = getCountryData("GB");
      expect(data.countryCode).toBe("GB");
      expect(data.countryName).toBe("United Kingdom");
      expect(data.vatRates.standard).toBe(0.20);
    });

    it("returns Germany customs data", () => {
      const data = getCountryData("DE");
      expect(data.countryCode).toBe("DE");
      expect(data.vatRates.standard).toBe(0.19);
    });

    it("returns default data for unknown country", () => {
      const data = getCountryData("XX");
      expect(data.countryCode).toBe("XX");
      expect(data.countryName).toBe("Unknown");
    });

    it("handles lowercase country codes", () => {
      const data = getCountryData("us");
      expect(data.countryCode).toBe("US");
    });

    it("has import duty rates", () => {
      const data = getCountryData("US");
      expect(data.importDuty.electronics).toBeDefined();
      expect(data.importDuty.clothing).toBeDefined();
    });

    it("has prohibited items list", () => {
      const data = getCountryData("US");
      expect(data.prohibitedItems.length).toBeGreaterThan(0);
    });

    it("has restricted items list", () => {
      const data = getCountryData("US");
      expect(data.restrictedItems.length).toBeGreaterThan(0);
    });
  });

  describe("getZone", () => {
    it("returns zone multiplier for CN to US", () => {
      const multiplier = getZone("CN", "US");
      expect(multiplier).toBeGreaterThan(1);
    });

    it("returns 1.0 for same zone", () => {
      const multiplier = getZone("CN", "CN");
      expect(multiplier).toBe(1.0);
    });

    it("returns different multipliers for different routes", () => {
      const cnToUS = getZone("CN", "US");
      const cnToDE = getZone("CN", "DE");
      expect(cnToUS).not.toBe(cnToDE);
    });

    it("returns default multiplier for unknown zones", () => {
      const multiplier = getZone("XX", "YY");
      expect(multiplier).toBeGreaterThan(0);
    });

    it("handles EU internal shipping", () => {
      const multiplier = getZone("DE", "FR");
      expect(multiplier).toBeGreaterThan(0);
    });
  });

  describe("getHSCodeRate", () => {
    it("returns rate for electronics HS code 8517", () => {
      const rate = getHSCodeRate("8517");
      expect(rate).toBeDefined();
      expect(rate?.hsCode).toBe("8517");
      expect(rate?.dutyRate).toBe(0);
    });

    it("returns rate for clothing HS code 6110", () => {
      const rate = getHSCodeRate("6110");
      expect(rate).toBeDefined();
      expect(rate?.dutyRate).toBeGreaterThan(0);
    });

    it("returns rate for shoes HS code 6403", () => {
      const rate = getHSCodeRate("6403");
      expect(rate).toBeDefined();
      expect(rate?.dutyRate).toBe(0.169);
    });

    it("returns null for unknown HS code", () => {
      const rate = getHSCodeRate("9999");
      expect(rate).toBeNull();
    });

    it("marks restricted items", () => {
      const rate = getHSCodeRate("3304");
      expect(rate?.restricted).toBe(true);
    });
  });

  describe("isSameCountry", () => {
    it("returns true for same country", () => {
      expect(isSameCountry("US", "US")).toBe(true);
    });

    it("returns true for case-insensitive match", () => {
      expect(isSameCountry("us", "US")).toBe(true);
    });

    it("returns false for different countries", () => {
      expect(isSameCountry("US", "GB")).toBe(false);
    });
  });

  describe("getSupportedCountries", () => {
    it("returns list of supported countries", () => {
      const countries = getSupportedCountries();
      expect(countries.length).toBeGreaterThan(10);
      expect(countries).toContain("US");
      expect(countries).toContain("GB");
      expect(countries).toContain("DE");
    });
  });

  describe("getCategoryDutyRate", () => {
    it("returns electronics duty rate for US", () => {
      const rate = getCategoryDutyRate("US", "electronics");
      expect(rate).toBe(0);
    });

    it("returns clothing duty rate for US", () => {
      const rate = getCategoryDutyRate("US", "clothing");
      expect(rate).toBe(0.082);
    });

    it("returns default rate for unknown category", () => {
      const rate = getCategoryDutyRate("US", "unknown_category");
      expect(rate).toBeDefined();
    });
  });

  describe("isProhibited", () => {
    it("detects prohibited items", () => {
      expect(isProhibited("US", "narcotics")).toBe(true);
    });

    it("allows normal items", () => {
      expect(isProhibited("US", "wireless earbuds")).toBe(false);
    });
  });

  describe("isRestricted", () => {
    it("detects restricted items", () => {
      expect(isRestricted("US", "food supplement")).toBe(true);
    });

    it("allows normal items", () => {
      expect(isRestricted("US", "t-shirt")).toBe(false);
    });
  });

  describe("Data Integrity", () => {
    it("has all required country fields", () => {
      for (const [code, data] of Object.entries(COUNTRY_CUSTOMS_DATA)) {
        expect(data.countryCode).toBe(code);
        expect(data.countryName).toBeTruthy();
        expect(data.currency).toBeTruthy();
        expect(data.deMinimisThreshold).toBeGreaterThanOrEqual(0);
        expect(data.vatRates.standard).toBeGreaterThanOrEqual(0);
        expect(typeof data.importDuty).toBe("object");
        expect(Array.isArray(data.prohibitedItems)).toBe(true);
        expect(Array.isArray(data.restrictedItems)).toBe(true);
        expect(data.averageClearanceDays).toBeGreaterThan(0);
      }
    });

    it("has all shipping zones defined", () => {
      expect(Object.keys(SHIPPING_ZONES).length).toBeGreaterThan(20);
    });

    it("has all HS code rates with valid data", () => {
      for (const [code, rate] of Object.entries(HS_CODE_RATES)) {
        expect(rate.hsCode).toBe(code);
        expect(rate.description).toBeTruthy();
        expect(rate.dutyRate).toBeGreaterThanOrEqual(0);
        expect(rate.dutyRate).toBeLessThanOrEqual(1);
      }
    });
  });
});
