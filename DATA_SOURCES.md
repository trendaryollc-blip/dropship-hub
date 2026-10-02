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

| Feature / page area                                  | Source                                                                 | Env / setup                                             | If unavailable                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Product search / listings                            | Platform search APIs (SerpAPI / Rainforest / platform scrapers)        | `SERPAPI_KEYS`, `RAINFOREST_API_KEY`, `SCRAPER_API_KEY` | Empty results + search guidance                                                                                         |
| Product enrich (multi-platform price, rating, stock) | Live search per platform                                               | Same as above                                           | Partial platforms only; `coverage` meta reports queried/succeeded; no mock padding                                      |
| Price comparison table                               | Enrich `platforms[]`                                                   | —                                                       | `—` for null rating/reviews; stock **Unknown**                                                                          |
| Supplier matches (product detail)                    | Enrich `supplierMatches`                                               | —                                                       | Empty section; **Price n/a** when price is null                                                                         |
| Product detail sparkline                             | Single listed price (flat) or enrich prices                            | —                                                       | No synthetic curve; empty sparkline when no price                                                                       |
| Market intel (search volume, sellers, price range)   | SerpAPI Google Trends + Shopping                                       | `SERPAPI_KEYS`                                          | `meta.status` gates UI; no sine-wave sparkline; honest `canCompete` / empty risk factors                                |
| Market intel seasonality copy                        | Calendar-based (current month)                                         | —                                                       | Labeled heuristic where shown                                                                                           |
| Product validation engines                           | Deterministic scoring on user form + optional live enrich/market-intel | Optional keys above                                     | Optional engines show **Not run** when inputs empty                                                                     |
| Trend analysis (signals, rising stars)               | Google Trends via SerpAPI, Amazon BSR via Keepa, Reddit public JSON    | `SERPAPI_KEYS`, `KEEPA_API_KEYS` (Reddit keyless)       | Missing keys → `success: false` setup message; TikTok/Instagram/X → honest "not connected" note — no synthetic fallback |
| Trend peak forecast                                  | Deterministic from real signal volumes                                 | —                                                       | `predictedPeak` / `timeToPeak` are `null` → UI shows **—**                                                              |
| Reviews intelligence                                 | Rainforest / platform review APIs                                      | `RAINFOREST_API_KEY`                                    | Review section unavailable state                                                                                        |
| Review import (CSV / Amazon)                         | CSV upload (local parse); Amazon reviews via Rainforest                | `RAINFOREST_API_KEY` (Amazon only; CSV is keyless)      | CSV rows validated 1-5; AliExpress/CJ/eBay honest 501 "not connected" — never fake rows                                 |
| Niche / category catalog                             | CJ + local catalog                                                     | `CJ_API_KEY`                                            | Catalog-only or empty with setup hint                                                                                   |
| Store connections (Shopify / WooCommerce)            | User OAuth / store credentials                                         | See `.env.example`                                      | Connection not configured state                                                                                         |
| Fulfillment (CJ)                                     | CJ API                                                                 | `CJ_API_KEYS`                                           | Adapter unavailable message                                                                                             |
| Return label purchase                                | EasyPost (real postage, cheapest rate auto-selected)                   | `EASYPOST_API_KEYS`                                     | Honest `501` with setup instructions; never a fabricated tracking number                                                |
| AI assists                                           | OpenAI / Groq pools                                                    | `OPENAI_API_KEYS`, `GROQ_API_KEYS`                      | Provider unavailable; no fake completions                                                                               |
| Email (trend digest)                                 | Resend / SendGrid                                                      | `RESEND_API_KEY` / `SENDGRID_API_KEY`                   | Email not configured state                                                                                              |
| Revenue / profit KPIs                                | User Firestore entries                                                 | Firebase Admin                                          | Empty / coming soon naming the missing deliverable                                                                      |
| Competitor monitoring                                | Live competitor tracker APIs                                           | Scraper/Serp keys                                       | Coming soon / empty — no fabricated competitor stats                                                                    |

Full env template: `.env.example`.

## Supplier discovery (Find Suppliers)

Live supplier/store search fans out to five platforms in parallel through
`src/lib/supplier-platform-search.ts`.

| Platform        | How data is obtained                             | Attribution (`dataSource`)                          | Notes                                                                                                  |
| --------------- | ------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Alibaba         | ScraperAPI rendered page, embedded `_offer_list` | `live` when the platform payload names the supplier | Supplier identity comes from Alibaba's own payload, so it is treated as live                           |
| Global Sources  | ScraperAPI page, Nuxt `supplierVOList` payload   | `live`                                              | Search URL is scoped to the **HK** exhibitor directory, so results are Hong Kong–listed suppliers only |
| DHgate          | ScraperAPI raw HTML, store/listing patterns      | `estimated`                                         | Stores are inferred from link proximity, not a supplier record, so the badge stays `estimated`         |
| AliExpress      | ScraperAPI raw HTML, listing window patterns     | `estimated`                                         | Listing storefronts are not verified supplier accounts                                                 |
| CJ Dropshipping | CJ product search API                            | `live`                                              | Marketplace listings only; CJ is not presented as a wholesale supplier directory                       |

Attribution rules that must not change:

- Only Alibaba and Global Sources produce `live` supplier sources, because only those
  platforms name the supplier inside their own payload.
- Everything derived from link/sidebar proximity is `estimated`.
- Reliability, order-completion and on-time-shipping metrics are never invented;
  discovered suppliers stay `trustBadge: "unverified"` with zeroed reliability stats.

Currency handling:

- Listing prices keep the currency found in the page (symbol such as `US$`, `HK$`, `€`,
  `£`, or an ISO code such as `USD`, `CNY`, `JPY`).
- A bare `¥`/`￥` is reported **without** a currency code because it is ambiguous between
  CNY and JPY; the platform default is never substituted for it.
- A supplier's `catalog.priceRange` only carries a currency when every priced listing
  agrees; mixed-currency results show the range with no currency rather than guessing.

Operational behaviour:

- Each request runs under a hard deadline (`DEFAULT_SEARCH_DEADLINE_MS`), with a per-fetch
  timeout budget, and the API route declares `maxDuration = 60`.
- Scrape results are cached for 10 minutes (Redis/Upstash when configured, otherwise
  in-memory) and identical concurrent searches share one upstream request.
- Failures are cached for 60 seconds so a repeat search does not re-pay the cost of a
  slow or blocked provider; disabling the cache re-scrapes immediately.
- Results stream to the browser as NDJSON when the client sends
  `Accept: application/x-ndjson`; the default response stays a single JSON payload.
- Upstream provider errors are translated into short user-facing messages; raw provider
  bodies stay in server logs.

Measured live behaviour (ScraperAPI raw HTML + JS rendering):

- Global Sources, DHgate, AliExpress and CJ typically answer in 1-15s.
- Alibaba requires JS rendering and answers in roughly 25-45s; it is intermittently
  served an anti-bot page instead of results. When that happens the UI reports
  "blocked the automated request" rather than blaming a layout change, and the platform
  is simply omitted from that search while the other four still return.
- Alibaba raw (non-rendered) HTML contains no product payload, so rendering is required;
  a per-platform cache entry keeps a failed Alibaba attempt from slowing the next search.

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
