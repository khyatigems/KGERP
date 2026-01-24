"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { PlayCircle, Image as ImageIcon } from "lucide-react";

interface MediaItem {
  id: string;
  mediaType: string;
  mediaUrl: string;
  isPrimary: boolean;
}

interface MediaGalleryProps {
  media: MediaItem[];
  itemName: string;
}

export function MediaGallery({ media, itemName }: MediaGalleryProps) {
  // Sort media: Primary first, then images, then videos
  const sortedMedia = [...media].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return 0;
  });

  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedMedia = sortedMedia[selectedIndex];

  if (!sortedMedia.length) {
    return (
      <div className="w-full aspect-square bg-muted flex flex-col items-center justify-center text-muted-foreground rounded-lg border border-dashed">
        <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
        <span>No Media Available</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div className="relative w-full aspect-square bg-white rounded-xl overflow-hidden border shadow-sm group">
        {selectedMedia.mediaType === "VIDEO" ? (
          <video
            src={selectedMedia.mediaUrl}
            controls
            className="w-full h-full object-contain bg-black/5"
            poster={sortedMedia.find(m => m.mediaType === "IMAGE")?.mediaUrl} 
          />
        ) : (
          <div className="relative w-full h-full bg-white">
             <Image
              src={selectedMedia.mediaUrl}
              alt={itemName}
              fill
              className="object-contain p-2"
              sizes="(max-width: 768px) 100vw, 500px"
              priority
            />
          </div>
        )}
      </div>

      {/* Thumbnails */}
      {sortedMedia.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide snap-x">
          {sortedMedia.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border transition-all snap-start",
                selectedIndex === index
                  ? "border-stone-800 ring-1 ring-stone-800 opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              {item.mediaType === "VIDEO" ? (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center">
                    <PlayCircle className="w-8 h-8 text-stone-600" />
                </div>
              ) : (
                 <Image
                  src={item.mediaUrl}
                  alt={`${itemName} thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
