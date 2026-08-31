import { z } from "zod";
import { logger } from "@/lib/logger";

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  FIREBASE_ADMIN_PROJECT_ID: z.string().min(1),
  FIREBASE_ADMIN_CLIENT_EMAIL: z.string().email(),
  FIREBASE_ADMIN_PRIVATE_KEY: z.string().min(1),
  OWNER_UID: z.string().min(1),
  OWNER_EMAIL: z.string().email(),
  FIREBASE_SERVICE_ACCOUNT: z.string().min(1),
  TRENDARYO_JWT_SECRET: z.string().optional(),
  TRENDARYO_ADMIN_UID: z.string().optional(),
  RAINFOREST_API_KEY: z.string().optional(),
  SERP_API_KEY: z.string().optional(),
  KEEPA_API_KEY: z.string().optional(),
  BRAVE_SEARCH_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_VAPID_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().min(1).optional(),
  CJ_API_KEY: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  SCRAPER_API_KEY: z.string().optional(),
  ZENROWS_API_KEY: z.string().optional(),
  WOOCOMMERCE_URL: z.string().min(1).optional(),
  WOOCOMMERCE_CONSUMER_KEY: z.string().optional(),
  WOOCOMMERCE_CONSUMER_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SHOPIFY_STORE_DOMAIN: z.string().optional(),
  SHOPIFY_ACCESS_TOKEN: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),
  COHERE_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  FIREWORKS_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  HPC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

function warnOptional(env: Env) {
  const warnings: string[] = [];
  if (!env.SCRAPER_API_KEY) warnings.push("SCRAPER_API_KEY — recommended for platform search scraping");
  if (!env.ZENROWS_API_KEY) warnings.push("ZENROWS_API_KEY — recommended for JavaScript-rendered pages");
  if (!env.RESEND_API_KEY) warnings.push("RESEND_API_KEY — required for email sending (Resend)");
  const wooSet = [env.WOOCOMMERCE_URL, env.WOOCOMMERCE_CONSUMER_KEY, env.WOOCOMMERCE_CONSUMER_SECRET].filter(Boolean).length;
  if (wooSet > 0 && wooSet < 3) warnings.push("WooCommerce: partial credentials — set WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET together");
  if (warnings.length > 0) {
    logger.warn("Optional environment variables not set (features may be limited):", { warnings });
  }
}

export function getEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    logger.warn("Environment variable validation warnings (non-fatal):", { errors });
  }
  _env = (result.success ? result.data : process.env) as Env;
  warnOptional(_env);
  return _env;
}
