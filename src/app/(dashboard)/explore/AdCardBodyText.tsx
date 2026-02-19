"use client";

import { useState } from "react";

// Rough threshold to decide when to show the truncation UI.
// We still use CSS (max-height + overflow-hidden) for the actual cut-off,
// matching LinkedIn's behaviour from the provided HTML.
const TRUNCATE_LENGTH = 220;

export function AdCardBodyText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text === "—") {
    return (
      <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">
        —{/* keep simple dash for empty text */}
      </p>
    );
  }

  const needsTruncation = text.length > TRUNCATE_LENGTH;

  // Short texts: no truncation, no button.
  if (!needsTruncation) {
    return (
      <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  // Match LinkedIn-style container: full text in the DOM, CSS controls the cut-off,
  // and a “…see more” button sits at the bottom-right when collapsed.
  return (
    <div className="relative my-1.5">
      <p
        className={
          "text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap" +
          (expanded ? "" : " overflow-hidden max-h-[54px]")
        }
      >
        {text}
      </p>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-0 bottom-0 pl-0.5 pr-1.5 bg-card text-xs text-muted-foreground hover:underline focus:underline focus:outline-none"
        >
          …see more
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 text-xs text-muted-foreground hover:underline focus:underline focus:outline-none"
        >
          see less
        </button>
      )}
    </div>
  );
}
