"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function InterventionCarousel({
  imageUrls,
  videoUrl,
}: {
  imageUrls: string[];
  videoUrl: string | null;
}) {
  const slides = [...imageUrls, ...(videoUrl ? [videoUrl] : [])];
  const containerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  if (slides.length === 0) return null;

  function scrollTo(i: number) {
    const el = containerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(i, slides.length - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
    setIndex(clamped);
  }

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    setIndex(i);
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex h-48 w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none" }}
      >
        {slides.map((src, i) =>
          videoUrl && i === slides.length - 1 ? (
            <video
              key={src + i}
              src={src}
              controls
              className="h-48 w-full shrink-0 snap-center object-cover"
            />
          ) : (
            <img
              key={src + i}
              src={src}
              alt={`Photo ${i + 1}`}
              className="h-48 w-full shrink-0 snap-center object-cover"
            />
          )
        )}
      </div>

      {slides.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={() => scrollTo(index - 1)}
              className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
              aria-label="Précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
          {index < slides.length - 1 && (
            <button
              onClick={() => scrollTo(index + 1)}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white"
              aria-label="Suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
