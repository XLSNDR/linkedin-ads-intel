# Architecture snapshot

Generated for use as project knowledge (e.g. with Claude). Excludes `node_modules`, `.next`, `.git`.

---

## 1. Folder / file tree

```
linkedin-ads-intel/
├── .env
├── .env.example
├── .env.vercel.backup
├── .eslintrc.json
├── .gitignore
├── .vercel/
│   ├── project.json
│   └── README.txt
├── components.json
├── docs/
│   ├── apify-integration-prd and task list.md
│   ├── apify-integration-prd and task list.pdf
│   ├── cron-sync-scrapes.md
│   ├── deploy.md
│   ├── import-apify-json.md
│   ├── PROJECT-OVERVIEW.md
│   ├── RECOMMENDED-NEXT-STEPS.md
│   ├── SCRAPER-SETUP.md
│   └── START-HERE.md
├── next.config.mjs
├── next-env.d.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── prisma.config.ts
├── prisma/
│   ├── add-followed-at.sql
│   ├── fix-failed-migration-followed-at.sql
│   ├── migrations/
│   │   ├── 20260213130655_full_schema/
│   │   ├── 20260215000000_advertiser_schema_to_linkedin/
│   │   ├── 20260220100000_advertiser_features/
│   │   ├── 20260220110000_scrape_run_job_type/
│   │   ├── 20260220120000_add_thought_leader_fields/
│   │   ├── 20260224100000_add_followed_at_to_user_advertiser/
│   │   └── migration_lock.toml
│   ├── schema.prisma
│   └── seed.ts
├── README.md
├── scripts/
│   ├── enrich-event-ad-images.ts
│   ├── fix-simplicate-duplicate.ts
│   ├── scrape-by-url.ts
│   ├── test-cron.mjs
│   └── test-scraper.ts
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── error.tsx
│   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── advertisers/
│   │   │   │   ├── AddAdvertiserModal.tsx
│   │   │   │   ├── AdvertisersPageClient.tsx
│   │   │   │   ├── ConfirmModals.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── collections/
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── CollectionDetailActions.tsx
│   │   │   │   ├── CollectionsView.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── explore/
│   │   │   │   ├── AdCardBodyText.tsx
│   │   │   │   ├── AdCardSaveButton.tsx
│   │   │   │   ├── ad-card-utils.ts
│   │   │   │   ├── CarouselAdPreview.tsx
│   │   │   │   ├── DocumentAdPreview.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   ├── EventAdPreview.tsx
│   │   │   │   ├── ExploreAdCard.tsx
│   │   │   │   ├── ExploreAdCardWithModal.tsx
│   │   │   │   ├── ExploreFetchingAdsBanner.tsx
│   │   │   │   ├── ExploreFilters.tsx
│   │   │   │   ├── ExploreFollowBanner.tsx
│   │   │   │   ├── ExploreScrapingBanner.tsx
│   │   │   │   ├── ExploreSearchSort.tsx
│   │   │   │   ├── ExploreToolbar.tsx
│   │   │   │   ├── FollowCompanyAdPreview.tsx
│   │   │   │   ├── JobAdPreview.tsx
│   │   │   │   ├── LinkedInArticleAdPreview.tsx
│   │   │   │   ├── MessageAdPreview.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── SpotlightAdPreview.tsx
│   │   │   │   ├── TextAdPreview.tsx
│   │   │   │   └── VideoAdPreview.tsx
│   │   │   └── layout.tsx
│   │   ├── admin/
│   │   │   ├── advertisers/
│   │   │   │   ├── AddAdvertiserForm.tsx
│   │   │   │   ├── AdvertiserList.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── import/page.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   └── users/
│   │   │       ├── AdminUsersClient.tsx
│   │   │       └── page.tsx
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── advertisers/route.ts
│   │   │   │   ├── budget/route.ts
│   │   │   │   ├── fix-duplicate-advertiser/route.ts
│   │   │   │   ├── import-apify-json/route.ts
│   │   │   │   ├── sync-run/route.ts
│   │   │   │   └── users/
│   │   │   │       ├── [userId]/approve/route.ts
│   │   │   │       ├── [userId]/plan/route.ts
│   │   │   │       ├── [userId]/reject/route.ts
│   │   │   │       └── route.ts
│   │   │   ├── ads/
│   │   │   │   ├── [adId]/collections/route.ts
│   │   │   │   ├── [adId]/route.ts
│   │   │   │   └── [id]/ (see [adId])
│   │   │   ├── advertisers/
│   │   │   │   ├── [userAdvertiserId]/follow/route.ts
│   │   │   │   ├── [userAdvertiserId]/refollow/route.ts
│   │   │   │   ├── [userAdvertiserId]/route.ts
│   │   │   │   ├── [userAdvertiserId]/unfollow/route.ts
│   │   │   │   ├── add/route.ts
│   │   │   │   ├── list/route.ts
│   │   │   │   └── search/route.ts
│   │   │   ├── collections/
│   │   │   │   ├── [id]/ads/[adId]/route.ts
│   │   │   │   ├── [id]/ads/route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   ├── cron/
│   │   │   │   ├── scrape-due-advertisers/route.ts
│   │   │   │   └── sync-scrapes/route.ts
│   │   │   ├── scrape/
│   │   │   │   ├── [advertiserId]/route.ts
│   │   │   │   ├── [advertiserId]/sync/route.ts
│   │   │   │   ├── active/route.ts
│   │   │   │   └── status/[scrapeRunId]/route.ts
│   │   │   ├── sync-user/route.ts
│   │   │   ├── test-db/route.ts
│   │   │   └── webhooks/clerk/route.ts
│   │   ├── error.tsx
│   │   ├── favicon.ico
│   │   ├── fonts/
│   │   ├── global-error.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── not-found.tsx
│   │   ├── page.tsx
│   │   ├── pending/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   └── sign-in, sign-up (redirects under (auth))
│   ├── components/
│   │   ├── ads/
│   │   │   ├── AdCardClickWrapper.tsx
│   │   │   ├── AdDetailModal.tsx
│   │   │   ├── AdDetailModalContext.tsx
│   │   │   ├── AdDetailsTab.tsx
│   │   │   ├── AdImpressionsTab.tsx
│   │   │   ├── CountryBreakdownBar.tsx
│   │   │   └── FollowAdvertiserButton.tsx
│   │   ├── collections/
│   │   │   ├── CollectionCard.tsx
│   │   │   ├── SaveToCollectionContext.tsx
│   │   │   └── SaveToCollectionModal.tsx
│   │   ├── layout/
│   │   │   ├── AuthNav.tsx
│   │   │   └── Navigation.tsx
│   │   └── ui/
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       └── input.tsx
│   ├── lib/
│   │   ├── __tests__/
│   │   ├── apify/
│   │   ├── auth.ts
│   │   ├── constants.ts
│   │   ├── country-flags.ts
│   │   ├── db/
│   │   ├── email.ts
│   │   ├── import-apify-json.ts
│   │   ├── impressions.ts
│   │   ├── linkedin-ad-library-url.ts
│   │   ├── prisma.ts
│   │   ├── scraper/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── utils.ts
│   │   └── utils/
│   ├── middleware.ts
│   └── types/
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
```

