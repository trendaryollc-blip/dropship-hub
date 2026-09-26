# DropShip Hub — Complete Feature Catalog & Status

> Reference document for humans and AI assistants. Describes **every feature in the app**, whether it is functional today, what data it needs, how it is tested, what has been completed, and what remains.
> Repo: `https://github.com/trendaryollc-blip/dropship-hub` · Last updated: September 2026

---

## 1. What the app is

DropShip Hub is a web application (Next.js 16 App Router + TypeScript + Firebase) for running a dropshipping business from one dashboard: discover and validate products, analyze suppliers and competitors, generate listings and marketing content, route/fulfill orders, track profit and cash flow, and get daily intelligence briefings.

**Architecture in one paragraph:** Next.js server routes (231 API handlers) talk to Firebase (Auth + Firestore) with Admin SDK; the browser uses the Firebase client SDK and SWR for API data. External data (product search, Google Trends, fulfillment) arrives through **key pools** (multi-key rotation with quota cooldowns) from providers like SerpAPI, Rainforest, CJ, Keepa. LLM features are provider-optional (OpenAI / Groq / Gemini / DeepSeek / Mistral / Anthropic) with admin-managed keys. Background jobs run via Inngest + a GitHub Actions cron. Deployment target is Vercel; rate limiting is Upstash Redis; billing is Stripe.

---

## 2. How to read the status legend

| Status                               | Meaning                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| ✅ **Functional**                    | Works today with data already inside the app (user input / Firestore / deterministic math). No external key required.                      |
| 🔑 **Functional with API key**       | Fully works once the listed API key(s) are configured. Without them the page shows an honest empty/setup state — never fake data.          |
| 🚧 **Partial / pending integration** | UI and logic ship, but one specific integration is not built yet; the app says so explicitly instead of faking it.                         |
| ⛔ **Deliberately blocked**          | Returns an explicit, honest error (e.g. HTTP 501 with instructions) because the required integration doesn't exist yet. This is by design. |

---

## 3. The honesty policy (why some pages show "not available")

This is the app's central rule, enforced by `scripts/honesty-guard.mjs` in CI (`npm run honesty`):

1. A number on screen must come from a **Live API**, **your Firestore**, or **user entry**.
2. Heuristics computed from real inputs must be labeled **Estimated / Est. / heuristic / rule-based**.
3. Rule engines must never be labeled **"AI"**. "AI" is reserved for actual LLM calls (which fail honestly with "No AI provider connected" when no key exists).
4. "Live" / "Real-time" labels require a genuinely live source.
5. Missing sources render honest components from `src/components/ui/`: `ComingSoon` (requires naming the missing deliverable), `DataUnavailable` (with setup instructions), `QuotaExhausted`, `EmptyState`, `DataSourceBadge` (provenance label).

**Consequence for users:** freshly-installed, key-less deployments intentionally show empty/setup states on discovery pages. That is correct behavior, not a bug.

---

## 4. Feature catalog — every page

### 4.1 Marketing & authentication

| Route                                      | Feature                                                                                   | Status | Notes                                                                                                                                                                                         |
| ------------------------------------------ | ----------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                                        | Landing page: hero, feature grid, how-it-works, comparison, FAQ, testimonials, stats, CTA | ✅     | All copy audited for fabricated claims; testimonials are captioned "Illustrative examples — not real customer quotes"; stat counters derive from real constants (e.g. platform catalog size). |
| `/sign-in`, `/sign-up`, `/forgot-password` | Firebase email/password auth                                                              | ✅     |                                                                                                                                                                                               |

### 4.2 Product discovery & validation

