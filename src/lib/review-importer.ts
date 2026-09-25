import type { ProductReview } from "@/types/reviews";

export function generateReviewReplyTemplate(review: ProductReview): string {
  if (review.rating >= 4) {
    return `Thank you so much for your wonderful review, ${review.author}! We're thrilled to hear that you're enjoying the product. Your support means the world to us! 🙏`;
  }
  if (review.rating === 3) {
    return `Hi ${review.author}, thank you for your feedback. We're glad the product meets your expectations. If there's anything we can improve, please don't hesitate to reach out!`;
  }
  return `We're sorry to hear about your experience, ${review.author}. This doesn't meet our quality standards. Please contact us directly so we can make this right — we offer free replacements or full refunds.`;
}
