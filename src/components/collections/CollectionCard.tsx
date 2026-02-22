"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type CollectionCardProps = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  adCount: number;
  onDelete: (id: string) => void;
  isDeleting?: boolean;
};

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CollectionCard({
  id,
  name,
  description,
  createdAt,
  adCount,
  onDelete,
  isDeleting = false,
}: CollectionCardProps) {
  const handleDelete = () => {
    if (
      typeof window !== "undefined" &&
      window.confirm(
        `Delete "${name}"? This will remove all ads from this collection. The ads themselves are not deleted.`
      )
    ) {
      onDelete(id);
    }
  };

  return (
    <Card className="flex flex-col">
      <CardContent className="pt-6 pb-2 flex-1">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0" aria-hidden>
            📁
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-foreground truncate">{name}</h2>
            {description ? (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {adCount} {adCount === 1 ? "ad" : "ads"}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Created {formatDate(createdAt)}
        </p>
      </CardContent>
      <CardFooter className="flex gap-2 pt-2">
        <Button variant="default" size="sm" asChild>
          <Link href={`/collections/${id}`}>View</Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </Button>
      </CardFooter>
    </Card>
  );
}
