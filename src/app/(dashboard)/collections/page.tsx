import { getCurrentUser } from "@/lib/auth";
import { getUserCollections } from "@/lib/services/collection.service";
import { CollectionsView } from "./CollectionsView";

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return (
      <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
        <main className="max-w-4xl mx-auto px-6 py-8">
          <p className="text-muted-foreground">You must be signed in to view collections.</p>
        </main>
      </div>
    );
  }

  const collections = await getUserCollections(user.id);
  const totalAds = collections.reduce((sum, c) => sum + c._count.collectionAds, 0);
  const avgPerCollection =
    collections.length > 0 ? Math.round(totalAds / collections.length) : 0;

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-4xl mx-auto px-6 py-8">
        <CollectionsView
          initialCollections={collections}
          totalAdsSaved={totalAds}
          avgPerCollection={avgPerCollection}
        />
      </main>
    </div>
  );
}
