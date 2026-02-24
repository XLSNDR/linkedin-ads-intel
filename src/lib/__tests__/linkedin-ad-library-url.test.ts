import { describe, it } from "node:test";
import assert from "node:assert";
import {
  buildAdLibrarySearchUrl,
  frequencyToWindow,
} from "../linkedin-ad-library-url.ts";

const BASE = "https://www.linkedin.com/ad-library/search";

describe("buildAdLibrarySearchUrl", () => {
  it("last-30-days returns URL with dateOption=last-30-days", () => {
    const url = buildAdLibrarySearchUrl("2027242", "last-30-days");
    assert.strictEqual(
      url,
      `${BASE}?companyIds=2027242&dateOption=last-30-days`
    );
  });

  it("last-7-days when today is 2026-02-24 returns enddate=2026-02-23, startdate=2026-02-17", () => {
    const ref = new Date(Date.UTC(2026, 1, 24)); // 2026-02-24 UTC
    const url = buildAdLibrarySearchUrl("2027242", "last-7-days", ref);
    assert.ok(url.includes("companyIds=2027242"));
    assert.ok(url.includes("dateOption=custom-date-range"));
    assert.ok(url.includes("enddate=2026-02-23"));
    assert.ok(url.includes("startdate=2026-02-17"));
  });

  it("last-7-days at month boundary (2026-03-02) rolls to February", () => {
    const ref = new Date(Date.UTC(2026, 2, 2)); // 2026-03-02 UTC → yesterday 2026-03-01, start 2026-02-23
    const url = buildAdLibrarySearchUrl("2027242", "last-7-days", ref);
    assert.ok(url.includes("enddate=2026-03-01"));
    assert.ok(url.includes("startdate=2026-02-23"));
  });

  it("last-7-days at year boundary (2026-01-01) returns enddate=2025-12-31, startdate=2025-12-25", () => {
    const ref = new Date(Date.UTC(2026, 0, 1)); // 2026-01-01 UTC
    const url = buildAdLibrarySearchUrl("2027242", "last-7-days", ref);
    assert.ok(url.includes("enddate=2025-12-31"));
    assert.ok(url.includes("startdate=2025-12-25"));
  });
});

describe("frequencyToWindow", () => {
  it('weekly returns "last-7-days"', () => {
    assert.strictEqual(frequencyToWindow("weekly"), "last-7-days");
  });

  it('monthly returns "last-30-days"', () => {
    assert.strictEqual(frequencyToWindow("monthly"), "last-30-days");
  });
});
