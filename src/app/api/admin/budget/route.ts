import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlySpend } from "@/lib/services/ad-storage";

const MONTHLY_LIMIT = Number(process.env.APIFY_MONTHLY_SPEND_LIMIT ?? 50);

/** GET: current month Apify spend and limit */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const currentSpend = await getMonthlySpend(prisma);

  return NextResponse.json({
    currentSpend,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - currentSpend),
  });
}
