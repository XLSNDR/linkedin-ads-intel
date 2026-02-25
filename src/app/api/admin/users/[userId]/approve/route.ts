import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendApprovalEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** POST: approve user (set active + plan, send approval email) */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  let body: { planId?: string };
  try {
    body = await _req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId?.trim();
  if (!planId) {
    return NextResponse.json({ error: "planId required" }, { status: 400 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { plan: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (user.isActive) {
    return NextResponse.json(
      { error: "User is already active" },
      { status: 400 }
    );
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: true, planId },
  });

  const loginUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://linkedin-ads-intel-alpha.vercel.app";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
  const emailResult = await sendApprovalEmail(user.email, name, `${loginUrl}/sign-in`);

  if (!emailResult.ok) {
    console.error("[approve] Email failed:", emailResult.error);
    return NextResponse.json(
      {
        ok: true,
        message: "User approved; approval email failed to send",
        emailError: emailResult.error,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, message: "User approved and email sent" });
}
