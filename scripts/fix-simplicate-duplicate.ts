/**
 * One-off: fix Simplicate duplicate — relink UserAdvertisers from the empty
 * advertiser (0 ads) to the canonical one (has ads), then delete the empty one.
 *
 * Usage: npx tsx scripts/fix-simplicate-duplicate.ts
 * Prereqs: .env with DATABASE_URL
 */

import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const NAME = "Simplicate";

async function main() {
  const advertisers = await prisma.advertiser.findMany({
    where: { name: { equals: NAME, mode: "insensitive" } },
    include: { _count: { select: { ads: true } } },
    orderBy: { totalAdsFound: "desc" },
  });

  const empty = advertisers.find((a) => a._count.ads === 0);
  const canonical = advertisers.find((a) => a._count.ads > 0);

  if (!empty) {
    console.log("No empty Simplicate advertiser found. Nothing to fix.");
    return;
  }
  if (!canonical) {
    console.log("No Simplicate with ads found. Cannot fix.");
    return;
  }
  if (advertisers.length < 2) {
    console.log("Only one Simplicate advertiser found. Nothing to fix.");
    return;
  }

  const userLinks = await prisma.userAdvertiser.findMany({
    where: { advertiserId: empty.id },
    select: { id: true, userId: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const link of userLinks) {
      const existing = await tx.userAdvertiser.findUnique({
        where: {
          userId_advertiserId: {
            userId: link.userId,
            advertiserId: canonical.id,
          },
        },
      });
      if (existing) {
        await tx.userAdvertiser.delete({ where: { id: link.id } });
      } else {
        await tx.userAdvertiser.update({
          where: { id: link.id },
          data: { advertiserId: canonical.id },
        });
      }
    }
    await tx.advertiser.delete({ where: { id: empty.id } });
  });

  console.log("Done.");
  console.log("  Canonical Simplicate:", canonical.id, `(${canonical._count.ads} ads)`);
  console.log("  Deleted empty duplicate:", empty.id);
  console.log("  User links relinked:", userLinks.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
