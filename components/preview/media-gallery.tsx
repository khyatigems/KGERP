"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ImageOff, PlayCircle, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MediaItem {
  id: string;
  mediaType: string;
  mediaUrl: string;
  isPrimary: boolean;
  alt?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  itemName: string;
}

export function MediaGallery({ media, itemName }: MediaGalleryProps) {
  const slides = [...media].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [zoomOpen, setZoomOpen] = useState(false);
  const selected = slides[selectedIndex];
  const select = (index: number) => setSelectedIndex((index + slides.length) % slides.length);

  if (!selected) return null;

  return (
    <section className="kg-gallery" aria-label={`${itemName} image gallery`}>
      <div className="kg-gallery-stage" aria-live="polite">
        {selected.mediaType.toUpperCase() === "VIDEO" ? (
          <video
            key={selected.id}
            src={selected.mediaUrl}
            controls
            playsInline
            preload="metadata"
            className="kg-gallery-video"
            aria-label={`${itemName} video`}
            poster={slides.find((slide) => slide.mediaType.toUpperCase() === "IMAGE" && slide.id !== "product-image-unavailable")?.mediaUrl}
            onError={() => setUnavailable((current) => current.includes(selected.id) ? current : [...current, selected.id])}
          />
        ) : unavailable.includes(selected.id) ? (
          <div className="kg-gallery-unavailable"><ImageOff size={34} strokeWidth={1.4} /><span>Image unavailable</span></div>
        ) : (
          <button type="button" className="kg-gallery-zoom-trigger" aria-label={`Zoom image: ${selected.alt || itemName}`} onClick={() => setZoomOpen(true)}>
            <Image
              key={selected.id}
              src={selected.mediaUrl}
              alt={selected.alt || (selected.id.startsWith("brand-") ? selected.id.replace("brand-", "Khyati Gems ") : itemName)}
              fill
              priority={selectedIndex === 0}
              unoptimized
              sizes="(max-width: 700px) 92vw, 52vw"
              className={cn("kg-gallery-image", selected.id.startsWith("brand-") && "kg-gallery-brand-image")}
              onError={() => setUnavailable((current) => current.includes(selected.id) ? current : [...current, selected.id])}
            />
            {selected.id !== "product-image-unavailable" && <span className="kg-gallery-zoom-hint"><ZoomIn size={15} aria-hidden="true" /> Zoom image</span>}
          </button>
        )}
        {slides.length > 1 && <>
          <button type="button" className="kg-gallery-arrow kg-gallery-arrow-left" aria-label="Previous image" onClick={() => select(selectedIndex - 1)}><ChevronLeft size={22} /></button>
          <button type="button" className="kg-gallery-arrow kg-gallery-arrow-right" aria-label="Next image" onClick={() => select(selectedIndex + 1)}><ChevronRight size={22} /></button>
          <span className="kg-gallery-counter">{selectedIndex + 1} / {slides.length}</span>
        </>}
      </div>
      {slides.length > 1 && <div className="kg-gallery-thumbnails" role="group" aria-label="Choose product image">
        {slides.map((slide, index) => {
          const isVideo = slide.mediaType.toUpperCase() === "VIDEO";
          const alt = slide.alt || (slide.id.startsWith("brand-") ? slide.id.replace("brand-", "Khyati Gems ") : `${itemName} image ${index + 1}`);
          return <button
            key={slide.id}
            type="button"
            aria-label={`Show ${isVideo ? "video" : "image"} ${index + 1}: ${alt}`}
            aria-pressed={index === selectedIndex}
            title={alt}
            onClick={() => select(index)}
            className={cn("kg-gallery-thumbnail", index === selectedIndex && "is-selected")}
          >
            {isVideo ? <span className="kg-gallery-video-thumb"><PlayCircle size={28} /></span> : unavailable.includes(slide.id) ? <span className="kg-gallery-failed-thumb"><ImageOff size={18} /></span> : <Image src={slide.mediaUrl} alt="" fill sizes="72px" unoptimized onError={() => setUnavailable((current) => current.includes(slide.id) ? current : [...current, slide.id])} />}
            {slide.id.startsWith("brand-") && <span className="kg-gallery-brand-label">Khyati Gems</span>}
          </button>;
        })}
      </div>}
      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="kg-gallery-lightbox">
          <DialogTitle className="sr-only">{itemName} enlarged image</DialogTitle>
          <div className="kg-gallery-lightbox-stage">
            {selected.mediaType.toUpperCase() !== "VIDEO" && <Image src={selected.mediaUrl} alt={selected.alt || itemName} fill sizes="96vw" unoptimized className="kg-gallery-lightbox-image" />}
          </div>
        </DialogContent>
      </Dialog>
      <style jsx global>{`
        .kg-gallery{width:100%;min-width:0}.kg-gallery-stage{position:relative;display:flex;aspect-ratio:1/1;align-items:center;justify-content:center;overflow:hidden;background:#f5f1e8}.kg-gallery-zoom-trigger{position:absolute;inset:0;width:100%;height:100%;padding:0;border:0;background:transparent;cursor:zoom-in}.kg-gallery-zoom-trigger:focus-visible{z-index:1;outline:2px solid #96733b;outline-offset:-4px}.kg-gallery-image{object-fit:contain;padding:18px}.kg-gallery-image.kg-gallery-brand-image{object-fit:cover;padding:0}.kg-gallery-zoom-hint{position:absolute;bottom:14px;left:14px;display:flex;align-items:center;gap:6px;padding:7px 9px;background:#fcfbf7eF;color:#202521;font-size:10px;letter-spacing:.04em}.kg-gallery-video{width:100%;height:100%;background:#151714;object-fit:contain}.kg-gallery-unavailable{display:flex;flex-direction:column;align-items:center;gap:12px;color:#777a72;font-size:12px;letter-spacing:.04em}.kg-gallery-arrow{position:absolute;top:50%;z-index:2;display:grid;width:42px;height:42px;place-items:center;transform:translateY(-50%);border:1px solid #20252122;border-radius:50%;background:#fcfbf7eF;color:#202521;cursor:pointer;transition:background .16s,color .16s}.kg-gallery-arrow:hover{background:#202521;color:#fff}.kg-gallery-arrow-left{left:14px}.kg-gallery-arrow-right{right:14px}.kg-gallery-counter{position:absolute;right:15px;bottom:15px;z-index:2;padding:5px 9px;background:#202521b8;color:white;font-size:10px;letter-spacing:.1em}.kg-gallery-thumbnails{display:flex;gap:9px;overflow-x:auto;padding:12px 1px 5px;scrollbar-width:thin;scroll-snap-type:x mandatory}.kg-gallery-thumbnail{position:relative;flex:0 0 74px;width:74px;height:74px;overflow:hidden;scroll-snap-align:start;border:1px solid #d9d5cb;background:#f5f1e8;cursor:pointer;opacity:.76;transition:border-color .18s,opacity .18s}.kg-gallery-thumbnail:hover,.kg-gallery-thumbnail.is-selected{border-color:#96733b;opacity:1}.kg-gallery-thumbnail.is-selected{outline:1px solid #96733b;outline-offset:1px}.kg-gallery-thumbnail :global(img){object-fit:cover}.kg-gallery-video-thumb,.kg-gallery-failed-thumb{display:grid;width:100%;height:100%;place-items:center;color:#555c55}.kg-gallery-brand-label{position:absolute;right:0;bottom:0;left:0;padding:3px 4px;background:#202521aa;color:white;font-size:8px;letter-spacing:.06em;text-align:center;text-transform:uppercase}.kg-gallery-lightbox{width:96vw!important;max-width:1500px!important;max-height:95dvh!important;padding:18px!important;overflow:hidden;background:#151714!important;color:white!important;border-color:#ffffff24!important}.kg-gallery-lightbox [data-slot="dialog-close"]{color:#fff}.kg-gallery-lightbox-stage{position:relative;width:100%;height:min(84dvh,1120px);min-height:240px}.kg-gallery-lightbox-image{object-fit:contain}
        @media(max-width:700px){.kg-gallery-stage{aspect-ratio:1/1}.kg-gallery-thumbnail{flex-basis:64px;width:64px;height:64px}.kg-gallery-arrow{width:38px;height:38px}}
      `}</style>
    </section>
  );
}
