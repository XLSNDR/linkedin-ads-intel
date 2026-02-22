import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  updateCollection,
  deleteCollection,
} from "@/lib/services/collection.service";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** PUT: Update collection name/description. Body: { name?: string, description?: string }. */
export async function PUT(req: Request, { params }: Params) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ok = await updateCollection(id, user.id, {
    ...(typeof body.name === "string" && { name: body.name }),
    ...(typeof body.description === "string" && { description: body.description }),
  });

  if (!ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

/** DELETE: Delete a collection. */
export async function DELETE(_req: Request, { params }: Params) {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Collection ID required" }, { status: 400 });
  }

  const ok = await deleteCollection(id, user.id);
  if (!ok) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
