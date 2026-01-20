"use client";

import { useState, useEffect } from "react";

interface Slide {
  id: string;
  title: string;
  description: string;
}

interface SlideshowProps {
  slides: Slide[];
}

export function Slideshow({ slides }: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5000); 

    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900 text-white flex flex-col justify-center items-center p-12">
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 flex flex-col justify-center items-center p-12 transition-opacity duration-1000 ease-in-out ${
            index === currentIndex ? "opacity-100 z-10" : "opacity-0 z-0"
          }`}
        >
          <div className="text-center max-w-lg space-y-4">
            <h2 className="text-3xl font-bold">
                {slide.title}
            </h2>
            <p className="text-lg text-slate-300">
                {slide.description}
            </p>
          </div>
        </div>
      ))}

      {/* Indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
            {slides.map((_, idx) => (
                <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? "bg-white w-4" : "bg-white/50"
                    }`}
                />
            ))}
        </div>
      )}
    </div>
  );
}
