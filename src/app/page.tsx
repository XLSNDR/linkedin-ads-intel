import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserOrNull } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const user = await getCurrentUserOrNull();

  // Signed-in user with an active account → send them to the dashboard
  if (user?.isActive) {
    redirect("/explore");
  }

  const advertiserCount = await prisma.advertiser.count();
  const userId = user?.clerkId ?? null;

  return (
    <div className="min-h-[calc(100vh-4rem)] font-[family-name:var(--font-geist-sans)]">
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-semibold mb-6">
          LinkedIn Ads Intelligence Platform
        </h1>

        {user && !user.isActive && (
          <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 px-4 py-3 text-sm">
            Your account is pending approval. You’ll be able to access the
            dashboard once an admin activates it.
          </div>
        )}

        <section className="space-y-4 mb-10">
          <h2 className="text-lg font-medium text-muted-foreground">
            Auth status
          </h2>
          {userId ? (
            <p className="text-sm">
              You are signed in. Your user ID:{" "}
              <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                {userId}
              </code>
              {user?.isActive === false && (
                <>
                  {" "}
                  ·{" "}
                  <Link
                    href="/pending"
                    className="text-primary hover:underline"
                  >
                    View pending page
                  </Link>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm">
              You are not signed in. Use the header to sign in or sign up.
            </p>
          )}
        </section>

        {userId && user?.isActive === false && (
          <section className="space-y-2 mb-10">
            <Link
              href="/explore"
              className="inline-block rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
            >
              Go to dashboard
            </Link>
            <p className="text-xs text-muted-foreground">
              If your account is already active, clicking above will take you to
              Explore.
            </p>
          </section>
        )}

        <section className="space-y-4">
          <h2 className="text-lg font-medium text-muted-foreground">
            Database
          </h2>
          <p className="text-sm">
            Advertisers in the database:{" "}
            <span className="font-semibold">{advertiserCount}</span>
          </p>
          {advertiserCount === 0 && (
            <p className="text-sm text-muted-foreground">
              Add advertisers via your scraper or seed script to see them here.
            </p>
          )}
        </section>

        <footer className="mt-16 pt-8 border-t border-black/[.08] dark:border-white/[.145]">
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:underline"
          >
            Sign in page
          </Link>
          <span className="text-muted-foreground mx-2">·</span>
          <Link
            href="/sign-up"
            className="text-sm text-muted-foreground hover:underline"
          >
            Sign up page
          </Link>
        </footer>
      </main>
    </div>
  );
}
