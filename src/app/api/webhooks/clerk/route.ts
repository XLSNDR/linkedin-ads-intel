import { Webhook } from "svix";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: { type: string; data: Record<string, unknown> };

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as { type: string; data: Record<string, unknown> };
  } catch (err) {
    console.error("Clerk webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const { id, email_addresses, first_name, last_name, image_url } = evt.data as {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
    image_url?: string | null;
  };

  if (evt.type === "user.created") {
    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      return new Response("No email in webhook payload", { status: 400 });
    }

    const freeTrialPlan = await prisma.plan.findUnique({
      where: { name: "free_trial" },
    });
    const planId = freeTrialPlan?.id ?? "free_trial";

    try {
      await prisma.user.create({
        data: {
          clerkId: id,
          email,
          firstName: first_name ?? null,
          lastName: last_name ?? null,
          imageUrl: image_url ?? null,
          planId,
          isActive: false,
        },
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "P2002") {
        return new Response("User already exists", { status: 200 });
      }
      console.error("Clerk webhook user create failed:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  if (evt.type === "user.updated") {
    const email = email_addresses?.[0]?.email_address;
    if (!email) {
      return new Response("No email in webhook payload", { status: 400 });
    }

    try {
      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email,
          firstName: first_name ?? undefined,
          lastName: last_name ?? undefined,
          imageUrl: image_url ?? undefined,
        },
      });
    } catch (err) {
      if ((err as { code?: string })?.code === "P2025") {
        return new Response("User not found", { status: 200 });
      }
      console.error("Clerk webhook user update failed:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  return new Response("", { status: 200 });
}
