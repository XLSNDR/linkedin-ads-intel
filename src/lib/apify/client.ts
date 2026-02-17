/**
 * Apify LinkedIn Ads Scraper client
 * Actor: silva95gustavo/linkedin-ad-library-scraper
 */

import type { ApifyAd } from "./types";

const ACTOR_ID = "silva95gustavo~linkedin-ad-library-scraper";
const BASE_URL = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 10_000;
const POLL_MAX_ATTEMPTS = 120; // 20 minutes

function getToken(): string {
  const token = process.env.APIFY_API_TOKEN;
  if (!token?.trim()) {
    throw new Error("APIFY_API_TOKEN is not set");
  }
  return token;
}

function authParams(): string {
  return `token=${getToken()}`;
}

export async function startScrapeRun(
  linkedinCompanyId: string
): Promise<{ runId: string }> {
  const url = `${BASE_URL}/acts/${ACTOR_ID}/runs?${authParams()}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startUrls: [
        {
          url: `https://www.linkedin.com/ad-library/search?companyIds=${linkedinCompanyId}`,
        },
      ],
      skipDetails: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Apify startScrapeRun failed (${response.status}): ${text.slice(0, 500)}`
    );
  }

  const json = (await response.json()) as { data?: { id?: string } };
  const runId = json.data?.id;
  if (!runId) {
    throw new Error("Apify startScrapeRun: no run id in response");
  }
  return { runId };
}

export async function waitForRun(
  runId: string
): Promise<{ datasetId: string; status: string }> {
  const url = `${BASE_URL}/actor-runs/${runId}?${authParams()}`;

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `Apify waitForRun failed (${response.status}): ${text.slice(0, 500)}`
      );
    }

    const json = (await response.json()) as {
      data?: { status?: string; defaultDatasetId?: string };
    };
    const status = json.data?.status ?? "";
    const datasetId = json.data?.defaultDatasetId;

    if (status === "SUCCEEDED") {
      if (!datasetId) {
        throw new Error("Apify run succeeded but no defaultDatasetId");
      }
      return { datasetId, status };
    }
    if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
      throw new Error(`Apify run ${runId} ended with status: ${status}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Apify run ${runId} timed out after ${POLL_MAX_ATTEMPTS} attempts`);
}

export async function getDatasetItems(
  datasetId: string
): Promise<ApifyAd[]> {
  const url = `${BASE_URL}/datasets/${datasetId}/items?format=json&${authParams()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Apify getDatasetItems failed (${response.status}): ${text.slice(0, 500)}`
    );
  }

  const items = (await response.json()) as unknown;
  if (!Array.isArray(items)) {
    throw new Error("Apify getDatasetItems: expected array");
  }
  return items as ApifyAd[];
}

/** Convenience: start run, wait for completion, fetch results */
export async function scrapeAdvertiser(
  linkedinCompanyId: string
): Promise<{
  ads: ApifyAd[];
  runId: string;
  datasetId: string;
}> {
  const { runId } = await startScrapeRun(linkedinCompanyId);
  const { datasetId } = await waitForRun(runId);
  const ads = await getDatasetItems(datasetId);
  return { ads, runId, datasetId };
}
