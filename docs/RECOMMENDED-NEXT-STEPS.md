# Recommended Next Steps (aligned with your PRD + Task List)

This doc is aligned with your **FINAL-Task-Breakdown-Zero-Knowledge.md** (weeks 0–20) and your **PRD** (LinkedIn Ads Intelligence MVP).

---

## Where you are now

| Week | Status | What you have |
|------|--------|----------------|
| **Week 0** | ✅ | Vibecoding basics, terminal, Cursor |
| **Week 1–2** | ✅ | Next.js app, Explore/Collections/Advertisers pages, Navigation, folder structure, shadcn (button, card, input, badge, dialog) |
| **Week 3–4** | ✅ | Supabase + Prisma schema, Clerk auth, sign-in/sign-up, webhook + sync-user, protected dashboard, pending page, admin layout |
| **Week 5–7** | ✅ | Playwright, linkedin-scraper, format-detector (11 formats), upload to Supabase Storage, save-ad, test-scraper script |
| **Week 8–9** | ⬜ Next | Format detection polish |
| **Week 10–12** | ⬜ | AdCard, Explore grid, pagination, Ad detail modal |
| **Week 13–14** | ⬜ | Filters + search |
| **Week 15–16** | ⬜ | Collections (save, modal, list, detail) |
| **Week 17–18** | ⬜ | Admin approve users + Resend email, stats |
| **Week 19–20** | ⬜ | Polish + launch |
| **Version control** | ⬜ Near term | Git + GitHub (history, backup, collaborate) |

---

## Recommended order (from your task list)

### 0. Set up Git + GitHub (do early / near term)

So your project has **version history** and a **cloud backup** (on top of Dropbox):

- **Git** tracks changes so you can see what changed, when, and undo if needed.
- **GitHub** stores a copy of the repo in the cloud so you can clone it on another machine or share it.

**Steps:**

