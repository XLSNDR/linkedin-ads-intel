import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserCollections, createCollection } from "@/lib/services/collection.service";

export const dynamic = "force-dynamic";

/** GET: List current user's collections with ad counts. */
export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const collections = await getUserCollections(user.id);
  return NextResponse.json({ collections });
}

/** POST: Create a collection. Body: { name: string, description?: string }. */
export async function POST(req: Request) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const description =
    typeof body.description === "string"
      ? body.description.slice(0, 500).trim() || undefined
      : undefined;

  const created = await createCollection(user.id, name, description ?? null);
  if (!created) {
    return NextResponse.json(
      { error: "Collection limit reached for your plan" },
      { status: 403 }
    );
  }

  return NextResponse.json(created, { status: 201 });
}
