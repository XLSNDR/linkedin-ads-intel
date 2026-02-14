import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export type UserWithPlan = Awaited<ReturnType<typeof getCurrentUser>>;

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { plan: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

export async function getCurrentUserOrNull() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { plan: true },
  });
  return user;
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }

  return user;
}

export async function checkPlanLimit(
  userId: string,
  limit: "maxActiveAdvertisers" | "maxCollections"
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });

  if (!user) return false;

  if (limit === "maxActiveAdvertisers") {
    const value = user.maxActiveAdvertisers ?? user.plan.maxActiveAdvertisers;
    const activeCount = await prisma.userAdvertiser.count({
      where: {
        userId,
        status: "active",
      },
    });
    return activeCount < value;
  }

  if (limit === "maxCollections") {
    const value = user.plan.maxCollections;
    if (value === -1) return true;

    const collectionCount = await prisma.collection.count({
      where: { userId },
    });
    return collectionCount < value;
  }

  return false;
}
