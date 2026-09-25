import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getPriceRules, updatePriceRule, addPriceAdjustmentLog, addPriceSnapshot, getPriceWarSettings } from "@/lib/data/price-war";
import { evaluatePriceRule, shouldCheckRule } from "@/lib/price-war-engine";
import { fetchAllCompetitorPrices } from "@/lib/competitor-price-fetcher";
import type { PriceRule } from "@/types/price-war";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { ruleId, dryRun: requestedDryRun, apply } = body as { ruleId?: string; dryRun?: boolean; apply?: boolean };

    const settings = await getPriceWarSettings(uid);
    const dryRun = apply === true ? false : requestedDryRun === true ? true : !settings.autoApply;

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
      competitorCount: number;
    }> = [];

    let adjusted = 0;

    for (const rule of rulesToCheck) {
      const competitors = await fetchAllCompetitorPrices(
        rule.id,
        rule.competitorUrls,
        rule.platforms
      );

      await addPriceSnapshot(uid, {
        ruleId: rule.id,
        myPrice: rule.myPrice,
        lowestCompetitorPrice: competitors.length > 0
          ? Math.min(...competitors.filter((c) => c.inStock).map((c) => c.totalLanded))
          : undefined,
        competitorPrices: competitors.map((c) => ({
          url: c.url,
          price: c.totalLanded,
          seller: c.seller,
        })),
      });

      const result = evaluatePriceRule(rule as unknown as PriceRule, competitors);

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
        competitorCount: competitors.length,
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
      { error: "Failed to execute price check", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
