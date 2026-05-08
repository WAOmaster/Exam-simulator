'use client';

import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import ImageLightbox from './ImageLightbox';

interface ZoomableImageProps {
  src: string;
  alt?: string;
  className?: string;
  /** Sibling images that the lightbox can navigate between. Falls back to [src]. */
  gallery?: string[];
  /** Tailwind max-height class. Defaults to constrain large diagrams. */
  maxHeightClass?: string;
}

export default function ZoomableImage({
  src,
  alt = 'Image',
  className = '',
  gallery,
  maxHeightClass = 'max-h-80 sm:max-h-96',
}: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const galleryUrls = gallery && gallery.length > 0 ? gallery : [src];
  const initialIndex = Math.max(0, galleryUrls.indexOf(src));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block w-full overflow-hidden rounded-xl border border-card-border bg-muted/20 cursor-zoom-in ${className}`}
        aria-label={`View ${alt} full size`}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`w-full ${maxHeightClass} object-contain`}
        />
        <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="w-3 h-3" />
          Zoom
        </span>
      </button>
      {open && (
        <ImageLightbox
          images={galleryUrls}
          initialIndex={initialIndex}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
