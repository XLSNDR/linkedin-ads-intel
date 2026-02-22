import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAdCollectionIds } from "@/lib/services/collection.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ adId: string }> };

/** GET: Collection IDs that contain this ad (for current user). */
export async function GET(_req: Request, { params }: Params) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { adId } = await params;
  if (!adId) {
    return NextResponse.json({ error: "Ad ID required" }, { status: 400 });
  }

  const collectionIds = await getAdCollectionIds(adId, user.id);
  return NextResponse.json({ collectionIds });
}
