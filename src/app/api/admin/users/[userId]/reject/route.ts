import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendRejectionEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/** POST: reject user (send rejection email; user stays inactive) */
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const emailResult = await sendRejectionEmail(user.email);

  if (!emailResult.ok) {
    console.error("[reject] Email failed:", emailResult.error);
    return NextResponse.json(
      {
        ok: true,
        message: "Rejection email failed to send",
        emailError: emailResult.error,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ ok: true, message: "Rejection email sent" });
}
