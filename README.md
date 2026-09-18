# DropShip Hub

AI-powered dropshipping operations hub — product discovery and validation across platforms (AliExpress, eBay, Amazon, CJ Dropshipping), AI listing generation, order fulfillment and routing, supplier management, competitor analysis, price-war automation, profit tracking, multi-store push (Shopify / WooCommerce / Trendaryo), and a daily AI business-intelligence digest.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS 4, custom theme system
- **Database:** Firebase — client SDK in the browser, Admin SDK on the server
- **State/data:** SWR for API data, shared zod schemas for validation
- **AI:** Multi-provider (OpenAI, Anthropic, Google Gemini, Groq, DeepSeek, Mistral, …) with admin-managed keys
- **Infrastructure:** Vercel, Upstash Redis (rate limiting), Inngest (background jobs), Stripe (billing), Resend + SendGrid (email failover)
- **Testing:** Vitest (~2,500 unit/component tests), Playwright (e2e), ESLint 9

## Getting Started

### 1. Prerequisites

- Node.js 20+
- A Firebase project (Auth + Firestore enabled)
- At least one AI provider API key

### 2. Install & configure

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`. Required values:

| Variable                                    | Purpose                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_FIREBASE_*`                    | Firebase web config (client)                                                   |
| `FIREBASE_SERVICE_ACCOUNT`                  | Firebase Admin SDK service-account JSON (server)                               |
| `JWT_SECRET`                                | Token signing                                                                  |
| `OWNER_UID` / `OWNER_EMAIL`                 | Bootstrap the admin/owner account                                              |
| One AI provider key (e.g. `OPENAI_API_KEY`) | AI features                                                                    |
| `UPSTASH_REDIS_REST_URL/TOKEN`              | Durable per-user rate limiting (recommended in production)                     |
| `CRON_SECRET`                               | Server-to-server auth for scheduled jobs (e.g. the daily digest GitHub Action) |

### 3. Run

```bash
npm run dev        # http://localhost:3000
```

Deploy Firestore rules and indexes when they change:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Scripts

| Command                       | Description                                         |
| ----------------------------- | --------------------------------------------------- |
| `npm run dev`                 | Start the dev server                                |
| `npm run build` / `npm start` | Production build / serve                            |
| `npm run typecheck`           | `tsc --noEmit` (strict)                             |
| `npm run lint`                | ESLint                                              |
| `npm test`                    | Full Vitest suite (runs in CI)                      |
| `npm run test:quick`          | Fast subset: `src/lib`, `src/types`, `src/hooks`    |
| `npm run test:failed`         | Re-run only tests that failed on the previous run   |
| `npm run test:coverage`       | Vitest with V8 coverage                             |
| `npm run test:e2e`            | Playwright e2e suite (starts the dev server itself) |

## Project Structure

```
src/
├── app/
│   ├── (marketing)/      # Public landing pages
│   ├── (auth)/           # sign-in / sign-up / forgot-password
│   ├── (app)/            # Authenticated dashboard + 30+ feature pages
│   ├── (admin)/admin/    # Owner-only admin area
│   └── api/              # 44 API route groups (231 route handlers)
├── components/           # Feature + shared UI components
├── contexts/             # React contexts (AI mode, search tracking)
├── hooks/                # Reusable hooks (useAPI, useFirestore, …)
├── lib/                  # Core business logic
│   ├── auth.ts           # withAuth / requireOwner / withAuthOrCron
│   ├── rate-limit.ts     # Upstash-backed per-user/per-tier limits
│   ├── validation.ts     # Shared zod schemas
│   ├── api-errors.ts     # PublicError / safeErrorMessage (no internal leaks)
│   ├── firebase-admin.ts # Admin SDK singleton
│   ├── ai/               # Provider engine, modes, safety, workflows
│   ├── data/             # Per-feature Firestore data access + schemas
│   └── …
└── __tests__/            # Integration / security / performance suites
```

## Security Model

- **API routes** require a Firebase ID token (`Authorization: Bearer …`), verified with the Admin SDK; handlers are wrapped in `withAuth` (per-user, per-tier rate limits) or `requireOwner` (owner-only).
- **Firestore rules** (`firestore.rules`) restrict direct client access: users read/write only their own subcollections. The `role`, `banned` and `tier` profile fields and the `users/{uid}/settings/subscription` billing doc are server-only — clients can never escalate privileges or self-upgrade a plan.
- **Error responses** are sanitized through `safeErrorMessage`: only explicitly-marked `PublicError` messages reach clients; unexpected errors return generic fallbacks.
- **Cron jobs** authenticate with `CRON_SECRET` (`withAuthOrCron`), compared with a timing-safe equality check.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs lint, typecheck, `npm audit`, the full unit suite, a production build, and the Playwright e2e suite on every push/PR to `main`. A separate scheduled workflow triggers the daily digest against the production deployment using `CRON_SECRET`.

## Deployment (Vercel)

1. Import the repo into Vercel; configure all env vars from `.env.example`.
2. Deploy Firestore rules/indexes (`firebase deploy --only firestore:rules,firestore:indexes`).
3. Set the `APP_URL` and `CRON_SECRET` GitHub secrets so the daily digest workflow can reach the deployment.

## Chrome Extension

`chrome-extension/` contains a companion extension that saves products from any page into the logged-in user's account via `POST /api/chrome-extension/save`.