---

## 2. API routes (HTTP method + one-line description)

| Route | Methods | Description |
|-------|--------|--------------|
| `/api/admin/advertisers` | GET, POST | List all advertisers (admin); create advertiser (admin). |
| `/api/admin/budget` | GET | Return Apify monthly spend and limit (admin). |
| `/api/admin/fix-duplicate-advertiser` | POST | Merge duplicate advertiser by ID (admin). |
| `/api/admin/import-apify-json` | POST | Import ads from Apify JSON payload (admin). |
| `/api/admin/sync-run` | GET | Trigger sync of a specific Apify run (admin, cron-style). |
| `/api/admin/users` | GET | List pending and all users + plans (admin). |
| `/api/admin/users/[userId]/approve` | POST | Approve user (set active + plan), send approval email. |
| `/api/admin/users/[userId]/plan` | PATCH | Update user's plan (admin). |
| `/api/admin/users/[userId]/reject` | POST | Send rejection email; user stays inactive. |
| `/api/ads/[adId]` | GET | Get single ad by ID (for detail modal). |
| `/api/ads/[adId]/collections` | GET | List collection IDs that contain this ad. |
| `/api/advertisers/add` | POST | Add advertiser by LinkedIn URL (user). |
| `/api/advertisers/list` | GET | List current user's advertisers (added/following). |
| `/api/advertisers/search` | GET | Search advertisers (e.g. for explore filters). |
| `/api/advertisers/[userAdvertiserId]` | DELETE | Remove user–advertiser link (unlist). |
| `/api/advertisers/[userAdvertiserId]/follow` | POST | Set status to "following" (recurring scrape). |
| `/api/advertisers/[userAdvertiserId]/refollow` | POST | Reset follow (refollow) for scheduling. |
| `/api/advertisers/[userAdvertiserId]/unfollow` | POST | Set status to "archived" (stop recurring). |
| `/api/collections` | GET, POST | List user's collections; create collection. |
| `/api/collections/[id]` | PUT, DELETE | Update or delete collection. |
| `/api/collections/[id]/ads` | POST | Add ad to collection. |
| `/api/collections/[id]/ads/[adId]` | DELETE | Remove ad from collection. |
| `/api/cron/scrape-due-advertisers` | GET | Cron: start scrape runs for due advertisers. |
| `/api/cron/sync-scrapes` | GET | Cron: sync Apify run status and store ads. |
| `/api/scrape/[advertiserId]` | POST | Start a scrape run for an advertiser. |
| `/api/scrape/[advertiserId]/sync` | POST | Trigger sync for latest run of advertiser. |
| `/api/scrape/active` | GET | List currently running scrape runs. |
| `/api/scrape/status/[scrapeRunId]` | GET | Get status of a scrape run. |
| `/api/sync-user` | GET | Create/update DB user from Clerk (dev helper). |
| `/api/test-db` | GET | Health check for DB connectivity. |
| `/api/webhooks/clerk` | POST | Clerk webhook: user created/updated/deleted. |

