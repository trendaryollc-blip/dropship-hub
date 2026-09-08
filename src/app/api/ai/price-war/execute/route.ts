import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getPriceRules, updatePriceRule, addPriceAdjustmentLog } from "@/lib/data/price-war";
import { evaluatePriceRule, shouldCheckRule, calculateMargin } from "@/lib/price-war-engine";
import type { CompetitorPrice, PriceRule } from "@/types/price-war";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { ruleId, dryRun = false } = body as { ruleId?: string; dryRun?: boolean };

    const rules = await getPriceRules(uid, "active");
    const typedRules = rules as unknown as PriceRule[];
    const rulesToCheck = ruleId ? typedRules.filter((r) => r.id === ruleId) : typedRules.filter((r) => shouldCheckRule(r));

    if (rulesToCheck.length === 0) {
      return NextResponse.json({
        message: "No rules need checking",
        checked: 0,
        adjusted: 0,
      });
    }

    const results: Array<{
      ruleId: string;
      productTitle: string;
      previousPrice: number;
      suggestedPrice: number;
      reason: string;
      applied: boolean;
    }> = [];

    let adjusted = 0;

    for (const rule of rulesToCheck) {
      const mockCompetitors: CompetitorPrice[] = [
        {
          id: `comp-${Date.now()}-1`,
          ruleId: rule.id,
          platform: rule.platforms[0] || "amazon",
          seller: "Competitor A",
          price: rule.myPrice * (0.85 + Math.random() * 0.3),
          url: rule.competitorUrls[0] || "",
          shipping: 0,
          totalLanded: rule.myPrice * (0.85 + Math.random() * 0.3),
          inStock: true,
          lastSeen: new Date().toISOString(),
        },
      ];

      const result = evaluatePriceRule(
        rule as unknown as PriceRule,
        mockCompetitors
      );

      if (result.shouldAdjust && !dryRun) {
        await updatePriceRule(uid, rule.id, {
          myPrice: result.suggestedPrice,
          lastAdjusted: new Date().toISOString(),
          lastChecked: new Date().toISOString(),
        });

        await addPriceAdjustmentLog(uid, {
          ruleId: rule.id,
          productTitle: rule.productTitle,
          previousPrice: rule.myPrice,
          newPrice: result.suggestedPrice,
          reason: result.reason,
          strategy: result.strategy,
          competitorPrice: result.competitorPrice,
          marginBefore: result.marginBefore,
          marginAfter: result.marginAfter,
          autoApplied: true,
        });

        adjusted++;
      } else {
        await updatePriceRule(uid, rule.id, {
          lastChecked: new Date().toISOString(),
        });
      }

      results.push({
        ruleId: rule.id,
        productTitle: rule.productTitle,
        previousPrice: rule.myPrice,
        suggestedPrice: result.suggestedPrice,
        reason: result.reason,
        applied: result.shouldAdjust && !dryRun,
      });
    }

    return NextResponse.json({
      checked: rulesToCheck.length,
      adjusted,
      dryRun,
      results,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to execute price check", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
