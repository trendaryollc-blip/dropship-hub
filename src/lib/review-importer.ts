import type { ProductReview, ReviewSource, ReviewImportJob } from "@/types/reviews";

// ── Simulated Review Data (for demo — in production, use real scraping/APIs) ──

const SAMPLE_REVIEWS: Record<ReviewSource, Omit<ProductReview, "id" | "createdAt" | "syncStatus">[]> = {
  aliexpress: [
    { productId: "", productTitle: "", source: "aliexpress", author: "John D.", rating: 5, title: "Amazing quality!", content: "This product exceeded my expectations. The build quality is fantastic and it works exactly as described. Shipping was faster than expected too. Highly recommend!", images: [], verified: true, helpful: 42, sourceReviewId: "AE-001" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Sarah M.", rating: 4, title: "Good but not perfect", content: "Overall a solid product. The only minor issue is that the color is slightly different from the photos. But the quality and functionality are great for the price.", images: [], verified: true, helpful: 18, sourceReviewId: "AE-002" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Mike R.", rating: 5, title: "Perfect!", content: "Exactly what I was looking for. Great quality materials and fast delivery. Will definitely order again.", images: [], verified: true, helpful: 31, sourceReviewId: "AE-003" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Emma L.", rating: 3, title: "Decent for the price", content: "It's okay. Nothing special but does the job. The packaging could be better though.", images: [], verified: false, helpful: 8, sourceReviewId: "AE-004" },
    { productId: "", productTitle: "", source: "aliexpress", author: "David K.", rating: 5, title: "Love it!", content: "Best purchase I've made in a while. The attention to detail is impressive. My friends keep asking where I got it.", images: [], verified: true, helpful: 56, sourceReviewId: "AE-005" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Lisa T.", rating: 4, title: "Very satisfied", content: "Product arrived quickly and in perfect condition. Works great. Minor cosmetic issue but nothing major.", images: [], verified: true, helpful: 22, sourceReviewId: "AE-006" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Chris P.", rating: 2, title: "Disappointed", content: "The product doesn't match the description. The material feels cheap and it broke after a week. Not happy.", images: [], verified: true, helpful: 15, sourceReviewId: "AE-007" },
    { productId: "", productTitle: "", source: "aliexpress", author: "Amy W.", rating: 5, title: "Exceeded expectations", content: "I was skeptical ordering from overseas but this product is amazing. Better than similar products I've bought locally for 3x the price.", images: [], verified: true, helpful: 67, sourceReviewId: "AE-008" },
  ],
  cj: [
    { productId: "", productTitle: "", source: "cj", author: "Robert J.", rating: 5, title: "Top quality product", content: "CJ Dropshipping delivered again. The product quality is consistent and the shipping was super fast. This is my go-to supplier.", images: [], verified: true, helpful: 38, sourceReviewId: "CJ-001" },
    { productId: "", productTitle: "", source: "cj", author: "Jennifer H.", rating: 4, title: "Great value", content: "Excellent product for the price. The quality is much better than I expected. Only minor complaint is the packaging.", images: [], verified: true, helpful: 25, sourceReviewId: "CJ-002" },
    { productId: "", productTitle: "", source: "cj", author: "Thomas B.", rating: 5, title: "Five stars!", content: "This is the third time ordering this product. Consistent quality every time. My customers love it.", images: [], verified: true, helpful: 44, sourceReviewId: "CJ-003" },
    { productId: "", productTitle: "", source: "cj", author: "Nancy S.", rating: 3, title: "It's fine", content: "Average product. Nothing wrong with it but nothing special either. Gets the job done.", images: [], verified: false, helpful: 12, sourceReviewId: "CJ-004" },
  ],
  amazon: [
    { productId: "", productTitle: "", source: "amazon", author: "Amazon Customer", rating: 5, title: "Must buy!", content: "This product is a game changer. I've tried many similar products and this one is by far the best. The quality is outstanding.", images: [], verified: true, helpful: 89, sourceReviewId: "AMZ-001" },
    { productId: "", productTitle: "", source: "amazon", author: "Verified Purchase", rating: 4, title: "Very good product", content: "Solid product that does what it promises. The only reason I'm not giving 5 stars is that the instructions could be clearer.", images: [], verified: true, helpful: 45, sourceReviewId: "AMZ-002" },
    { productId: "", productTitle: "", source: "amazon", author: "Tech Enthusiast", rating: 5, title: "Best in class", content: "After researching for weeks, I chose this product and I'm so glad I did. The build quality and features are unmatched at this price point.", images: [], verified: true, helpful: 72, sourceReviewId: "AMZ-003" },
    { productId: "", productTitle: "", source: "amazon", author: "Skeptical Buyer", rating: 3, title: "It's okay", content: "Does what it says but nothing extraordinary. I expected more based on the reviews. Still decent for the price.", images: [], verified: true, helpful: 31, sourceReviewId: "AMZ-004" },
    { productId: "", productTitle: "", source: "amazon", author: "Happy Mom", rating: 5, title: "My kids love it!", content: "Bought this for my family and everyone loves it. Great quality, fast shipping, and excellent customer service.", images: [], verified: true, helpful: 58, sourceReviewId: "AMZ-005" },
  ],
  ebay: [
    { productId: "", productTitle: "", source: "ebay", author: "buyer123", rating: 5, title: "Great seller!", content: "Product arrived quickly and exactly as described. The seller was very responsive to my questions. A+ experience.", images: [], verified: true, helpful: 20, sourceReviewId: "EB-001" },
    { productId: "", productTitle: "", source: "ebay", author: "collector99", rating: 4, title: "Good product", content: "Happy with the purchase. The product is in good condition and works well. Minor shipping delay but nothing major.", images: [], verified: true, helpful: 14, sourceReviewId: "EB-002" },
  ],
  manual: [],
  csv: [],
};

// ── Import Engine ────────────────────────────────────────────────────────────

export function simulateImport(params: {
  productTitle: string;
  productUrl: string;
  source: ReviewSource;
  maxReviews?: number;
}): { job: Omit<ReviewImportJob, "id" | "createdAt">; reviews: Omit<ProductReview, "id" | "createdAt">[] } {
  const { productTitle, productUrl, source, maxReviews = 10 } = params;

  const sourceReviews = SAMPLE_REVIEWS[source] || [];
  const count = Math.min(maxReviews, sourceReviews.length);
  const selected = sourceReviews.slice(0, count);

  const reviews: Omit<ProductReview, "id" | "createdAt">[] = selected.map((r, i) => ({
    ...r,
    productId: `product-${Date.now()}`,
    productTitle,
    syncStatus: "pending" as const,
    syncedTo: [],
  }));

  const job: Omit<ReviewImportJob, "id" | "createdAt"> = {
    productTitle,
    productUrl,
    source,
    status: "completed",
    totalFound: sourceReviews.length,
    imported: reviews.length,
    skipped: 0,
    failed: 0,
    errors: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };

  return { job, reviews };
}

export function generateReviewResponse(review: ProductReview): string {
  if (review.rating >= 4) {
    return `Thank you so much for your wonderful review, ${review.author}! We're thrilled to hear that you're enjoying the product. Your support means the world to us! 🙏`;
  }
  if (review.rating === 3) {
    return `Hi ${review.author}, thank you for your feedback. We're glad the product meets your expectations. If there's anything we can improve, please don't hesitate to reach out!`;
  }
  return `We're sorry to hear about your experience, ${review.author}. This doesn't meet our quality standards. Please contact us directly so we can make this right — we offer free replacements or full refunds.`;
}