1. Create a [GitHub](https://github.com) account if you don’t have one.
2. In the project folder, run:
   - `git init`
   - `git add .`
   - `git commit -m "Initial commit - LinkedIn Ads scraper and Explore page"`
3. On GitHub: **New repository** → name it e.g. `linkedin-ads-intel` → do **not** add README.
4. Then: `git remote add origin https://github.com/YOUR_USERNAME/linkedin-ads-intel.git`, `git branch -M main`, `git push -u origin main`.

**Before first commit:** add a **`.gitignore`** so you don’t commit `node_modules/`, `.env`, or build outputs. (Next.js projects usually have one already.)

After that, use `git add` + `git commit` when you finish a chunk of work, and `git push` to back up to GitHub.

---

### 1. Finish scraper data (so Explore has something to show)

- Create Supabase bucket **`ad-creatives`** (public) and add **`NEXT_PUBLIC_SUPABASE_URL`** + **`SUPABASE_SERVICE_ROLE_KEY`** to `.env`.
- Get a real **`authorCompanyId`** from [LinkedIn Ads Library](https://www.linkedin.com/ad-library/) and put it in `scripts/test-scraper.ts`.
- Run: **`npx tsx scripts/test-scraper.ts`**.
- If you get 0 ads, inspect the Ads Library page and update **`SELECTORS`** in `src/lib/scraper/linkedin-scraper.ts` (per your task list Week 5–6).

This matches your PRD “Follow Advertisers” and gives you real ads in the DB for the next steps.

---

### 2. Week 8–9: Format detection polish

From your task list:

- **Test all 11 formats:** Find at least one example of each (Single Image, Video, Carousel, Document, Event, Thought Leader Text/Image/Video, Conversation, Text, Spotlight), scrape, and confirm `format-detector.ts` classifies them correctly. Fix logic if needed.
- **Format-specific metadata:** Extend the scraper and DB for:
  - Video: duration, thumbnail URL.
  - Carousel: card count, all card images (and any text per card if available).
  - Document: page count, doc type; Event: date, location; Thought Leader: author name/headline/profile pic.
- **Schema:** Add fields like `formatMetadata` (Json), `promotedBy`, `authorName`, `authorHeadline`, `authorProfilePic` to the Ad model if not already there; migration and seed as needed.

Your **ad-format-detection-guide.md** and PRD §5.2 (Browse Ads) define the 11 formats and how they should be stored and displayed.

---

### 3. Week 10–12: UI – AdCard, Explore grid, pagination, Ad detail

From your task list and PRD §5.2 / §6.1–6.3:

- **AdCard** (`src/components/ads/AdCard.tsx`): Company logo, format badge, creative image (aspect ratio 1200×627 or per format), 2-line ad copy, CTA, status badge, runtime, impressions if available. Use shadcn Card; LinkedIn blue **#0A66C2** for accents; responsive (1/2/4 columns).
- **Explore page:** Load ads from DB (e.g. for the current user’s followed advertisers, or all ads with pagination). Grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. Default sort: impressions desc, then runtime desc, then first seen desc. **50 ads per page**, pagination with URL params.
- **Ad detail:** Clicking an ad opens a **modal or side panel** (shadcn Dialog): left = creative (image/video/carousel nav), “View on LinkedIn”; right = company, full copy, CTA, landing URL, format, status, runtime, languages, locations, impressions if EU.

This delivers the PRD “Browse Ads” and “Ad Detail View” and makes the product feel real.

---

### 4. “Follow Advertiser” flow (PRD §5.1)

So Explore shows “ads from advertisers I follow” and respects plan limits:

- **API:** e.g. **`POST /api/advertisers/follow`** with `companyId` (and optional `companyName`). Use **`checkPlanLimit(userId, 'maxActiveAdvertisers')`** from `src/lib/auth.ts`. Call your existing `scrapeAdvertiser(companyId)` then `saveAdvertiserAds(prisma, companyId, companyName, ads)`; create **`UserAdvertiser`** (status `active`) for the current user.
- **UI:** “Add Advertiser” (e.g. on Explore or Advertisers page): input for LinkedIn company URL or company ID → resolve to company name → “Follow” button that calls the API. Optionally show progress (“Scraping… 50/200 ads”) as in PRD §6.6.

Your schema already has `UserAdvertiser`; this wires it to the app and enforces limits.

---

### 5. Week 13–14: Filters + search (PRD §5.3, §5.4, §5.7)

- **Filters:** Advertiser (multi), Status (All / Active / Stopped), Country (multi), **Ad Format** (all 11), Language, Min impressions, Min runtime. Persist in **URL params** (shareable). “Clear all” and active-filter badges.
- **Search:** Debounced (300 ms) search over intro text, CTA text, company name, landing page URL; combine with filters; show “X results for ‘…’”.

PRD §6.1 and your task list describe the filter sidebar layout and behaviour.

---

### 6. Week 15–16: Collections (PRD §5.6)

- **Save to collection:** Heart icon on AdCard and in Ad detail modal. Click → **SaveToCollectionModal**: list of user collections (checkboxes), “Create new collection”, Save → add/remove ad from selected collections; respect **`checkPlanLimit(userId, 'maxCollections')`** (free trial = 1).
- **Collections page:** List collections; click → collection detail with grid of saved ads. Edit name/description; delete collection with confirmation.

Your schema already has `Collection` and `CollectionAd`; this is the UI and API wiring.

---

### 7. Week 17–18: Admin panel (PRD §5.10)

- **Admin users page:** List pending users (`isActive = false`); Approve with plan selection; Reject. List active users; change plan; deactivate. **Approve** sets `isActive = true`, assigns plan, and sends **approval email** (Resend).
- **Admin stats page:** Total users, active, pending, advertisers tracked, ads scraped; plan distribution; recent signups.

You already have admin layout and `requireAdmin`; add the approve API, Resend integration, and the two admin pages.

---

### 8. Week 19–20: Polish + launch

- UI consistency (spacing, buttons, #0A66C2), loading states, friendly error messages, bug bash.
- README, user guide, production env (Clerk webhook URL, Resend, etc.), deploy, team onboarding.

---

## Summary: do this next

1. **Get data:** Supabase bucket + env → run **`npx tsx scripts/test-scraper.ts`** with a real company ID; fix selectors if needed.
2. **Week 8–9:** Validate and refine format detection for all 11 formats; add format-specific metadata and schema.
3. **Week 10–12:** Build **AdCard**, Explore **grid + pagination**, and **Ad detail modal** so the app shows real ads and matches the PRD “Browse Ads” and “Ad Detail View”.
4. **Follow Advertiser:** **POST /api/advertisers/follow** + “Add Advertiser” UI and **UserAdvertiser** creation so Explore is “ads from my followed advertisers” and plan limits are enforced.
5. **Git + GitHub (near term):** When you're ready, run through **§0** above: init repo, `.gitignore`, first commit, create GitHub repo, push. Gives you version history and cloud backup.

If you tell me whether you want to start with **data** (scraper run + selectors), **Week 8–9** (format polish), or **Week 10** (AdCard + Explore grid), I can break that into concrete tasks and file changes step by step.
