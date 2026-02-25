import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET: list pending users and all users (admin only) */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [pending, users, plans] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: false },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const serialize = (u: (typeof users)[number]) => ({
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    isActive: u.isActive,
    planId: u.planId,
    createdAt: u.createdAt.toISOString(),
    plan: u.plan ? { id: u.plan.id, name: u.plan.name, displayName: u.plan.displayName } : null,
  });

  return NextResponse.json({
    pending: pending.map(serialize),
    users: users.map(serialize),
    plans: plans.map((p) => ({ id: p.id, name: p.name, displayName: p.displayName })),
  });
}
