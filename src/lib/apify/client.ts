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

export interface StartScrapeConfig {
  /** Optional: numeric company ID for ad-library URL. Required when startUrls not provided. */
  linkedinCompanyId?: string;
  /** Optional: company page or ad-library URLs. When provided, passed directly to Apify (e.g. https://www.linkedin.com/company/simplicate/). */
  startUrls?: string[];
  /** Optional: max number of ads Apify should return. */
  resultsLimit?: number | null;
}

export async function startScrapeRun(
  config: StartScrapeConfig
): Promise<{ runId: string; datasetId: string | null }> {
  const url = `${BASE_URL}/acts/${ACTOR_ID}/runs?${authParams()}`;

  const hasCustomUrls = config.startUrls && config.startUrls.length > 0;

  const input: Record<string, unknown> = {
    skipDetails: false,
  };

  if (hasCustomUrls) {
    input.startUrls = config.startUrls!.map((u) => ({ url: u }));
  } else {
    const companyId = config.linkedinCompanyId;
    if (!companyId) {
      throw new Error("startScrapeRun: linkedinCompanyId or startUrls required");
    }
    input.startUrls = [
      {
        url: `https://www.linkedin.com/ad-library/search?companyIds=${companyId}`,
      },
    ];
  }

  if (config.resultsLimit != null && !Number.isNaN(config.resultsLimit)) {
    input.resultsLimit = config.resultsLimit;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Apify startScrapeRun failed (${response.status}): ${text.slice(0, 500)}`
    );
  }

  const json = (await response.json()) as {
    data?: { id?: string; defaultDatasetId?: string };
  };
  const runId = json.data?.id;
  const datasetId = json.data?.defaultDatasetId;
  if (!runId) {
    throw new Error("Apify startScrapeRun: no run id in response");
  }
  return { runId, datasetId: datasetId ?? null };
}

/** Get current run status and datasetId (if not yet known). */
export async function getRunStatus(
  runId: string
): Promise<{
  status: string;
  datasetId: string | null;
}> {
  const url = `${BASE_URL}/actor-runs/${runId}?${authParams()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Apify getRunStatus failed (${response.status}): ${text.slice(0, 500)}`
    );
  }
  const json = (await response.json()) as {
    data?: { status?: string; defaultDatasetId?: string };
  };
  return {
    status: json.data?.status ?? "UNKNOWN",
    datasetId: json.data?.defaultDatasetId ?? null,
  };
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

/** Fetch current dataset items (can be called while run is still in progress). */
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

/** Convenience: start run, wait for completion, fetch results (used when not using batch mode). */
export async function scrapeAdvertiser(
  linkedinCompanyId: string
): Promise<{
  ads: ApifyAd[];
  runId: string;
  datasetId: string;
}> {
  const { runId, datasetId: startDatasetId } = await startScrapeRun({
    linkedinCompanyId,
  });
  const { datasetId } = await waitForRun(runId);
  const resolvedDatasetId = datasetId ?? startDatasetId;
  if (!resolvedDatasetId) {
    throw new Error("Apify run has no dataset id");
  }
  const ads = await getDatasetItems(resolvedDatasetId);
  return { ads, runId, datasetId: resolvedDatasetId };
}
