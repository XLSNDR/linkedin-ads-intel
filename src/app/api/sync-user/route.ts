import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Creates or updates your User row in the database from your Clerk account.
 * Use this when developing locally, since Clerk webhooks can't reach localhost.
 *
 * While signed in, open: http://localhost:3000/api/sync-user
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    return NextResponse.json({ error: "Could not load user" }, { status: 401 });
  }

  const email = clerkUser.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return NextResponse.json(
      { error: "No email on your Clerk account" },
      { status: 400 }
    );
  }

  const freeTrialPlan = await prisma.plan.findUnique({
    where: { name: "free_trial" },
  });
  const planId = freeTrialPlan?.id ?? "free_trial";

  try {
    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      create: {
        clerkId: userId,
        email,
        firstName: clerkUser.firstName ?? null,
        lastName: clerkUser.lastName ?? null,
        imageUrl: clerkUser.imageUrl ?? null,
        planId,
        isActive: true,
      },
      update: {
        email,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        imageUrl: clerkUser.imageUrl ?? undefined,
        isActive: true, // so devs always get dashboard access after sync
      },
    });
    return NextResponse.json({
      ok: true,
      message: "User synced. You can now use the dashboard.",
      userId: user.id,
      isActive: user.isActive,
    });
  } catch (err) {
    console.error("Sync user failed:", err);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 }
    );
  }
}
