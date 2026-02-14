# Scraper setup (Weeks 5–7)

## What’s in the repo

- **Playwright** – installed; Chromium installed.
- **`src/lib/scraper/test-playwright.ts`** – opens Google, takes a screenshot, prints "Success!".
- **`src/lib/scraper/linkedin-scraper.ts`** – `scrapeAdvertiser(companyId)` navigates to LinkedIn Ads Library, tries to find ad cards, extracts company name, copy, CTA, image URL, and “About the ad” format. **Selectors are placeholders** – LinkedIn’s DOM changes; you’ll need to inspect the live page and update `SELECTORS` in this file.
- **`src/lib/scraper/format-detector.ts`** – maps “About the ad” text + “Promoted by” to one of 11 format strings (e.g. `single_image`, `video`, `thought_leader_text`).
- **`src/lib/storage/upload-image.ts`** – downloads an image from a URL and uploads it to Supabase Storage bucket `ad-creatives` at `ads/{adId}/creative.{ext}`.
- **`src/lib/db/save-ad.ts`** – `saveAdvertiserAds(prisma, companyId, companyName, ads)` upserts the Advertiser and creates Ad records (with format detection and image upload).
- **`scripts/test-scraper.ts`** – full run: scrape → detect format → upload images → save to DB. Uses Prisma with the pg adapter (same pattern as seed).

## What you need to do

### 1. Supabase Storage

1. Open [Supabase](https://supabase.com) → your project → **Storage**.
2. **Create bucket**: name `ad-creatives`, set to **Public**.
3. In **Settings → API**: copy **Project URL** and **service_role** key (not anon if you want server-only uploads).

### 2. Environment variables

In `.env` (or `.env.local`):

```env
# Already have
DATABASE_URL="..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Add for scraper
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

(Use `SUPABASE_SERVICE_ROLE_KEY` for uploads from scripts/API; keep it server-side only.)

### 3. Get a LinkedIn company ID

1. Go to [LinkedIn Ads Library](https://www.linkedin.com/ad-library/).
2. Search for a brand (e.g. HubSpot).
3. Open a company’s ads; the URL will look like `...?authorCompanyId=12345`.
4. Use that number as `companyId` (e.g. in `scripts/test-scraper.ts`).

### 4. Fix selectors (important)

The selectors in `src/lib/scraper/linkedin-scraper.ts` are guesses. LinkedIn’s HTML changes often.

1. Open LinkedIn Ads Library in the browser, open DevTools (F12).
2. Right‑click an ad card → Inspect.
3. Find the real class names or `data-*` attributes for:
   - ad card container
   - company name
   - ad copy
   - CTA text
   - image `src`
   - “About the ad” section
4. Update the `SELECTORS` object at the top of `linkedin-scraper.ts` to match.

### 5. Run the tests

**Playwright only (no LinkedIn):**

```bash
npx tsx src/lib/scraper/test-playwright.ts
```

You should get `test-screenshot.png` in the project root and “Success!” in the console.

**Scraper only (LinkedIn + DB + Storage):**

1. In `scripts/test-scraper.ts`, set `TEST_COMPANY_ID` and `TEST_COMPANY_NAME` to a real company from Ads Library.
2. Run:

```bash
npx tsx scripts/test-scraper.ts
```

3. Check Supabase: **Table Editor** → `Advertiser` and `Ad`; **Storage** → `ad-creatives` → `ads/`.

If you see “Ads scraped: 0”, the selectors don’t match the current page; update them as in step 4.

## Optional: API route to “follow” an advertiser

Later you can add a route (e.g. `POST /api/advertisers/follow`) that:

1. Accepts `companyId` (and optionally `companyName`).
2. Checks the current user and plan limits (`checkPlanLimit`).
3. Calls `scrapeAdvertiser(companyId)` then `saveAdvertiserAds(prisma, companyId, companyName, ads)`.
4. Creates a `UserAdvertiser` link so the ads show up for that user in Explore.

That connects the scraper to the app; the scripts above are for testing the pipeline.
