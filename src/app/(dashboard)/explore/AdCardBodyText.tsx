"use client";

import { useState } from "react";

const TRUNCATE_LENGTH = 200;

export function AdCardBodyText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsTruncation = text.length > TRUNCATE_LENGTH;

  if (!text || text === "—") {
    return <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">—</p>;
  }

  if (!needsTruncation) {
    return (
      <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">
        {text}
      </p>
    );
  }

  if (expanded) {
    return (
      <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">
        {text}
        {" "}
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-primary font-medium hover:underline focus:underline focus:outline-none"
        >
          see less
        </button>
      </p>
    );
  }

  const truncated = text.slice(0, TRUNCATE_LENGTH).trim();
  return (
    <p className="text-sm text-foreground break-words leading-[18px] whitespace-pre-wrap">
      {truncated}
      ...
      {" "}
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-primary font-medium hover:underline focus:underline focus:outline-none"
      >
        see more
      </button>
    </p>
  );
}
