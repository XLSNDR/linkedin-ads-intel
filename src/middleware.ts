import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in",
  "/sign-up",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending(.*)",
  "/api/webhooks/clerk",
  "/api/webhooks/(.*)",
  "/api/test-db",
  "/api/cron/sync-scrapes", // Vercel cron (validated by CRON_SECRET in the route)
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};