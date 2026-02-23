import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Navigation } from "@/components/layout/Navigation";
import { SaveToCollectionProvider } from "@/components/collections/SaveToCollectionContext";
import { AdDetailModalProvider } from "@/components/ads/AdDetailModalContext";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.isActive) {
    redirect("/pending");
  }

  return (
    <SaveToCollectionProvider>
      <AdDetailModalProvider>
        <Navigation role={user.role} />
        {children}
      </AdDetailModalProvider>
    </SaveToCollectionProvider>
  );
}
