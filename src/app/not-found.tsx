import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
      <h2 className="text-lg font-semibold">404 – Page not found</h2>
      <p className="text-muted-foreground text-center text-sm">
        The page you’re looking for doesn’t exist.
      </p>
      <Link
        href="/"
        className="rounded-md bg-foreground px-4 py-2 text-sm text-background hover:opacity-90"
      >
        Go home
      </Link>
    </div>
  );
}