| Route                                   | Feature                                                                                                                                      | Status | Notes                                                                                                                                                                      |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/products`                             | Multi-platform product search, filters, comparison                                                                                           | 🔑     | Needs `SERPAPI_KEYS` (and/or Rainforest/ScraperAPI). Without keys: honest empty state with setup guidance.                                                                 |
| `/products` (trending section)          | "Fresh from live search" — latest live search results                                                                                        | 🔑     | Same keys; deliberately _not_ labeled a trend ranking (it's price-ascending live results).                                                                                 |
| `/products/[id]`                        | Product detail: price/rating/reviews (guarded parsing → "—" when unknown), price history sparkline, supplier matches, price comparison table | 🔑     | Null-safe: no fake 0.0 ratings.                                                                                                                                            |
| `/products/[id]` · market intel         | Search interest index (0–100, Google-Trends-style), competition level, seller estimates, risk factors                                        | 🔑     | SerpAPI Google Trends + Shopping. Raw interest index shown — never multiplied into fake "searches/month". Heuristic tiles footnoted.                                       |
| `/products/[id]` · listing optimization | Title/bullet/description/price-range suggestions                                                                                             | ✅     | Template engine over your product details; price range from live competitor prices when available, otherwise labeled "(estimated from your price)".                        |
| `/products/niches`                      | Niche Radar: category cards, radar charts, heatmap, compare panel, detail view                                                               | 🔑     | Catalog from CJ + local catalog. Scores/heat/price ranges labeled as estimates from catalog counts and average prices.                                                     |
| `/product-validation`                   | 5 validation engines (trend velocity, saturation, profit potential, seasonality, composite score), auto-fill from live sources               | ✅     | Engines run on user-entered numbers (deterministic math). Auto-fill from live enrich/market-intel APIs 🔑. Materials/supplier fields auto-filled are marked "Auto-filled". |

### 4.3 Trends & intelligence

| Route                       | Feature                                                                                                              | Status | Notes                                                                                                                                                                                                                                                                            |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/trends`                   | Trend analyzer: keyword signals, rising stars, lifecycle curve, keyword comparison, bulk analysis, PDF report export | 🔑     | Needs a trends source (`RAPIDAPI_GOOGLE_TRENDS_KEY` etc.). Without one: honest empty states and HTTP 400 "No live trend data for this keyword — connect a trends source". **No synthetic chart series** — real `interest_over_time` only, otherwise "Forecast unavailable" note. |
| `/trends` · Trend Predictor | Peak/direction forecast, scoring rationale                                                                           | ✅/🔑  | Deterministic `predictTrend()` over real signal volumes (labeled **RULE-BASED**, not AI). Guarded: throws an honest error on empty signals.                                                                                                                                      |
| `/ai`                       | AI assistant: chat, business insights, health score, forecast chart, smart suggestions                               | 🔑     | Chat/LLM parts need an LLM key (503 "No AI provider connected" otherwise). Insights are computed from user data and labeled estimated. No "Live" badge without a live source.                                                                                                    |
| `/ai` · market intel panel  | Live market intel                                                                                                    | ⛔/🔑  | API returns an honest `source: "unavailable"` payload until SerpAPI is configured; UI shows `DataUnavailable` with setup steps.                                                                                                                                                  |
| `/digest`                   | Daily intelligence digest: opportunities/risks/trends from your data                                                 | ✅     | Real Firestore data; output carries a `summarySource` flag (generated vs. AI) reflected in the heading. Email delivery 🔑 (`RESEND_API_KEY`/`SENDGRID_API_KEY`).                                                                                                                 |
| `/health`                   | Business health score, KPI checks, prioritized roadmap                                                               | ✅     | Rule-based from your store data; presets are not fake-completed — buttons say "Jump to Checklist".                                                                                                                                                                               |
| `/monitoring`               | Price-drop & change monitoring feed                                                                                  | ✅     | From Firestore; time windows labeled honestly ("all-time" when unfiltered).                                                                                                                                                                                                      |

### 4.4 Suppliers & competitors

