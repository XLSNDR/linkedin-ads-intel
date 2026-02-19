# Cron: Sync scrapes every minute (Vercel Pro)

## What it does

- **Schedule:** Every minute (`*/1 * * * *`) — requires **Vercel Pro** (Hobby allows only daily cron).
- **Endpoint:** `GET /api/cron/sync-scrapes`
- **Behaviour:** Finds all `ScrapeRun` with status `"running"`, fetches their dataset from Apify, saves ads to the DB, and updates the run status when the Apify run completes. So ads appear in Explore within about a minute of being scraped.

## Setup on Vercel

1. **Environment variable:** In the Vercel project, add `CRON_SECRET` (e.g. `openssl rand -hex 32`) for Production (and Preview if you use cron there). Vercel will send it as `Authorization: Bearer <CRON_SECRET>` when invoking the cron.
2. **Deploy:** Ensure `vercel.json` is in the repo so the cron is registered.

## How to test

With the app running (or deployed):

```bash
# Local (start dev server first: npm run dev)
npm run test:cron

# With auth (expects 200 when secret is correct)
CRON_SECRET=your-secret npm run test:cron

# Against production
BASE_URL=https://your-app.vercel.app CRON_SECRET=your-vercel-cron-secret npm run test:cron
```

The script checks: no auth → 401 if `CRON_SECRET` is set, else 200; wrong secret → 401; correct secret → 200 and response shape `{ ok: true, synced, results }`.
