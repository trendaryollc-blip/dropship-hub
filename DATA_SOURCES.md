# Data Sources

Rule: a number on screen is only shown if it comes from **Live API**, **Your Firestore**, or **User entry**. Heuristics computed from real inputs must be labeled **Estimated**. When a source is missing, the UI shows **ComingSoon** / **DataUnavailable** / **QuotaExhausted** with setup instructions — never mock or fabricated numbers.

CI guard: `npm run honesty` (`scripts/honesty-guard.mjs`) fails on `Math.random` in app pages and on `generateMock*` helpers outside an empty allowlist.

## Key pools

Multi-key rotation lives in `src/lib/api-keys/pool.ts`. Providers and pool env vars are declared in `src/lib/api-keys/providers.ts`.

| Provider        | Pool env var                     | Get keys                                                     |
| --------------- | -------------------------------- | ------------------------------------------------------------ |
| SerpAPI         | `SERPAPI_KEYS` (comma-separated) | https://serpapi.com/manage/api-key                           |
| Rainforest      | `RAINFOREST_API_KEYS`            | https://dashboard.rainforestapi.com/api-keys                 |
| CJ Dropshipping | `CJ_API_KEYS`                    | https://developers.cjdropshipping.com/api2.0/v1/account/info |
| Keepa           | `KEEPA_API_KEYS`                 | https://keepa.com/#!api                                      |
| ScraperAPI      | `SCRAPER_API_KEYS`               | https://www.scraperapi.com/dashboard/                        |
| OpenAI          | `OPENAI_API_KEYS`                | https://platform.openai.com/api-keys                         |
| Groq            | `GROQ_API_KEYS`                  | https://console.groq.com/keys                                |
| EasyPost        | `EASYPOST_API_KEYS`              | https://www.easypost.com/dashboard                           |

On quota exhaustion the pool cools the key and the envelope UI explains how to add another free-tier key.

## Feature → data source map

| Feature / page area                                  | Source                                                                 | Env / setup                                                                      | If unavailable                                                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Product search / listings                            | Platform search APIs (SerpAPI / Rainforest / platform scrapers)        | `SERPAPI_KEYS`, `RAINFOREST_API_KEY`, `SCRAPER_API_KEY`                          | Empty results + search guidance                                                            |
| Product enrich (multi-platform price, rating, stock) | Live search per platform                                               | Same as above                                                                    | Partial platforms only; `coverage` meta reports queried/succeeded; no mock padding         |
| Price comparison table                               | Enrich `platforms[]`                                                   | —                                                                                | `—` for null rating/reviews; stock **Unknown**                                             |
| Supplier matches (product detail)                    | Enrich `supplierMatches`                                               | —                                                                                | Empty section; **Price n/a** when price is null                                            |
| Product detail sparkline                             | Single listed price (flat) or enrich prices                            | —                                                                                | No synthetic curve; empty sparkline when no price                                          |
| Market intel (search volume, sellers, price range)   | SerpAPI Google Trends + Shopping                                       | `SERPAPI_KEYS`                                                                   | `meta.status` gates UI; no sine-wave sparkline; honest `canCompete` / empty risk factors   |
| Market intel seasonality copy                        | Calendar-based (current month)                                         | —                                                                                | Labeled heuristic where shown                                                              |
| Product validation engines                           | Deterministic scoring on user form + optional live enrich/market-intel | Optional keys above                                                              | Optional engines show **Not run** when inputs empty                                        |
| Trend analysis (signals, rising stars)               | Aggregated live sources                                                | `GOOGLE_TRENDS_API_KEY` / `RAPIDAPI_GOOGLE_TRENDS_KEY`, Amazon keys, social keys | Empty signals; adapters return `success: false` with setup message — no synthetic fallback |
| Trend peak forecast                                  | Deterministic from real signal volumes                                 | —                                                                                | `predictedPeak` / `timeToPeak` are `null` → UI shows **—**                                 |
| Reviews intelligence                                 | Rainforest / platform review APIs                                      | `RAINFOREST_API_KEY`                                                             | Review section unavailable state                                                           |
| Niche / category catalog                             | CJ + local catalog                                                     | `CJ_API_KEY`                                                                     | Catalog-only or empty with setup hint                                                      |
| Store connections (Shopify / WooCommerce)            | User OAuth / store credentials                                         | See `.env.example`                                                               | Connection not configured state                                                            |
| Fulfillment (CJ)                                     | CJ API                                                                 | `CJ_API_KEYS`                                                                    | Adapter unavailable message                                                                |
| Return label purchase                                | EasyPost (real postage, cheapest rate auto-selected)                   | `EASYPOST_API_KEYS`                                                              | Honest `501` with setup instructions; never a fabricated tracking number                   |
| AI assists                                           | OpenAI / Groq pools                                                    | `OPENAI_API_KEYS`, `GROQ_API_KEYS`                                               | Provider unavailable; no fake completions                                                  |
| Email (trend digest)                                 | Resend / SendGrid                                                      | `RESEND_API_KEY` / `SENDGRID_API_KEY`                                            | Email not configured state                                                                 |
| Revenue / profit KPIs                                | User Firestore entries                                                 | Firebase Admin                                                                   | Empty / coming soon naming the missing deliverable                                         |
| Competitor monitoring                                | Live competitor tracker APIs                                           | Scraper/Serp keys                                                                | Coming soon / empty — no fabricated competitor stats                                       |

Full env template: `.env.example`.

## Honesty UI components

| Component                     | When to use                                                                    | testid              |
| ----------------------------- | ------------------------------------------------------------------------------ | ------------------- |
| `DataSourceBadge`             | Label provenance (`live`, `firestore`, `user`, `estimated`)                    | `data-source-badge` |
| `ComingSoon`                  | Production-ready shell awaiting a named deliverable; **requires** `whatNeeded` | `coming-soon`       |
| `DataUnavailable`             | Source not configured / failed; include setup                                  | `data-unavailable`  |
| `QuotaExhausted`              | Rate limit hit; point at key pool                                              | —                   |
| `EmptyState` / `SectionEmpty` | No rows yet                                                                    | —                   |

## Verification commands

```bash
npm run typecheck
npm run lint
npm run honesty
npm run test
```
