/**
 * Collection service: CRUD for user collections and collection–ad membership.
 */

import { prisma } from "@/lib/prisma";
import { checkPlanLimit } from "@/lib/auth";

export type CollectionWithCount = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: { collectionAds: number };
};

/** List all collections for a user with ad counts, newest first. */
export async function getUserCollections(
  userId: string
): Promise<CollectionWithCount[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { collectionAds: true } } },
  });
}

/** Create a collection; returns null if plan limit exceeded. */
export async function createCollection(
  userId: string,
  name: string,
  description?: string | null
): Promise<{ id: string; name: string; description: string | null } | null> {
  const canCreate = await checkPlanLimit(userId, "maxCollections");
  if (!canCreate) return null;

  const created = await prisma.collection.create({
    data: {
      userId,
      name: name.trim(),
      description:
        description != null && description.length > 0
          ? description.trim().slice(0, 500)
          : null,
    },
    select: { id: true, name: true, description: true },
  });
  return created;
}

/** Update collection name/description; returns false if not owner. */
export async function updateCollection(
  collectionId: string,
  userId: string,
  data: { name?: string; description?: string }
): Promise<boolean> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!existing) return false;

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.description !== undefined && {
        description:
          data.description === "" || data.description == null
            ? null
            : data.description.trim().slice(0, 500),
      }),
    },
  });
  return true;
}

/** Delete a collection; returns false if not owner. Cascade removes CollectionAd rows. */
export async function deleteCollection(
  collectionId: string,
  userId: string
): Promise<boolean> {
  const existing = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!existing) return false;

  await prisma.collection.delete({ where: { id: collectionId } });
  return true;
}

/** Add ad to collection (upsert); returns false if not collection owner. */
export async function addAdToCollection(
  collectionId: string,
  adId: string,
  userId: string
): Promise<boolean> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) return false;

  await prisma.collectionAd.upsert({
    where: {
      collectionId_adId: { collectionId, adId },
    },
    create: { collectionId, adId },
    update: {},
  });
  return true;
}

/** Remove ad from collection; returns false if not collection owner. */
export async function removeAdFromCollection(
  collectionId: string,
  adId: string,
  userId: string
): Promise<boolean> {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
  });
  if (!collection) return false;

  await prisma.collectionAd.deleteMany({
    where: { collectionId, adId },
  });
  return true;
}

const DEFAULT_PAGE_SIZE = 24;

/** Get a single collection with its ads (paginated). Returns null if not owner. */
export async function getCollectionWithAds(
  collectionId: string,
  userId: string,
  options?: { page?: number; pageSize?: number }
) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: { _count: { select: { collectionAds: true } } },
  });
  if (!collection) return null;

  const page = Math.max(1, options?.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, options?.pageSize ?? DEFAULT_PAGE_SIZE));
  const skip = (page - 1) * pageSize;

  const [ads, totalCount] = await Promise.all([
    prisma.collectionAd.findMany({
      where: { collectionId },
      orderBy: { addedAt: "desc" },
      skip,
      take: pageSize,
      include: {
        ad: {
          include: { advertiser: true },
        },
      },
    }),
    prisma.collectionAd.count({ where: { collectionId } }),
  ]);

  return {
    ...collection,
    ads: ads.map((ca) => ca.ad),
    totalCount,
    page,
    pageSize,
    totalPages: Math.ceil(totalCount / pageSize),
  };
}

/** Get collection and all its ads (for filtering/sorting in memory on collection detail page). Returns null if not owner. */
export async function getCollectionWithAllAds(collectionId: string, userId: string) {
  const collection = await prisma.collection.findFirst({
    where: { id: collectionId, userId },
    include: { _count: { select: { collectionAds: true } } },
  });
  if (!collection) return null;

  const rows = await prisma.collectionAd.findMany({
    where: { collectionId },
    orderBy: { addedAt: "desc" },
    include: {
      ad: {
        include: { advertiser: true },
      },
    },
  });

  return {
    ...collection,
    ads: rows.map((ca) => ca.ad),
  };
}

/** Get collection IDs that contain this ad for the given user (for Save modal state). */
export async function getAdCollectionIds(
  adId: string,
  userId: string
): Promise<string[]> {
  const rows = await prisma.collectionAd.findMany({
    where: { adId, collection: { userId } },
    select: { collectionId: true },
  });
  return rows.map((r) => r.collectionId);
}
