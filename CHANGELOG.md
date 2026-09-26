# Changelog

All notable changes to DropShip Hub. Dates use the actual commit history
(`git log --date=short`). Feature-level detail lives in
[FEATURE-CATALOG.md](FEATURE-CATALOG.md).

## 2026-09-26

### Added — billing & plan enforcement

- Pricing page (`/pricing`) with monthly/yearly plans, current-plan badges, and
  Stripe Checkout start (`467e32db`).
- Billing settings page (`/settings/billing`): plan + status, usage bars,
  invoices, Stripe customer portal, checkout success banner.
- Plan limits enforced server-side: monthly AI message cap (429), free-tier AI
  provider restriction (403), product cap on lifecycle creation (429), store
  connection cap (429), store-push usage tracking, live product usage counts.
- Tier is only paid when the Stripe subscription is `active` or `trialing`
  (both tier resolvers share this rule).

### Added — customer service & subscriptions

- CS response templates: create/delete with confirmation dialog
  (`27f354d9`).
- Email capture on the landing CTA → `POST /api/subscribe` (rate-limited,
  honeypot, dedupe, best-effort welcome email when Resend/SendGrid is
  configured).

### Added — analytics, SEO & monitoring

- PostHog pageviews + `track()` helper (opt-in via `NEXT_PUBLIC_POSTHOG_KEY`),
  Vercel Analytics + Speed Insights in the root layout.
- `robots.ts`, `sitemap.ts`, canonical metadata + Open Graph tags.
- Sentry error monitoring, opt-in via `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN`
  (server `instrumentation.ts` + client `instrumentation-client.ts`).

### Fixed — security

- XSS: AI `renderMarkdown` output is HTML-escaped before structural markup
  (`f39ea504`).
- Etsy webhook fails closed (timing-safe secret check, `ETSY_WEBHOOK_SECRET`).
- Removed dead `/api/search/parse-intent` LLM proxy endpoint.
- Resolved stale security TODO on bulk orders (routes are already
  `withAuth`-guarded).

### Fixed — honesty

- Removed fabricated review rating distribution / trust-score fallbacks
  (`5cf20b79`).
- Removed fabricated time-series: competitor trends show real `daysAgo`-based
  points or null; customer tracking events no longer invented; "estimated"
  labels on scraped review ratings (`8c11a9a3`).

## 2026-09-25

### Added

- Full-app fabricated-data audit with honest empty states, `honesty` gate
  script, README + FEATURE-CATALOG docs (`6404bc2a`).

## 2026-09-24

### Fixed

- Auth-bounce `callbackUrl` preserves query parameters (`ed950ef8`).
