# Frontend page / component map

Every page under `src/app`, its route, components used, and API routes called. Reusable components under `src/components` with a one-line description.

---

## Pages (App Router)

### Root & auth

| Route path | File | Components used | API routes called |
|------------|------|------------------|--------------------|
| `/` | `app/page.tsx` | (none – inline markup, `Link`) | None (server: `prisma.advertiser.count()`, `getCurrentUserOrNull`) |
| `/sign-in` | `app/(auth)/sign-in/[[...sign-in]]/page.tsx` | Clerk `<SignIn />` | None |
| `/sign-up` | `app/(auth)/sign-up/[[...sign-up]]/page.tsx` | Clerk `<SignUp />` | None |
| `/pending` | `app/pending/page.tsx` | (inline) | None |

### Dashboard (authenticated, active users)

| Route path | File | Components used | API routes called |
|------------|------|------------------|--------------------|
| `/explore` | `app/(dashboard)/explore/page.tsx` | `ExploreFilters`, `ExploreSearchSort`, `ExploreAdCardWithModal`, `ExploreScrapingBanner`, `ExploreFollowBanner`, `ExploreFetchingAdsBanner`; utils: `ad-card-utils` | None (server: Prisma for ads, sync running runs) |
| `/advertisers` | `app/(dashboard)/advertisers/page.tsx` | `AdvertisersPageClient` | From client: `GET /api/advertisers/list`; `POST /api/advertisers/:id/follow`, `unfollow`; `DELETE /api/advertisers/:id` |
| `/collections` | `app/(dashboard)/collections/page.tsx` | `CollectionsView` | From client: `GET /api/collections`, `DELETE /api/collections/:id`; server: `getUserCollections` (service) |
| `/collections/[id]` | `app/(dashboard)/collections/[id]/page.tsx` | `ExploreFilters`, `ExploreSearchSort`, `ExploreAdCard`, `AdCardSaveButton`, `CollectionDetailActions`, `AdCardClickWrapper`; utils: `ad-card-utils` | From client (via actions): `DELETE /api/collections/:id/ads/:adId`; server: `getCollectionWithAllAds` |

**Dashboard layout** (`app/(dashboard)/layout.tsx`): `Navigation`, `SaveToCollectionProvider`, `AdDetailModalProvider`. No API calls.

### Admin

| Route path | File | Components used | API routes called |
|------------|------|------------------|--------------------|
| `/admin` | `app/admin/page.tsx` | (links only) | None |
| `/admin/users` | `app/admin/users/page.tsx` | `AdminUsersClient` | `GET /api/admin/users`; `POST .../approve`, `.../reject`; `PATCH .../plan` |
| `/admin/advertisers` | `app/admin/advertisers/page.tsx` | `AddAdvertiserForm`, `AdvertiserList` | `GET /api/admin/budget`, `GET /api/admin/advertisers`; `POST /api/admin/advertisers`; `POST /api/scrape/:id`, `GET /api/scrape/status/:runId`, `POST /api/scrape/:id/sync` |
| `/admin/import` | `app/admin/import/page.tsx` | (form + file input) | `POST /api/admin/import-apify-json` |
| `/admin/stats` | `app/admin/stats/page.tsx` | (inline “Coming soon”) | None |

**Admin layout** (`app/admin/layout.tsx`): Links only. No API calls.

---

## Reusable components (`src/components`)

### `components/ads/`

| Component | Description |
|-----------|-------------|
| `AdCardClickWrapper` | Wraps ad card to open ad detail modal on click. |
| `AdDetailModal` | Modal showing full ad details; fetches `/api/ads/[adId]`; uses `AdDetailsTab`, `AdImpressionsTab`, `FollowAdvertiserButton`, save-to-collection. |
| `AdDetailModalContext` | Provider for current ad ID and open/close modal. |
| `AdDetailsTab` | Tab content: ad copy, CTA, dates, targeting, thought leader. |
| `AdImpressionsTab` | Tab content: country breakdown and impression estimates. |
| `CountryBreakdownBar` | Bar chart for per-country impression share. |
| `FollowAdvertiserButton` | Button to follow/unfollow advertiser; calls `POST /api/advertisers/:id/follow` or `unfollow`. |

### `components/collections/`

| Component | Description |
|-----------|-------------|
| `CollectionCard` | Card for a single collection (name, description, ad count). |
| `SaveToCollectionContext` | Provider for “save to collection” modal state and current ad ID. |
| `SaveToCollectionModal` | Modal to add ad to collections; uses `GET /api/collections`, `GET /api/ads/:adId/collections`; `POST /api/collections`, `POST /api/collections/:id/ads`; `DELETE` to remove. |

### `components/layout/`

| Component | Description |
|-----------|-------------|
| `AuthNav` | Sign-in / sign-up / user menu (Clerk). |
| `Navigation` | Main nav: Explore, Advertisers, Collections; role-based admin link. |

### `components/ui/` (shadcn-style)

| Component | Description |
|-----------|-------------|
| `badge` | Badge pill for labels. |
| `button` | Button with variants. |
| `card` | Card container (header, content, footer). |
| `dialog` | Modal dialog (Radix). |
| `input` | Text input with styling. |

---

## Explore-specific components (`app/(dashboard)/explore/`)

Not in `components/` but reused from collection detail page:

- `ExploreFilters` – filter sidebar (advertisers, format, impressions, country, language, CTA, date, etc.).
- `ExploreSearchSort` – search box and sort dropdown.
- `ExploreAdCard` – single ad card (format-specific preview components).
- `ExploreAdCardWithModal` – ad card + click to open detail modal.
- `ExploreScrapingBanner` – banner when a scrape is running.
- `ExploreFollowBanner` – prompt to follow advertiser (calls `POST /api/advertisers/:id/follow`).
- `ExploreFetchingAdsBanner` – loading state for ads.
- Format previews: `TextAdPreview`, `CarouselAdPreview`, `VideoAdPreview`, `EventAdPreview`, `JobAdPreview`, `MessageAdPreview`, `DocumentAdPreview`, `SpotlightAdPreview`, `FollowCompanyAdPreview`, `LinkedInArticleAdPreview`, `EventAdPreview`.
- `AdCardSaveButton` – save ad to collection (opens save modal).
- `ad-card-utils.ts` – `FORMAT_LABELS`, `impressionsToNumber`, `getAdEstImpressions`, etc.

These are used by `explore/page.tsx` and some by `collections/[id]/page.tsx`.
