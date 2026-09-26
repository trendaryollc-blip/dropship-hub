# DropShip Hub

Dropshipping operations hub — product discovery and validation across platforms (AliExpress, eBay, Amazon, CJ Dropshipping), listing generation, order fulfillment and routing, supplier management, competitor analysis, price-war automation, profit tracking, multi-store push (Shopify / WooCommerce / Trendaryo), and a daily business-intelligence digest.

Scoring and recommendations are **rule-based** (deterministic formulas over real data). LLM features (chat assistant, due-diligence reports, listing text) run only when you connect an AI provider key — without one they show an honest "no provider connected" message, never fake output.

> **Honesty policy:** a number is only rendered if it comes from a **live API**, **your Firestore**, or **user input**. Heuristics over real inputs are labeled _Estimated_. Rule engines are labeled _rule-based_, never "AI". When a data source is missing, the UI shows an explicit setup instruction instead of mock data. See [DATA_SOURCES.md](DATA_SOURCES.md) for the full feature → source map.

## Current status

- **Works out of the box:** auth, all 10 calculators, dashboard from your own store data, profit/revenue/cash-flow tracking, price-war and order-routing rules, missions, compliance checks, listing templates, reports, settings, and the full admin area.
- **Work fully once API keys are added:** product search & trending, market intel (Google Trends interest index), trend analysis, niche catalog, competitor enrichment, CJ fulfillment, return labels (EasyPost), review import (Amazon via Rainforest), AI provider features. Without keys these pages show honest empty/setup states.
- **Review import:** CSV upload works out of the box (no key); Amazon works with `RAINFOREST_API_KEY`; AliExpress/CJ/eBay sources honestly report they aren't connected instead of importing anything fake.

Full per-feature status: **[FEATURE-CATALOG.md](FEATURE-CATALOG.md)**.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS 4, custom theme system
- **Database:** Firebase — client SDK in the browser, Admin SDK on the server
- **State/data:** SWR for API data, shared zod schemas for validation
- **AI (optional):** Multi-provider (OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, …) with admin-managed keys
- **Infrastructure:** Vercel, Upstash Redis (rate limiting), Inngest (background jobs), Stripe (billing), Resend + SendGrid (email failover)
- **Testing:** Vitest (635 files / 6,169 tests), Playwright (15 e2e specs), ESLint 9, custom honesty guard

## Getting Started

### 1. Prerequisites

- Node.js 20+
- A Firebase project (Auth + Firestore enabled)
- At least one data API key for live product data (e.g. `SERPAPI_KEYS`) — optional; the app degrades honestly without it
- Optionally, one AI provider key for LLM features

### 2. Install & configure

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Required values:

| Variable                                   | Purpose                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_*`                   | Firebase web config (client)                                                   |
| `FIREBASE_SERVICE_ACCOUNT`                 | Firebase Admin SDK service-account JSON (server)                               |
| `TRENDARYO_JWT_SECRET`                     | Optional Trendaryo store integration JWT signing                               |
| `OWNER_UID` / `OWNER_EMAIL`                | Bootstrap the admin/owner account                                              |
| `SERPAPI_KEYS`                             | Live product search / Google Trends (comma-separated key pool)                 |
| One AI provider key (e.g. `GROQ_API_KEYS`) | Optional LLM features                                                          |
| `UPSTASH_REDIS_REST_URL/TOKEN`             | Durable per-user rate limiting (recommended in production)                     |
| `CRON_SECRET`                              | Server-to-server auth for scheduled jobs (e.g. the daily digest GitHub Action) |

Full key list and signup links: [DATA_SOURCES.md](DATA_SOURCES.md).

### 3. Run

```bash
npm run dev        # http://localhost:3000
```

Deploy Firestore rules and indexes when they change:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Scripts

| Command                       | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `npm run dev`                 | Start the dev server                                       |
| `npm run build` / `npm start` | Production build / serve                                   |
| `npm run typecheck`           | `tsc --noEmit` (strict)                                    |
| `npm run lint`                | ESLint                                                     |
| `npm run honesty`             | Fabrication guard (fails on mock/random data in app pages) |
| `npm test`                    | Full Vitest suite (runs in CI)                             |
| `npm run test:quick`          | Fast subset: `src/lib`, `src/types`, `src/hooks`           |
| `npm run test:failed`         | Re-run only tests that failed on the previous run          |
| `npm run test:coverage`       | Vitest with V8 coverage                                    |
| `npm run test:e2e`            | Playwright e2e suite (starts the dev server itself)        |

### Verification gate

Every change must pass all four before merge:

```bash
npm run typecheck
npm run lint        # 0 errors required
npm run honesty
npm run test
```

## Project Structure

```
src/
├── app/
│   ├── (marketing)/      # Public landing pages
│   ├── (auth)/           # sign-in / sign-up / forgot-password
│   ├── (app)/            # Authenticated dashboard + 50+ feature pages
│   ├── (admin)/admin/    # Owner-only admin area
│   └── api/              # 44 API route groups (231 route handlers)
├── components/           # Feature + shared UI components (src/components/ui = honesty primitives)
├── contexts/             # React contexts (AI mode, search tracking)
├── hooks/                # Reusable hooks (useAPI, useFirestore, …)
├── lib/                  # Core business logic
│   ├── auth.ts           # withAuth / requireOwner / withAuthOrCron
│   ├── rate-limit.ts     # Upstash-backed per-user/per-tier limits
│   ├── validation.ts     # Shared zod schemas
│   ├── api-errors.ts     # PublicError / safeErrorMessage (no internal leaks)
│   ├── firebase-admin.ts # Admin SDK singleton
│   ├── api-keys/         # Multi-key pools with rotation + quota cooldown
│   ├── ai/               # Provider engine, modes, safety, workflows
│   ├── data/             # Per-feature Firestore data access + schemas
│   └── …
└── __tests__/            # Integration / security / performance suites
scripts/
└── honesty-guard.mjs      # CI fabrication guard (npm run honesty)
```

## Security Model

- **API routes** require a Firebase ID token (`Authorization: Bearer …`), verified with the Admin SDK; handlers are wrapped in `withAuth` (per-user, per-tier rate limits) or `requireOwner` (owner-only).
- **Firestore rules** (`firestore.rules`) restrict direct client access: users read/write only their own subcollections. The `role`, `banned` and `tier` profile fields and the `users/{uid}/settings/subscription` billing doc are server-only — clients can never escalate privileges or self-upgrade a plan.
- **Error responses** are sanitized through `safeErrorMessage`: only explicitly-marked `PublicError` messages reach clients; unexpected errors return generic fallbacks.
- **Cron jobs** authenticate with `CRON_SECRET` (`withAuthOrCron`), compared with a timing-safe equality check.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, `npm audit`, the full unit suite, a production build, and the Playwright e2e suite on every push/PR to `main`. A separate scheduled workflow (`.github/workflows/daily-digest.yml`) triggers the daily digest against the production deployment using `CRON_SECRET`.

## Deployment (Vercel)

Full step-by-step checklist: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

1. Import the repo into Vercel; configure all env vars from `.env.example`.
2. Deploy Firestore rules/indexes (`firebase deploy --only firestore:rules,firestore:indexes`).
3. Set the `APP_URL` and `CRON_SECRET` GitHub secrets so the daily digest workflow can reach the
   deployment.

## Chrome Extension

`chrome-extension/` contains a companion extension that saves products from any page into the logged-in user's account via `POST /api/chrome-extension/save`.

## Documentation

| Document                                         | Contents                                                                                        |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [FEATURE-CATALOG.md](FEATURE-CATALOG.md)         | Every feature in the app with functional status, testing system, completed work, and next steps |
| [CHANGELOG.md](CHANGELOG.md)                     | What shipped and when — grouped by date from the real commit history                            |
| [DEPLOYMENT.md](DEPLOYMENT.md)                   | Launch checklist: accounts, env vars, Stripe webhook, GitHub secrets, smoke tests               |
| [DATA_SOURCES.md](DATA_SOURCES.md)               | Feature → data source map, key pools, honesty UI components                                     |
| [IMPLEMENTATION-PLAN.md](IMPLEMENTATION-PLAN.md) | Original build plan                                                                             |
