"use client";

import { useAuth, UserButton } from "@clerk/nextjs";

export function AuthNav() {
  const { isLoaded, isSignedIn } = useAuth();

  // Show sign-in links while loading or when signed out (so they're always visible in the header)
  if (!isLoaded || !isSignedIn) {
    return (
      <nav className="flex items-center gap-4">
        <a
          href="/sign-in"
          className="text-sm font-medium hover:underline"
          data-auth-link="sign-in"
        >
          Sign in
        </a>
        <a
          href="/sign-up"
          className="rounded-full bg-foreground text-background text-sm font-medium h-9 px-4 flex items-center justify-center hover:opacity-90"
          data-auth-link="sign-up"
        >
          Sign up
        </a>
      </nav>
    );
  }

  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: "w-9 h-9",
        },
      }}
    />
  );
}
