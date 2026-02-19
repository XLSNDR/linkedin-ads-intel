#!/usr/bin/env node
/**
 * Test the cron sync endpoint (for Vercel Pro every-minute sync).
 *
 * Usage:
 *   # Local (dev server must be running: npm run dev)
 *   node scripts/test-cron.mjs
 *
 *   # With CRON_SECRET (tests auth)
 *   CRON_SECRET=your-secret node scripts/test-cron.mjs
 *
 *   # Against deployed app
 *   BASE_URL=https://your-app.vercel.app CRON_SECRET=your-secret node scripts/test-cron.mjs
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET;
const url = `${BASE_URL}/api/cron/sync-scrapes`;

async function test(name, options, expectedStatus) {
  const res = await fetch(url, options);
  const ok = res.status === expectedStatus;
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  console.log(ok ? "✓" : "✗", name);
  console.log("  Status:", res.status, expectedStatus === res.status ? "(expected)" : "(expected " + expectedStatus + ")");
  if (body && typeof body === "object" && Object.keys(body).length) {
    console.log("  Body:", JSON.stringify(body));
  }
  if (!ok) {
    console.log("  Response:", body);
  }
  return ok;
}

async function main() {
  console.log("Testing cron endpoint:", url);
  console.log("");

  let passed = 0;
  let failed = 0;

  // 1) Without auth: 401 if CRON_SECRET is set, else 200
  const expectNoAuth = CRON_SECRET ? 401 : 200;
  if (await test("GET without Authorization (expect " + expectNoAuth + ")", {}, expectNoAuth)) {
    passed++;
  } else {
    failed++;
  }

  // 2) With wrong secret: must be 401 when CRON_SECRET is set
  if (CRON_SECRET) {
    if (await test("GET with wrong secret (expect 401)", {
      headers: { Authorization: "Bearer wrong-secret" },
    }, 401)) {
      passed++;
    } else {
      failed++;
    }

    // 3) With correct secret: 200 and body { ok: true, ... }
    const res3 = await fetch(url, { headers: { Authorization: `Bearer ${CRON_SECRET}` } });
    const text3 = await res3.text();
    let data3;
    try {
      data3 = text3 ? JSON.parse(text3) : null;
    } catch {
      data3 = null;
    }
    const ok3 = res3.status === 200;
    if (ok3) {
      passed++;
      if (data3 && data3.ok === true && Array.isArray(data3.results)) {
        console.log("✓ GET with correct CRON_SECRET (expect 200)");
        console.log("  Status: 200 (expected)");
        console.log("  Cron response shape OK: ok=true, results[]");
      } else {
        console.log("✓ GET with correct CRON_SECRET (expect 200)");
        console.log("  Status: 200 (expected)");
        console.log("  Body:", JSON.stringify(data3));
      }
    } else {
      failed++;
      console.log("✗ GET with correct CRON_SECRET (expect 200)");
      console.log("  Status:", res3.status, "(expected 200)");
      console.log("  Response:", data3 ?? text3);
    }
  } else {
    console.log("(Skipping auth tests; set CRON_SECRET to test Authorization)");
  }

  console.log("");
  if (failed > 0 && !CRON_SECRET) {
    console.log("Tip: Set CRON_SECRET to test auth (e.g. CRON_SECRET=xxx npm run test:cron)");
  }
  if (failed > 0 && BASE_URL.includes("localhost")) {
    console.log("Tip: If you see 404, ensure 'npm run dev' is running and the app has compiled.");
  }
  console.log("Result:", passed, "passed", failed ? ", " + failed + " failed" : "");
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (process.env.BASE_URL?.includes("localhost")) {
    console.error("Tip: Start the dev server first: npm run dev");
  }
  process.exit(1);
});
