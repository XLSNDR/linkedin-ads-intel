# Import Apify JSON export

Use this to backfill **Advertiser logos** (and later other fields) from an Apify LinkedIn Ads Library export, without re-running the scraper.

## Export from Apify

1. Open your Apify run / dataset.
2. Export as **JSON** (the default array of ad objects).
3. Use the file or paste the array as-is — no need to change the structure.

## API

**POST** `/api/admin/import-apify-json`

- **Auth:** Admin only (same as other `/api/admin/*` routes).
- **Input (pick one):**
  - **JSON body:** `Content-Type: application/json`, body = the array of ad objects.
  - **File upload:** `Content-Type: multipart/form-data`, field name `file` = your `.json` file.

Advertisers are matched by **LinkedIn company ID** taken from `advertiserUrl` (e.g. `https://www.linkedin.com/company/2027242` → `2027242`). For each unique company in the export that has `advertiserLogo`, we set `Advertiser.logoUrl` if that advertiser exists in the database.

**Response:**

```json
{
  "adsProcessed": 18,
  "advertisersWithLogoInExport": 1,
  "advertisersUpdated": 1,
  "skippedNoMatch": 0,
  "errors": []
}
```

- `skippedNoMatch`: companies in the export with a logo but no matching Advertiser in the DB.
- `errors`: any DB errors per company (e.g. constraint violations).

## Examples

**With JSON file (e.g. in PowerShell):**

```powershell
# Replace with your auth cookie or use a tool that sends your session
Invoke-RestMethod -Method Post -Uri "https://your-app.vercel.app/api/admin/import-apify-json" `
  -ContentType "application/json" `
  -InFile "apify-export.json"
```

**With file upload (curl):**

```bash
curl -X POST "https://your-app.vercel.app/api/admin/import-apify-json" \
  -H "Cookie: <your-auth-cookie>" \
  -F "file=@apify-export.json"
```

In both cases you must be logged in as an admin (Cookie or session as for the rest of the app).

## Extending later

The same endpoint and `src/lib/import-apify-json.ts` can be extended to:

- Map more fields from the export into the `Ad` or `Advertiser` models.
- Match ads by `adId` and update existing ads with extra data from the export.

The import type `ApifyExportItem` already allows extra properties (`[key: string]: unknown`), so new fields in the Apify export can be read without changing the type.
