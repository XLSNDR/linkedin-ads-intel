"use client";

import { useRef, useState } from "react";

/**
 * Video ad creative – LinkedIn Ads Library style.
 * Poster image when available; play only sets overlay off on actual 'play' event; error fallback with link to LinkedIn.
 */
type Props = {
  videoUrl: string | null;
  posterUrl?: string | null;
  adLibraryUrl?: string | null;
};

export function VideoAdPreview({ videoUrl, posterUrl, adLibraryUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);

  const handlePlayClick = () => {
    setError(false);
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => setError(true));
    }
  };

  const handlePause = () => setIsPlaying(false);
  const handlePlay = () => setIsPlaying(true);

  if (!videoUrl) {
    return (
      <div className="relative w-full aspect-video bg-muted rounded-b-md flex items-center justify-center text-muted-foreground text-sm">
        No video
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-muted flex flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Video can&apos;t be played here (e.g. restricted by the host).
        </p>
        {adLibraryUrl && (
          <a
            href={adLibraryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline hover:no-underline"
          >
            View on LinkedIn
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
      {/* When no posterUrl is provided (e.g. Apify doesn't return videoThumbnailUrl), show a placeholder so it's not solid black */}
      {!posterUrl && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-white/30 text-sm">Video</span>
        </div>
      )}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={posterUrl ?? undefined}
        crossOrigin="anonymous"
        controls
        playsInline
        className="w-full h-full object-contain"
        onPause={handlePause}
        onPlay={handlePlay}
        onEnded={handlePause}
        onError={() => setError(true)}
      />
      {/* Big play button overlay – only hidden when video actually plays (fixes black screen if play fails) */}
      {!isPlaying && (
        <button
          type="button"
          onClick={handlePlayClick}
          className="absolute inset-0 flex items-center justify-center w-full h-full bg-black/20 hover:bg-black/30 transition-colors"
          aria-label="Play video"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/90 hover:bg-white text-black shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-7 h-7 ml-1"
              aria-hidden
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
