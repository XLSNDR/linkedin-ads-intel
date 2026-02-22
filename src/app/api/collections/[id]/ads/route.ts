import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { addAdToCollection } from "@/lib/services/collection.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST: Add ad to collection. Body: { adId: string }. */
export async function POST(req: Request, { params }: Params) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: collectionId } = await params;
  if (!collectionId) {
    return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
  }

  let body: { adId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const adId = typeof body.adId === "string" ? body.adId.trim() : "";
  if (!adId) {
    return NextResponse.json({ error: "adId is required" }, { status: 400 });
  }

  const ok = await addAdToCollection(collectionId, adId, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
