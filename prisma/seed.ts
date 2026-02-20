import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const plans = [
    {
      id: "free_trial",
      name: "free_trial",
      displayName: "Free Trial",
      priceMonthly: 0,
      priceYearly: 0,
      maxAddedAdvertisers: 3,
      maxFollowedAdvertisers: 0,
      refreshFrequency: "manual",
      maxCollections: 1,
      snapshotRetentionDays: 30,
      impressionEstimates: true,
      isActive: true,
      sortOrder: 0,
    },
    {
      id: "starter",
      name: "starter",
      displayName: "Starter",
      priceMonthly: 4900, // €49 in cents
      priceYearly: 0,
      maxAddedAdvertisers: 10,
      maxFollowedAdvertisers: 5,
      refreshFrequency: "monthly",
      maxCollections: -1,
      snapshotRetentionDays: 90,
      impressionEstimates: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      id: "pro",
      name: "pro",
      displayName: "Pro",
      priceMonthly: 14900, // €149
      priceYearly: 0,
      maxAddedAdvertisers: 50,
      maxFollowedAdvertisers: 25,
      refreshFrequency: "weekly",
      maxCollections: -1,
      snapshotRetentionDays: 180,
      impressionEstimates: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      id: "agency",
      name: "agency",
      displayName: "Agency",
      priceMonthly: 49900, // €499
      priceYearly: 0,
      maxAddedAdvertisers: 999,
      maxFollowedAdvertisers: 100,
      refreshFrequency: "weekly",
      maxCollections: -1,
      snapshotRetentionDays: 365,
      impressionEstimates: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      id: "admin",
      name: "admin",
      displayName: "Admin",
      priceMonthly: 0,
      priceYearly: 0,
      maxAddedAdvertisers: 999,
      maxFollowedAdvertisers: 999,
      refreshFrequency: "weekly",
      maxCollections: -1,
      snapshotRetentionDays: 365,
      impressionEstimates: true,
      isActive: true,
      sortOrder: 99,
    },
  ];

  for (const plan of plans) {
    const { id, ...rest } = plan as (typeof plans)[number] & { id?: string };
    await prisma.plan.upsert({
      where: { name: plan.name },
      create: id ? { id, ...rest } : rest,
      update: {
        displayName: plan.displayName,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxAddedAdvertisers: plan.maxAddedAdvertisers,
        maxFollowedAdvertisers: plan.maxFollowedAdvertisers,
        refreshFrequency: plan.refreshFrequency,
        maxCollections: plan.maxCollections,
        snapshotRetentionDays: plan.snapshotRetentionDays,
        impressionEstimates: plan.impressionEstimates,
        isActive: plan.isActive,
        sortOrder: plan.sortOrder,
      },
    });
  }

  console.log("Seeded plans:", plans.map((p) => p.name).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
