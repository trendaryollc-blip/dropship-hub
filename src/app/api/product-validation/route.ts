import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import {
  runFullValidation,
} from "@/lib/product-validation";
import {
  addProductValidation,
  getProductValidations,
  deleteProductValidation,
} from "@/lib/data/product-validations";
import type {
  TrendVelocityInput,
  SaturationInput,
  ProfitPotentialInput,
  SeasonalDemandInput,
  ProductAuthenticityInput,
  SupplierValidationInput,
  CompetitionAnalysisInput,
  RiskAssessmentInput,
  MarketIntelligenceInput,
  BundleAnalysisInput,
} from "@/types/product-validation";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const {
      productTitle,
      productImage,
      productUrl,
      trendVelocity: trendInput,
      saturation: satInput,
      profitPotential: profitInput,
      seasonalDemand: seasonalInput,
      goldenExtras,
      productAuthenticity: authenticityInput,
      supplierValidation: supplierInput,
      competitionAnalysis: competitionInput,
      riskAssessment: riskInput,
      marketIntelligence: marketInput,
      bundleAnalysis: bundleInput,
    } = body as {
      productTitle: string;
      productImage?: string;
      productUrl?: string;
      trendVelocity: TrendVelocityInput;
      saturation: SaturationInput;
      profitPotential: ProfitPotentialInput;
      seasonalDemand: SeasonalDemandInput;
      goldenExtras: {
        reviewScore: number;
        reviewCount: number;
        supplierReliability: number;
        shippingSpeed: number;
        returnRate: number;
        competitionLevel: "low" | "medium" | "high" | "very-high";
      };
      productAuthenticity?: ProductAuthenticityInput;
      supplierValidation?: SupplierValidationInput;
      competitionAnalysis?: CompetitionAnalysisInput;
      riskAssessment?: RiskAssessmentInput;
      marketIntelligence?: MarketIntelligenceInput;
      bundleAnalysis?: BundleAnalysisInput;
    };

    if (!productTitle) {
      return NextResponse.json({ error: "productTitle is required" }, { status: 400 });
    }

    const result = runFullValidation(
      trendInput, satInput, profitInput, seasonalInput, goldenExtras,
      authenticityInput, supplierInput, competitionInput,
      riskInput, marketInput, bundleInput,
    );

    await addProductValidation(uid, {
      productTitle,
      productImage,
      productUrl,
      goldenScore: result.goldenProduct.score,
      goldenRank: result.goldenProduct.rank,
      trendVelocity: result.trendVelocity.score,
      saturationIndex: result.saturation.index,
      profitScore: result.profitPotential.score,
      seasonalScore: result.seasonalDemand.score,
      riskScore: result.riskAssessment?.score ?? 0,
      supplierScore: result.supplierValidation?.score ?? 0,
      competitionScore: result.competitionAnalysis?.score ?? 0,
      authenticityScore: result.productAuthenticity?.score ?? 0,
      marketScore: result.marketIntelligence?.score ?? 0,
      inputs: body,
    });

    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (_req: NextRequest, uid: string) => {
  try {
    const validations = await getProductValidations(uid);
    return NextResponse.json({ validations });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch validations" },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    await deleteProductValidation(uid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete" },
      { status: 500 }
    );
  }
});
