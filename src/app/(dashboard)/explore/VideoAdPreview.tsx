"use client";

import { useRef, useState } from "react";

/**
 * Video ad creative – LinkedIn Ads Library style.
 * Native video with poster-style container, big play button overlay when paused, and controls.
 */
type Props = {
  videoUrl: string | null;
  posterUrl?: string | null;
};

export function VideoAdPreview({ videoUrl, posterUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayClick = () => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {});
      setIsPlaying(true);
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

  return (
    <div className="relative w-full aspect-video bg-black overflow-hidden">
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl ?? undefined}
          controls
          playsInline
          className="w-full h-full object-contain"
          onPause={handlePause}
          onPlay={handlePlay}
          onEnded={handlePause}
        />
        {/* Big play button overlay – hidden when playing (LinkedIn style) */}
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
