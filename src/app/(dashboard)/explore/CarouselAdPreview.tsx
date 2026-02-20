"use client";

import { useRef } from "react";

type Slide = { imageUrl: string; title?: string };

/**
 * Carousel ad creative – LinkedIn Ads Library style.
 * Horizontal slide list with prev/next, each slide: image + title strip.
 */
type Props = {
  slides: Slide[];
  destinationUrl: string | null;
};

const CARD_WIDTH = 220;
const CARD_GAP = 6;

export function CarouselAdPreview({ slides, destinationUrl }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const step = CARD_WIDTH + CARD_GAP;
    el.scrollBy({ left: direction === "prev" ? -step : step, behavior: "smooth" });
  };

  if (!slides || slides.length === 0) {
    return (
      <div className="my-1.5 py-8 text-center text-sm text-muted-foreground">
        No carousel slides
      </div>
    );
  }

  const hasLink = destinationUrl && destinationUrl.trim() !== "";

  return (
    <section className="relative my-1.5">
      {/* Prev button */}
      {slides.length > 1 && (
        <div className="absolute left-0 top-0 z-10 flex h-full items-center">
          <button
            type="button"
            onClick={() => scroll("prev")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-foreground shadow"
            aria-label="Previous slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="14"
              viewBox="0 0 7 14"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path d="M4.6 0L0 7L4.6 14H7L2.4 7L7 0H4.6Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}

      {/* Slide list */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-1.5 pl-1.5 pr-1.5 scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[220px] rounded-md border border-border overflow-hidden bg-card"
          >
            {hasLink ? (
              <a
                href={destinationUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:no-underline focus:no-underline"
              >
                <div className="aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.imageUrl}
                    alt={slide.title ?? ""}
                    className="block w-full h-full object-contain rounded-t-md"
                  />
                </div>
                <div className="p-1.5 h-14 flex items-center">
                  <span className="text-xs font-semibold text-foreground leading-[14px] line-clamp-2">
                    {slide.title ?? `Slide ${i + 1}`}
                  </span>
                </div>
              </a>
            ) : (
              <>
                <div className="aspect-square bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.imageUrl}
                    alt={slide.title ?? ""}
                    className="block w-full h-full object-contain rounded-t-md"
                  />
                </div>
                <div className="p-1.5 h-14 flex items-center">
                  <span className="text-xs font-semibold text-foreground leading-[14px] line-clamp-2">
                    {slide.title ?? `Slide ${i + 1}`}
                  </span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Next button */}
      {slides.length > 1 && (
        <div className="absolute right-0 top-0 z-10 flex h-full items-center">
          <button
            type="button"
            onClick={() => scroll("next")}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-foreground shadow"
            aria-label="Next slide"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="7"
              height="14"
              viewBox="0 0 7 14"
              fill="none"
              className="shrink-0"
              aria-hidden
            >
              <path d="M2.4 14L7 7L2.4 0H0L4.6 7L0 14H2.4Z" fill="currentColor" />
            </svg>
          </button>
        </div>
      )}
    </section>
  );
}
