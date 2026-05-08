'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ZoomableImage from './ZoomableImage';

interface QuestionImagesProps {
  images: string[];
  /** Sibling images for lightbox prev/next nav. Defaults to `images`. */
  gallery?: string[];
  altPrefix?: string;
  /** Switch from natural inline display to a thumbnail grid at this many images. Default 3. */
  gridThreshold?: number;
  /** Cap thumbnail-grid rows at this many images before collapsing. Default 6. */
  collapseAfter?: number;
}

/**
 * Smart image layout for question screens.
 *
 *   1–2 images → render at near-natural size (capped at ~60vh) so a single
 *                diagram doesn't get squashed.
 *   3+ images  → thumbnail grid with click-to-zoom; long sets collapse after
 *                `collapseAfter` thumbnails behind a "Show N more" toggle.
 */
export default function QuestionImages({
  images,
  gallery,
  altPrefix = 'Image',
  gridThreshold = 3,
  collapseAfter = 6,
}: QuestionImagesProps) {
  const [expanded, setExpanded] = useState(false);
  if (images.length === 0) return null;
  const fullGallery = gallery && gallery.length > 0 ? gallery : images;

  if (images.length < gridThreshold) {
    return (
      <div className="space-y-3">
        {images.map((src, i) => (
          <ZoomableImage
            key={`qi-${i}`}
            src={src}
            alt={`${altPrefix} ${i + 1}`}
            gallery={fullGallery}
            maxHeightClass="max-h-[60vh]"
          />
        ))}
      </div>
    );
  }

  const visible = expanded || images.length <= collapseAfter ? images : images.slice(0, collapseAfter);
  const hidden = images.length - visible.length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        {visible.map((src, i) => (
          <ZoomableImage
            key={`qi-${i}`}
            src={src}
            alt={`${altPrefix} ${i + 1}`}
            gallery={fullGallery}
            maxHeightClass="max-h-32 sm:max-h-40"
          />
        ))}
      </div>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="w-full py-2 px-4 rounded-lg border border-dashed border-card-border text-xs sm:text-sm text-muted-foreground hover:bg-muted/40 transition flex items-center justify-center gap-1.5"
        >
          <ChevronDown className="w-3.5 h-3.5" />
          Show {hidden} more {hidden === 1 ? 'image' : 'images'}
        </button>
      )}
    </div>
  );
}