| Route                             | Feature                                                              | Status | Notes                                                                                                                                                                                                                    |
| --------------------------------- | -------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/suppliers`                      | Supplier directory: search, stats, reliability                       | 🔑     | Live catalog needs CJ keys; reliability shows "not measured" until analytics exist.                                                                                                                                      |
| `/suppliers/[id]`                 | Supplier detail, product feed, performance, quick actions            | ✅/🔑  | "Visit Supplier" is disabled (no dead links) when no website is on record.                                                                                                                                               |
| `/suppliers/[id]` · due diligence | Full due-diligence report (LLM)                                      | 🔑     | Without an LLM key: honest 503 "No AI provider connected — add a key in Settings → AI", rendered in the empty state. Quick-action analysis genuinely posts to `/api/ai` (real LLM or honest error — no rule-based fake). |
| `/competitors`                    | Competitor monitoring panel, opportunity finder, price position      | ✅/🔑  | Monitoring list from Firestore; opportunity finder computes real price gaps in USD (rendered as `$`, not `%`). Enrichment of live competitor prices 🔑. "Recent competitor changes" (not "live").                        |
| `/srm`                            | Supplier relationship management: scorecards, contracts, risk alerts | ✅     | Real metrics when data exists; honest "—" / empty states otherwise.                                                                                                                                                      |
| `/supplier-performance`           | Performance tabs (on-time rate, quality, returns)                    | ✅     | Defaults are `null`, not invented 100/75 scores; renders "—" until measured.                                                                                                                                             |

### 4.5 Orders & fulfillment

| Route                                   | Feature                                                                   | Status | Notes                                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/fulfillment`                          | Fulfillment pipeline: orders by stage, routing suggestions, carrier table | ✅/🔑  | Pipeline from your orders; CJ placement 🔑 (`CJ_API_KEYS`). "Sync tracking"/"optimize routing" toasts are honest about what rules did — no fake "saved %".                                                                                                      |
| `/fulfillment/[orderId]`                | Single order detail & timeline                                            | ✅     |                                                                                                                                                                                                                                                                 |
| `/order-router`                         | Rule-based order routing across stores/suppliers                          | ✅     | Honest queued states; savings computed from real data only (no `cost*0.3` style factors).                                                                                                                                                                       |
| `/returns`                              | Returns center: requests, defects, refunds, supplier recovery             | ✅     | Creation passes real detection fields; stats like "Cancellation Rate" are real counts (renamed from "Return Rate" where the data is cancellations).                                                                                                             |
| `/returns` · label generation           | Carrier return label                                                      | ✅/🔑  | Real label purchase via **EasyPost** (`EASYPOST_API_KEYS`): creates a return shipment, buys the cheapest rate, stores tracking + printable `labelUrl`. Without a key the route answers an honest `501` with setup instructions. No fabricated tracking numbers. |
| `/refund-cascade`                       | Automated refund cascade rules                                            | ✅     |                                                                                                                                                                                                                                                                 |
| `/tracking-page`                        | Customer-facing tracking page builder (branding, URL, notifications)      | ✅     | Real usage metrics only — "Tickets Saved"/uplift fields were removed as unmeasurable.                                                                                                                                                                           |
| `/shipping-optimizer`                   | Rate comparison, delivery estimates, carrier recommendations              | ✅     | Reference rate table clearly labeled "Estimated rates (reference table)"; real country coverage (55); confidence/estimate-basis derived from actual signals; static reliability clearly marked as static.                                                       |
| `/bulk-orders`                          | Bulk order management                                                     | ✅     |                                                                                                                                                                                                                                                                 |
| `/order monitoring` (within monitoring) | Order status changes                                                      | ✅     |                                                                                                                                                                                                                                                                 |

### 4.6 Stores & platforms

| Route                | Feature                                                         | Status | Notes                                                                                                                  |
| -------------------- | --------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/store`             | Store dashboard: orders, inventory, performance                 | ✅     |                                                                                                                        |
| `/multi-store`       | Multi-store push: connect stores, bulk-push products, sync      | 🔑     | Store OAuth/credentials required for actual pushes (`see .env.example`); UI states connection status honestly.         |
| `/platforms`         | Platform connection manager                                     | 🔑     | Lists configured platforms and key status.                                                                             |
| `/product-lifecycle` | Lifecycle stages (intro/growth/maturity/decline), stage metrics | ✅     | Unmeasured metrics show "Not tracked", not zeros.                                                                      |
| `/product-listings`  | Listing generator: keyword block, generated titles/bullets      | ✅     | Deterministic templates from your inputs; random volume/competition figures removed (shows honest empty when no data). |

### 4.7 Finance & calculators (all ✅ — deterministic math)

| Route                             | Feature                                                                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/calculator`                     | Calculator hub with templates                                                                                 |
| `/calculator/profit`              | Profit per unit (cost, fees, shipping, ads)                                                                   |
| `/calculator/margin`              | Margin & markup                                                                                               |
| `/calculator/break-even`          | Break-even units & revenue                                                                                    |
| `/calculator/ad-roi`              | Ad ROI & ROAS                                                                                                 |
| `/calculator/shipping`            | Shipping cost scenarios                                                                                       |
| `/calculator/landed-cost`         | Landed cost incl. duty/tariff note (rate text says "verify current rate at ustr.gov" — not hardcoded as fact) |
| `/calculator/customs`             | Customs/duty estimates                                                                                        |
| `/calculator/amazon-fba`          | Amazon FBA fee estimation                                                                                     |
| `/calculator/returns`             | Returns cost impact                                                                                           |
| `/calculator/platform-comparison` | Fee comparison across platforms — labeled "Best on reference rate card" with static-rates caption             |

