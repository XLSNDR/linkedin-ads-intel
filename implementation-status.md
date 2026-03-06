# Current implementation status

Summary of what is fully working, partially built, stubbed/placeholder, and any known bugs or TODOs found in the codebase. Use this so task lists and PRDs don’t re-spec things that already exist.

---

## Fully working

- **Auth & users**
  - Clerk sign-in / sign-up; redirect to `/pending` after sign-up.
  - Clerk webhook: create/update/delete user in DB; new users created with `isActive: false`.
  - Dashboard layout: redirect unauthenticated to sign-in, inactive users to `/pending`.
  - `/pending` page: “We’ll email you when approved.”
  - Sync-user dev helper: `GET /api/sync-user` to create/update DB user from Clerk on localhost.

- **Admin user management & approval**
  - Admin users list: pending approvals + all users; approve (with plan + send approval email), reject (send rejection email), change plan.
  - Resend integration: approval and rejection emails; `RESEND_API_KEY` required (missing returns error to UI).
  - Admin layout: require admin role; links to Admin, Users, Stats, Advertisers, Import.

- **Advertisers (user)**
  - Add advertiser by LinkedIn company URL (`/api/advertisers/add`); list user’s advertisers (`/api/advertisers/list`).
  - Follow / unfollow / refollow; delete user–advertiser link.
  - Advertisers page client: list, add modal, follow/unfollow/delete with confirm modals.

- **Advertisers (admin)**
  - List all advertisers; create advertiser (name, LinkedIn ID/URL, optional start URLs, results limit).
  - Budget: show Apify spend and monthly limit.
  - Start scrape for advertiser; poll scrape status; trigger sync for run.
  - Fix duplicate advertiser (merge) endpoint.
  - Import Apify JSON: `POST /api/admin/import-apify-json`.

- **Explore**
  - Server-rendered explore page: filters (advertiser, format, impressions, country, language, CTA, date range, search), sort, pagination.
  - Ads loaded via Prisma (no client fetch for main list); sync of running scrape runs on page load.
  - Format-specific ad card previews (text, carousel, video, job, message, document, event, spotlight, follow company, article).
  - Ad card click opens detail modal; modal fetches `/api/ads/[adId]`; follow advertiser, save to collection from modal.

- **Collections**
  - List/create/update/delete collections (`/api/collections`, `PUT/DELETE /api/collections/[id]`).
  - Add/remove ad to/from collection (`/api/collections/[id]/ads`, `.../ads/[adId]`).
  - Collections page: list with create; collection detail page with filters and ad grid; remove ad from collection.
  - Save-to-collection modal: list collections, toggle membership, create collection; used from explore and ad detail modal.

- **Cron**
  - `GET /api/cron/sync-scrapes`: sync Apify run status and store new/updated ads (protected by `CRON_SECRET`).
  - `GET /api/cron/scrape-due-advertisers`: start scrape runs for due advertisers (cron-style).

- **Scraper pipeline**
  - Apify client and transform; store ads; sync scrape run; plan limits (max added/followed advertisers, etc.).
  - Playwright/LinkedIn Ads Library scraper exists (`src/lib/scraper/`); scripts for scrape-by-url and test-scraper.

- **Data model**
  - Prisma schema: User, Plan, Advertiser, UserAdvertiser, Ad, Snapshot, Collection, CollectionAd, ScrapeRun.
  - Migrations and seed (plans: free_trial, starter, pro, agency, admin).

---

## Partially built / notes

- **Plan limits**
  - Plan limits (max added/followed, refresh frequency, snapshot retention, etc.) are in schema and seed; enforcement in add/follow flows and scraper may not cover every edge case.

- **Stripe**
  - Plan model has `stripePriceId`, `stripePriceIdMonthly`, `stripePriceIdYearly`, `priceMonthly`, `priceYearly` but marked “optional for MVP”; no billing or checkout implemented.

- **Resend**
  - With free tier and `onboarding@resend.dev`, only the Resend-verified email can receive; approval/rejection to other addresses may not deliver. Custom domain + `EMAIL_FROM` removes this limit.

- **LinkedIn scraper**
  - `docs/SCRAPER-SETUP.md`: “Selectors are placeholders – LinkedIn’s DOM changes; you’ll need to inspect the live page and update SELECTORS in this file.” Production use may require selector maintenance.

- **Supabase storage**
  - `lib/storage/upload-image.ts` uses `NEXT_PUBLIC_SUPABASE_URL` and service role or anon key; image upload for ads may be optional or used in specific flows only.

---

## Stubbed / placeholder

- **Admin Stats**
  - `/admin/stats`: single line “Coming soon — platform stats and metrics will appear here.” No data or API.

- **Scripts**
  - `scripts/test-scraper.ts`: TODOs to set `DIVERSE_COMPANY_ID` and `DIVERSE_COMPANY_NAME` for a test advertiser.

---

## Known bugs / TODOs (from codebase)

- **Comments / docs**
  - `docs/PROJECT-OVERVIEW.md`: says “Explore and Collections UI is mostly placeholder” – may be outdated; Explore and Collections are implemented as above.
  - `docs/SCRAPER-SETUP.md`: LinkedIn scraper selectors are placeholders; need updating when DOM changes.
  - `scripts/test-scraper.ts`: TODO placeholders for company ID and name.

- **UI copy**
  - Various `placeholder` attributes on inputs (e.g. “Company name”, “Search for advertiser…”) – these are normal input hints, not missing features.

- **Ad preview components**
  - Some components mention “placeholder” for missing image/logo (e.g. when Apify doesn’t return video thumbnail or thought leader image); these are intentional fallbacks, not bugs.

No unresolved `TODO`/`FIXME`/`HACK` strings were found in `src/` that indicate blocking bugs; the only concrete TODOs are in scripts and docs (scraper selectors and script config).

---

## Quick reference for task lists

- **Already there:** Auth (Clerk + webhook), admin users + approval + Resend emails, user/advertiser add-follow-unfollow, admin advertisers + scrape + import, explore (filters/sort/pagination + ad cards + detail modal), collections CRUD + save-to-collection modal, cron sync/scrape-due, Prisma models and migrations.
- **Not built:** Admin stats page, Stripe billing, any new features beyond the above.
- **Conditional / env:** Resend (needs `RESEND_API_KEY`; free-tier recipient limit); Supabase (optional for image upload); scraper selectors (maintain when LinkedIn DOM changes).
