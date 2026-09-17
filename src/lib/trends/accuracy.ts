import { doc, setDoc, getDocs, collection, query, orderBy, limit, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { handleFirestoreError } from "@/lib/data/utils";
import type { TrendPrediction } from "@/types/trend-predictor";

export interface PredictionAccuracy {
  id: string;
  predictionId: string;
  keyword: string;
  predictedDirection: string;
  predictedPeak: string;
  predictedScore: number;
  predictedMargin: number;
  actualDirection?: string;
  actualPeak?: string;
  actualScore?: number;
  actualMargin?: number;
  directionCorrect: boolean;
  peakWithinRange: boolean;
  scoreAccuracy: number;
  marginAccuracy: number;
  overallAccuracy: number;
  verifiedAt: string;
  createdAt: string;
}

export async function recordPredictionAccuracy(
  uid: string,
  prediction: TrendPrediction,
  actualData: {
    direction: string;
    peakDate?: string;
    currentScore: number;
    currentMargin: number;
  }
): Promise<string | undefined> {
  try {
    const directionCorrect = prediction.direction === actualData.direction;

    let peakWithinRange = false;
    if (prediction.predictedPeak && actualData.peakDate) {
      const predicted = new Date(prediction.predictedPeak).getTime();
      const actual = new Date(actualData.peakDate).getTime();
      const diffDays = Math.abs(predicted - actual) / (1000 * 60 * 60 * 24);
      peakWithinRange = diffDays <= 7;
    }

    const scoreDiff = Math.abs(prediction.trendScore - actualData.currentScore);
    const scoreAccuracy = Math.max(0, 100 - scoreDiff);

    const marginDiff = Math.abs(prediction.estimatedMargin - actualData.currentMargin);
    const marginAccuracy = Math.max(0, 100 - marginDiff * 2);

    const overallAccuracy = Math.round(
      (directionCorrect ? 40 : 0) +
      (peakWithinRange ? 30 : 0) +
      (scoreAccuracy * 0.15) +
      (marginAccuracy * 0.15)
    );

    const accuracy: Omit<PredictionAccuracy, "id" | "createdAt"> = {
      predictionId: prediction.id,
      keyword: prediction.productIdea,
      predictedDirection: prediction.direction,
      predictedPeak: prediction.predictedPeak,
      predictedScore: prediction.trendScore,
      predictedMargin: prediction.estimatedMargin,
      actualDirection: actualData.direction,
      actualPeak: actualData.peakDate,
      actualScore: actualData.currentScore,
      actualMargin: actualData.currentMargin,
      directionCorrect,
      peakWithinRange,
      scoreAccuracy: Math.round(scoreAccuracy),
      marginAccuracy: Math.round(marginAccuracy),
      overallAccuracy,
      verifiedAt: new Date().toISOString(),
    };

    const ref = doc(collection(db, "users", uid, "predictionAccuracy"));
    await setDoc(ref, { ...accuracy, createdAt: serverTimestamp() });
    return ref.id;
  } catch (error) {
    handleFirestoreError("recordPredictionAccuracy", error);
    return undefined;
  }
}

export async function getPredictionAccuracy(uid: string, count: number = 50): Promise<PredictionAccuracy[]> {
  try {
    const q = query(
      collection(db, "users", uid, "predictionAccuracy"),
      orderBy("createdAt", "desc"),
      limit(count)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PredictionAccuracy));
  } catch (error) {
    handleFirestoreError("getPredictionAccuracy", error);
    return [];
  }
}

export async function getOverallAccuracy(uid: string): Promise<{
  totalPredictions: number;
  verifiedPredictions: number;
  overallAccuracy: number;
  directionAccuracy: number;
  peakAccuracy: number;
  avgScoreAccuracy: number;
}> {
  const accuracies = await getPredictionAccuracy(uid, 100);
  if (accuracies.length === 0) {
    return { totalPredictions: 0, verifiedPredictions: 0, overallAccuracy: 0, directionAccuracy: 0, peakAccuracy: 0, avgScoreAccuracy: 0 };
  }

  const directionCorrect = accuracies.filter((a) => a.directionCorrect).length;
  const peakCorrect = accuracies.filter((a) => a.peakWithinRange).length;
  const avgScore = accuracies.reduce((sum, a) => sum + a.scoreAccuracy, 0) / accuracies.length;
  const avgOverall = accuracies.reduce((sum, a) => sum + a.overallAccuracy, 0) / accuracies.length;

  return {
    totalPredictions: accuracies.length,
    verifiedPredictions: accuracies.length,
    overallAccuracy: Math.round(avgOverall),
    directionAccuracy: Math.round((directionCorrect / accuracies.length) * 100),
    peakAccuracy: Math.round((peakCorrect / accuracies.length) * 100),
    avgScoreAccuracy: Math.round(avgScore),
  };
}