### 4.8 Profit, revenue & reporting

| Route             | Feature                                              | Status | Notes                                                                                                                     |
| ----------------- | ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------- |
| `/profit-tracker` | Margin, AOV, profit per order, trend                 | ✅     | Metrics computed from real orders; trend is a genuine comparison to the previous window or shows "—".                     |
| `/revenue`        | Revenue KPIs, chart, 14-day projection               | ✅     | Projection is a real linear regression over your last 14 days, labeled **Estimated**; hidden when there's no data.        |
| `/cash-flow`      | Cash-flow forecast, cycle, runway                    | ✅     | From your entries; runway is `null` (renders honestly) when it would be infinite; cycle labeled as benchmark.             |
| `/ad-roi`         | Campaign performance, ROAS, spend pacing             | ✅/🔑  | KPIs labeled estimated; CPC/CTR defaults marked "Reference defaults (static reference)". Live ad spend 🔑 when connected. |
| `/reports`        | Saved reports, KPI table, rule-based recommendations | ✅     | Recommendations labeled rule-based; refresh shows real fetch time, not "just now" fakery.                                 |

### 4.9 Engagement, content & operations

| Route               | Feature                                                               | Status | Notes                                                                                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/missions`         | Daily missions, XP, streaks, badges                                   | ✅     | Generated from **your store activity** with rule-based tasks (labeled as such).                                                                                                                                                           |
| `/saved`            | Saved/wishlist products, quick actions                                | ✅     | Quick actions are real ToolRegistry executions (labeled rule-based); "Analyze Pricing" maps to the real pricing tool.                                                                                                                     |
| `/reviews`          | Review inbox, sentiment, reply templates, import                      | ✅/🔑  | Inbox + rule-based reply templates work on entered data. **Import** works: CSV upload (zero-config) and Amazon via Rainforest (🔑 `RAINFOREST_API_KEY`); AliExpress/CJ/eBay return an honest 501 "not connected"; no seeded fake reviews. |
| `/customer-service` | Ticket metrics, macros, AI reply drafts                               | ✅/🔑  | Avg response time/confidence computed from real Firestore tickets (no fixed 85/95% confidences); labeled rule-based. LLM drafts 🔑.                                                                                                       |
| `/social-content`   | Content generator: hooks, scripts, hashtags, ad copy, story templates | ✅     | Template library with placeholders (`{product}`, `[X] reviews`) for the user to fill — clearly template copy, no invented statistics. Audio/engagement usage counts are real.                                                             |
| `/compliance`       | Compliance checks (restricted products, claims)                       | ✅     | Rule-based scan of your product data.                                                                                                                                                                                                     |
| `/settings`         | Profile, AI provider keys, notifications, subscription, quota         | ✅     | Quota panel captioned "Static reference — check provider site".                                                                                                                                                                           |

### 4.10 Admin area (owner-only, all ✅)

| Route                       | Feature                                                                           | Notes                                                                                                                       |
| --------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `/admin`                    | Admin overview                                                                    |                                                                                                                             |
| `/admin/dashboard`          | Platform usage stats                                                              |                                                                                                                             |
| `/admin/users`              | User management (role, ban, tier)                                                 |                                                                                                                             |
| `/admin/analytics`          | Users/searches/revenue analytics                                                  | Shows honest "Analytics unavailable — no numbers are shown until real data arrives" on fetch failure (no fabricated zeros). |
| `/admin/health`             | Platform API health checks                                                        | Shows "Status unavailable" (not "System Operational") when health data can't load; "No platforms configured" when empty.    |
| `/admin/platforms`          | Platform provider management                                                      |                                                                                                                             |
| `/admin/api-keys`           | Data-provider key management                                                      |                                                                                                                             |
| `/admin/ai-keys`            | LLM provider key management (Groq/OpenAI/Gemini/DeepSeek/Mistral/Cohere/Together) |                                                                                                                             |
| `/admin/supplier-providers` | Supplier provider management                                                      |                                                                                                                             |
| `/admin/settings`           | Platform settings                                                                 |                                                                                                                             |

### 4.11 Beyond the pages

- **API layer:** 231 route handlers in 44 groups under `src/app/api/`, all behind `withAuth` (per-user/per-tier rate limits) or `requireOwner`; errors sanitized via `PublicError`/`safeErrorMessage`.
- **Key pools:** `src/lib/api-keys/` — comma-separated key pools with rotation, quota detection, cooldown; declared in `providers.ts`.
- **Background jobs (Inngest):** price-check, inventory-sync, digest, auto-mode, due-diligence, search-alert.
- **Daily digest cron:** `.github/workflows/daily-digest.yml` calls the production deployment with `CRON_SECRET`.
- **Chrome extension:** `chrome-extension/` saves products from any page via `POST /api/chrome-extension/save`.
- **Billing:** Stripe subscription docs are server-only; clients cannot self-upgrade (enforced by Firestore rules).

---

## 5. Data sources & keys status

| Tier               | Providers                                                                                                  | Unlocks                                                          |
| ------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 1 (highest impact) | SerpAPI (`SERPAPI_KEYS`), RapidAPI Google Trends (`RAPIDAPI_GOOGLE_TRENDS_KEY`), CJ (`CJ_API_KEYS`), Keepa | Product search, market intel, trends, niche catalog, fulfillment |
| 2                  | Groq / OpenAI (`GROQ_API_KEYS`, `OPENAI_API_KEYS`)                                                         | Chat assistant, due-diligence reports, listing text              |
| 3                  | TikTok / Instagram / Reddit APIs                                                                           | Social trend signals                                             |
| 4                  | CJ / AliExpress / eBay / Rainforest                                                                        | Deeper supplier + review data                                    |
| 5                  | Upstash, Stripe, Resend, Inngest, Sentry                                                                   | Rate limiting, billing, email, jobs, monitoring                  |

Minimum set to make discovery pages live: **SerpAPI + RapidAPI Google Trends + Groq**. Full table with signup URLs: [DATA_SOURCES.md](DATA_SOURCES.md). `.env.example` is the canonical env template.

**Key-less behavior:** every dependent page degrades to an honest empty/setup state. There is no mock fallback anywhere in app pages (enforced by the honesty guard).

---

## 6. Testing & quality system

| Layer             | Tool                                      | Scope                                                                                                                                                                        | Command                    |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Unit + component  | Vitest                                    | **635 test files / 6,169 tests** (co-located `*.test.ts(x)` + `__tests__/`)                                                                                                  | `npm test`                 |
| API routes        | Vitest                                    | Route handlers tested with mocked Firebase/providers                                                                                                                         | `npm run test:api`         |
| Integration       | Vitest                                    | `src/__tests__/integration/` — e.g. fulfillment pipeline                                                                                                                     | `npm run test:integration` |
| Security          | Vitest                                    | `src/__tests__/security/` — rate limiting, auth                                                                                                                              | `npm run test:security`    |
| Performance       | Vitest                                    | `src/__tests__/performance/`                                                                                                                                                 | `npm run test:performance` |
| E2E               | Playwright                                | **15 specs**: auth, landing, app shell, protected routes, products, trends, suppliers, competitors, calculators, settings, SRM, returns, multi-store, responsive, API routes | `npm run test:e2e`         |
| Types             | `tsc --noEmit` strict                     | Whole repo                                                                                                                                                                   | `npm run typecheck`        |
| Lint              | ESLint 9                                  | 0 errors required (≈3,000 pre-existing warnings tracked)                                                                                                                     | `npm run lint`             |
| **Honesty guard** | `scripts/honesty-guard.mjs`               | Fails CI on `Math.random` in app pages and `generateMock*` outside empty allowlists                                                                                          | `npm run honesty`          |
| CI                | GitHub Actions `.github/workflows/ci.yml` | lint → typecheck → `npm audit` → full tests → production build → Playwright e2e, on push/PR to `main`                                                                        | —                          |

**Merge gate (all must pass):** `typecheck` → `lint` (0 errors) → `honesty` → `test`.

**Latest full verification (this session):** 635 files / 6,169 tests pass · typecheck clean · honesty guard passes · 0 lint errors.

---

## 7. What has been completed

1. **Core platform (sprints 0–5):** auth + security model, key-pool infrastructure, honesty UI component library, env canonicalization, honesty guard script, per-feature data-source adapters that fail honestly, nullable enrichment types, `DATA_SOURCES.md`.
2. **Per-page honesty fixes (first pass):** calculator, saved, settings, global search, recommendations, niches, categories, products, competitors, dashboard, suppliers, trends, product validation — mock data replaced with real/estimated/honest states.
3. **Follow-up fixes:** orphaned dashboard component labels ("Live Scanning" → "Scan Status" etc.), false copy in MarketInsights/Hero/SmartAutofill, returns label `501`, product-detail numeric guards.
4. **Full-app audit wave 1:** reviews (fake import → 501), fulfillment/returns/tracking/SRM, shipping/social, ad-roi/cash-flow/customer-service/digest/health/monitoring/missions.
5. **Wave 2:** order-router, price-war, product-lifecycle, product-listings, profit-tracker, reports, revenue, ai, calculator sub-pages, settings, lib reclaims.
6. **Wave 3:** landing/marketing (fake 847/92/10 counters, fabricated testimonials and capability claims), trends (synthetic sine-wave charts replaced with real series or honest empty states; dead seed adapters return `[]`), products/niches (fake "searches/mo" → real 0–100 interest index), suppliers/saved/settings/competitors/dashboard synthetic fields removed.
7. **Final audit + fixes:** last unaudited routes (admin ×10, auth, marketing, calculators, fulfillment detail, supplier detail) — admin analytics/health now show honest unavailable states, dead links removed, unsourced comparison stats removed, "AI Daily Pick" renamed and its description rewritten to match the real rule-based formula.
8. **Verification after every wave:** typecheck, lint (0 errors), honesty guard, full Vitest suite — all green.

**Answer to "are all pages fixed?":** Yes — all **65 pages** (51 app + 10 admin + 3 auth + 1 landing) have been audited against the honesty policy and violations fixed. No known fabricated-data violations remain in shipped pages.

---

## 8. What is NOT done yet (next steps)

| #   | Item                              | Detail                                                                                                                               |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | ~~**Commit the work**~~           | ✅ Committed and pushed; working tree clean.                                                                                         |
| 2   | **Push & confirm CI green**       | `.github/workflows/ci.yml` must pass on GitHub after push.                                                                           |
| 3   | **Obtain and configure API keys** | Tier 1 first (SerpAPI, Groq, CJ, Keepa, EasyPost) — turns discovery/trends/label pages from honest-empty to live.                    |
| 4   | **Run the Playwright e2e suite**  | Specs exist but haven't been executed in this environment (`npm run test:e2e`).                                                      |
| 5   | **Vercel preview deploy**         | With full env vars from `.env.example`; deploy Firestore rules/indexes.                                                              |
| 6   | ~~**Carrier label integration**~~ | ✅ Shipped — EasyPost integration replaces the `501` (needs `EASYPOST_API_KEYS`).                                                    |
| 7   | ~~**Review import integration**~~ | ✅ Shipped — CSV import works with zero config; Amazon via Rainforest (`RAINFOREST_API_KEY`). AliExpress/CJ/eBay stay honest `501`s. |
| 8   | **Monitoring**                    | Add Sentry (or similar) for production error tracking.                                                                               |
| 9   | **Stripe live-mode test**         | Verify live webhook + subscription flow end-to-end.                                                                                  |
| 10  | **Lint warning debt**             | ≈3,000 pre-existing warnings (0 errors) — gradual cleanup, not blocking.                                                             |
| 11  | **Multi-store OAuth live test**   | Store connections work with credentials; end-to-end push against a real Shopify/Woo store not yet verified.                          |

---

## 9. Known limitations

- Fresh deployments without API keys intentionally show honest empty/setup states on discovery pages.
- Rule-based scoring (daily pick, niche heat, health score) is deterministic math over listing data — it is **not** predictive analytics, and the UI labels it accordingly.
- Landing-page testimonials are explicitly captioned as illustrative examples, not real customers.
- Some platform "reliability"/"on-time" metrics stay "not measured" until enough real transactions exist — by design.
- e2e suite and Vercel deploy are configured but not yet executed/verified in this cycle.

---

## 10. Verification commands

```bash
npm run typecheck   # strict TS, must be clean
npm run lint        # must be 0 errors
npm run honesty     # fabrication guard must pass
npm run test        # 635 files / 6,169 tests must pass
npm run build       # production build must succeed
npm run test:e2e    # Playwright (starts dev server)
```
