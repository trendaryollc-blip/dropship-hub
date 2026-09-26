# Deployment Checklist

Step-by-step path from this repo to a live DropShip Hub deployment.
**Budget: $0–20/mo** — everything below has a free tier (Vercel Hobby, Firebase
Spark, PostHog free, Sentry free, Stripe pay-as-you-go).

`.env.example` is the full catalog of every variable this app reads. This file
tells you **which ones you need for launch, in what order, and where to get
them**.

---

## 1. Accounts to create

| Account    | Needed for                                                                      | Free?                 | Where                               |
| ---------- | ------------------------------------------------------------------------------- | --------------------- | ----------------------------------- |
| Firebase   | Auth + Firestore (the whole database)                                           | Yes (Spark)           | https://console.firebase.google.com |
| Stripe     | Billing / subscriptions                                                         | Pay-as-you-go         | https://dashboard.stripe.com        |
| Vercel     | Hosting                                                                         | Yes (Hobby)           | https://vercel.com                  |
| GitHub     | Repo + CI + daily digest action                                                 | Yes                   | already have                        |
| PostHog    | Product analytics                                                               | Yes (1M events/mo)    | https://app.posthog.com             |
| Sentry     | Error monitoring                                                                | Yes (5k errors/mo)    | https://sentry.io                   |
| Upstash    | Redis rate limiting (required in prod — Vercel serverless has no shared memory) | Yes                   | https://console.upstash.com         |
| Resend     | Transactional email (subscribe welcome, etc.)                                   | Yes (3k/mo)           | https://resend.com                  |
| SerpAPI    | Live trends data                                                                | Yes (100 searches/mo) | https://serpapi.com                 |
| Rainforest | Amazon reviews import                                                           | Paid per call         | https://rainforestapi.com           |
| Keepa      | Amazon BSR data                                                                 | Paid per call         | https://keepa.com                   |
| EasyPost   | Real return labels                                                              | Test keys free        | https://www.easypost.com            |

AI works out of the box with **Groq or Google AI free tiers** (add
`GROQ_API_KEYS` / `GOOGLE_AI_API_KEY`) — no OpenAI spend required.

---

## 2. Firebase setup

1. Create a project → **Add app → Web** → copy the 6
   `NEXT_PUBLIC_FIREBASE_*` values.
2. **Authentication → Sign-in method**: enable **Email/Password** and
   **Google**.
3. **Firestore Database**: create (production mode, choose the region closest
   to your Vercel region).
4. **Service account**: Project settings → Service accounts → _Generate new
   private key_. Either paste the three `FIREBASE_ADMIN_*` values (the key's
   `private_key` needs its newlines preserved) or put the whole JSON in
   `FIREBASE_SERVICE_ACCOUNT`.
5. Deploy security rules and indexes:
   ```
   firebase deploy --only firestore:rules,firestore:indexes
   ```
6. **Owner account**: sign up once on the deployed app, then copy your UID
   from Authentication → Users into `OWNER_UID` (and your email into
   `OWNER_EMAIL`).

## 3. Vercel project

1. Import the GitHub repo (framework auto-detected: Next.js; build
   `npm run build`; output handled by the Next plugin).
2. Add every env var from `.env.example` that you have keys for — **Project →
   Settings → Environment Variables** (Production + Preview).
3. **Required for boot**: the 6 `NEXT_PUBLIC_FIREBASE_*`, the 3
   `FIREBASE_ADMIN_*` (or `FIREBASE_SERVICE_ACCOUNT`), `OWNER_UID`,
   `OWNER_EMAIL`, and `NEXT_PUBLIC_APP_URL`.

## 4. Domain

1. Buy/connect the domain in Vercel → Domains.
2. Update **`NEXT_PUBLIC_APP_URL`** to `https://yourdomain.com` (drives
   sitemap/OG/canonical URLs — the code falls back to localhost without it).
3. Redeploy so the new env vars take effect.

## 5. Stripe billing

1. Start in **Test mode**. Create two products with prices:
   - **Pro** → monthly + yearly Price IDs → `STRIPE_PRO_MONTHLY_PRICE_ID`,
     `STRIPE_PRO_YEARLY_PRICE_ID`
   - **Enterprise** → `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID`,
     `STRIPE_ENTERPRISE_YEARLY_PRICE_ID`
2. Set `STRIPE_SECRET_KEY` (test key first).
3. **Webhook** → Add endpoint:
   - URL: `https://yourdomain.com/api/billing/webhook`
   - Events: `checkout.session.completed`,
     `customer.subscription.updated`, `customer.subscription.deleted`,
     `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
4. After smoke tests pass, flip to live keys/prices and add a **live** webhook
   endpoint with its own signing secret.

## 6. Rate limiting (Upstash)

Create a Redis database in Upstash (free) → copy
`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`. Without these,
rate limiting falls back to per-instance memory that resets on every
serverless cold start — not safe for production.

## 7. Analytics & errors

| Variable                                | Source                                  |
| --------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_POSTHOG_KEY`               | PostHog → Project settings → API key    |
| `NEXT_PUBLIC_POSTHOG_HOST`              | `https://us.i.posthog.com` (or EU host) |
| `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_DSN` | Sentry → Project → Client keys (DSN)    |

Both stay silent until set — safe to add later. Vercel Analytics + Speed
Insights activate automatically on Vercel with no setup.

## 8. GitHub secrets (daily digest workflow)

Repo → Settings → Secrets and variables → Actions:

- `APP_URL` = `https://yourdomain.com`
- `CRON_SECRET` = same value as the `CRON_SECRET` env var on Vercel (long
  random string)

`.github/workflows/daily-digest.yml` uses them to call `/api/digest`.

## 9. Post-deploy smoke test

- [ ] `/` renders; sitemap/OG tags present (view-source → `og:image`,
      `canonical`)
- [ ] `/robots.txt` and `/sitemap.xml` resolve and use your real domain
- [ ] Sign up with email → lands in `/dashboard`
- [ ] Google sign-in works
- [ ] `/pricing` → Pro → Stripe checkout opens (test mode)
- [ ] Complete test checkout → `/settings/billing` shows **Pro / active**
- [ ] AI chat answers on the free tier (needs at least one AI key)
- [ ] Stripe webhook: checkout completion updates Firestore subscription doc
- [ ] `POST /api/subscribe` from the landing form stores a lead + welcome
      email arrives (if Resend/SendGrid configured)
- [ ] Sentry receives a test error; PostHog shows pageviews + `identify`
- [ ] `/api/*` rate limiting responds 429 when hammered

---

## What works without optional keys

Honest states instead of failures (by design — see the Honesty policy in the
README): no AI key → setup message; no SerpAPI/Keepa → trends panels say not
connected; no Rainforest → review import offers CSV; no EasyPost → returns
offer CSV; no email provider → subscribe still stores the lead, skips the
welcome email.