---

## 3. Environment variables

Used across the project (source: `src` and config):

| Variable | Where used | Purpose |
|----------|------------|---------|
| `APIFY_API_TOKEN` | `lib/apify/client.ts` | Apify API authentication. |
| `APIFY_MONTHLY_SPEND_LIMIT` | `lib/services/ad-storage.ts`, `api/admin/budget/route.ts` | Monthly spend cap (default 50 USD). |
| `CLERK_WEBHOOK_SECRET` | `api/webhooks/clerk/route.ts` | Verify Clerk webhook signature. |
| `CRON_SECRET` | `api/cron/scrape-due-advertisers`, `api/cron/sync-scrapes` | Authorize cron GET requests (min 16 chars). |
| `DATABASE_URL` | `lib/prisma.ts` | PostgreSQL connection string. |
| `EMAIL_FROM` | `lib/email.ts` | Resend "from" address (default: onboarding@resend.dev). |
| `NEXT_PUBLIC_APP_URL` | `api/admin/users/[userId]/approve/route.ts` | Base URL for approval email login link. |
| `NODE_ENV` | `lib/prisma.ts`, `api/advertisers/list/route.ts` | development / production. |
| `RESEND_API_KEY` | `lib/email.ts` | Resend API key for approval/rejection emails. |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/storage/upload-image.ts` | Supabase server key (optional). |
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/storage/upload-image.ts` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/storage/upload-image.ts` | Fallback if service role not set. |
| `USE_NEON_SERVERLESS` | `lib/prisma.ts` | Use Neon serverless driver when "1". |
| `VERCEL` | `lib/prisma.ts` | Set to "1" on Vercel. |
