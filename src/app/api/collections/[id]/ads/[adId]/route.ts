import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { removeAdFromCollection } from "@/lib/services/collection.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; adId: string }> };

/** DELETE: Remove ad from collection. */
export async function DELETE(_req: Request, { params }: Params) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collectionId, adId } = await params;
  if (!collectionId || !adId) {
    return NextResponse.json(
      { error: "Collection ID and ad ID required" },
      { status: 400 }
    );
  }

  const ok = await removeAdFromCollection(collectionId, adId, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
