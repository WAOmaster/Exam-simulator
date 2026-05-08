'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [idx, setIdx] = useState(() => Math.min(Math.max(initialIndex, 0), Math.max(images.length - 1, 0)));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1));
      else if (e.key === 'ArrowRight') setIdx((i) => Math.min(images.length - 1, i + 1));
    };
    window.addEventListener('keydown', handler);
    // Lock body scroll while lightbox is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [images.length, onClose]);

  if (images.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-2 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
      >
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-3 right-3 sm:top-5 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          aria-label="Close"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {idx > 0 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx(idx - 1); }}
            className="absolute left-2 sm:left-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {idx < images.length - 1 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx(idx + 1); }}
            className="absolute right-2 sm:right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <motion.img
          key={images[idx]}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15 }}
          src={images[idx]}
          alt={`Image ${idx + 1} of ${images.length}`}
          onClick={(e) => e.stopPropagation()}
          className="max-h-[90vh] max-w-[95vw] object-contain rounded-lg cursor-zoom-out"
        />

        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/15 text-white text-xs sm:text-sm backdrop-blur">
            {idx + 1} / {images.length}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
