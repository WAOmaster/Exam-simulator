'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import type { WeakConcept } from '@/lib/diagnosisHistory';

interface CachedImage {
  imageData: string;
  mimeType: string;
  description: string;
}

const IMAGE_CACHE_KEY = 'study-guide-images';

function getCachedImages(): Record<string, CachedImage> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(IMAGE_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function setCachedImage(key: string, image: CachedImage): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getCachedImages();
    cache[key] = image;
    // Keep max 10 images to save localStorage space
    const keys = Object.keys(cache);
    if (keys.length > 10) {
      delete cache[keys[0]];
    }
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Failed to cache image:', error);
  }
}

function removeCachedImage(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    const cache = getCachedImages();
    delete cache[key];
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

interface ConceptItem {
  key: string;
  concept: string;
  category: string;
  explanation: string;
  frequency: number;
}

interface VisualConceptsProps {
  weakConcepts: WeakConcept[];
  weakCategories: { category: string; accuracy: number; total: number }[];
}

export default function VisualConcepts({ weakConcepts, weakCategories }: VisualConceptsProps) {
  const [generatingConcept, setGeneratingConcept] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, CachedImage>>(() => getCachedImages());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoGenQueue, setAutoGenQueue] = useState<string[]>([]);
  const [autoGenProgress, setAutoGenProgress] = useState<{ current: number; total: number } | null>(null);
  const autoGenStarted = useRef(false);

  // Combine weak concepts and categories into up to 4 items
  const conceptsToShow: ConceptItem[] = weakConcepts.slice(0, 4).map((wc) => ({
    key: `${wc.category}::${wc.conceptToReview}`,
    concept: wc.conceptToReview,
    category: wc.category,
    explanation: wc.latestExplanation,
    frequency: wc.frequency,
  }));

  // If we have fewer than 4 from diagnoses, supplement with weak categories
  if (conceptsToShow.length < 4) {
    const existingCategories = new Set(conceptsToShow.map((c) => c.category));
    for (const cat of weakCategories) {
      if (conceptsToShow.length >= 4) break;
      if (existingCategories.has(cat.category)) continue;
      conceptsToShow.push({
        key: `cat::${cat.category}`,
        concept: cat.category,
        category: cat.category,
        explanation: `This category has ${cat.accuracy}% accuracy and needs improvement`,
        frequency: cat.total,
      });
      existingCategories.add(cat.category);
    }
  }

  const generateImage = useCallback(async (item: ConceptItem) => {
    setGeneratingConcept(item.key);
    setErrors((prev) => ({ ...prev, [item.key]: '' }));

    try {
      const response = await fetch('/api/ai/study-guide-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: item.concept,
          category: item.category,
          explanation: item.explanation,
        }),
      });

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Failed to generate image');

      if (data.image) {
        const cached: CachedImage = {
          imageData: data.image,
          mimeType: data.mimeType || 'image/png',
          description: data.description || '',
        };
        setCachedImage(item.key, cached);
        setImages((prev) => ({ ...prev, [item.key]: cached }));
      } else {
        // Fallback: no image generated, show description only
        const cached: CachedImage = {
          imageData: '',
          mimeType: '',
          description: data.description || `Visual explanation for ${item.concept}`,
        };
        setImages((prev) => ({ ...prev, [item.key]: cached }));
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, [item.key]: err.message || 'Failed to generate' }));
    } finally {
      setGeneratingConcept(null);
    }
  }, []);

  // Auto-generation: initialize queue on mount
  useEffect(() => {
    if (autoGenStarted.current || conceptsToShow.length === 0) return;
    autoGenStarted.current = true;

    const cachedImages = getCachedImages();
    const uncachedKeys = conceptsToShow
      .filter((item) => !cachedImages[item.key]?.imageData)
      .map((item) => item.key);

    if (uncachedKeys.length > 0) {
      setAutoGenQueue(uncachedKeys);
      setAutoGenProgress({ current: 0, total: uncachedKeys.length });
    }
  }, [conceptsToShow.length]);

  // Auto-generation: process queue sequentially
  useEffect(() => {
    if (generatingConcept !== null || autoGenQueue.length === 0) return;

    const nextKey = autoGenQueue[0];
    const item = conceptsToShow.find((c) => c.key === nextKey);

    if (item) {
      // Update progress
      setAutoGenProgress((prev) => prev ? { ...prev, current: prev.total - autoGenQueue.length + 1 } : null);
      // Remove from queue
      setAutoGenQueue((prev) => prev.slice(1));
      // Generate
      generateImage(item);
    } else {
      // Item not found, skip
      setAutoGenQueue((prev) => prev.slice(1));
    }
  }, [generatingConcept, autoGenQueue, conceptsToShow, generateImage]);

  // Clear progress when done
  useEffect(() => {
    if (autoGenQueue.length === 0 && generatingConcept === null && autoGenProgress !== null) {
      const timer = setTimeout(() => setAutoGenProgress(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [autoGenQueue.length, generatingConcept, autoGenProgress]);

  const handleRegenerate = useCallback((item: ConceptItem) => {
    removeCachedImage(item.key);
    setImages((prev) => {
      const next = { ...prev };
      delete next[item.key];
      return next;
    });
    setErrors((prev) => ({ ...prev, [item.key]: '' }));
    generateImage(item);
  }, [generateImage]);

  if (conceptsToShow.length === 0) {
    return (
      <div className="p-8 rounded-xl border text-center" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
        <ImageIcon className="w-10 h-10 hp-text-quaternary mx-auto mb-3" />
        <p className="hp-text-tertiary text-sm">No weak areas identified yet.</p>
        <p className="hp-text-quaternary text-xs mt-1">Complete more exams with Cognitive Companion enabled to unlock visual guides.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Auto-generation progress banner */}
      {autoGenProgress && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 p-3 rounded-xl border border-cyan-500/15 bg-gradient-to-r from-cyan-50/60 to-teal-50/60 dark:from-cyan-500/[0.05] dark:to-teal-500/[0.05]"
        >
          {generatingConcept ? (
            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin shrink-0" />
          ) : (
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium hp-text-secondary">
              {generatingConcept
                ? `Generating diagrams... ${autoGenProgress.current}/${autoGenProgress.total}`
                : 'All diagrams generated!'}
            </p>
            {/* Progress bar */}
            <div className="mt-1.5 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                initial={{ width: 0 }}
                animate={{ width: `${(autoGenProgress.current / autoGenProgress.total) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Image grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {conceptsToShow.map((item, i) => {
          const cached = images[item.key];
          const isGenerating = generatingConcept === item.key;
          const errorMsg = errors[item.key];
          const hasImage = cached?.imageData;

          return (
            <motion.div
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border overflow-hidden group"
              style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
            >
              {/* Image area */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                {hasImage ? (
                  <>
                    <img
                      src={`data:${cached.mimeType};base64,${cached.imageData}`}
                      alt={cached.description || item.concept}
                      className="w-full h-full object-contain"
                    />
                    {/* Regenerate overlay button */}
                    <button
                      onClick={() => handleRegenerate(item)}
                      disabled={generatingConcept !== null}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30"
                      title="Regenerate diagram"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : isGenerating ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 hp-icon-cyan animate-spin" />
                    <p className="text-xs hp-text-quaternary">Generating diagram...</p>
                  </div>
                ) : errorMsg ? (
                  <div className="flex flex-col items-center gap-2 px-4 text-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                    <p className="text-xs text-red-500 line-clamp-2">{errorMsg}</p>
                    <button
                      onClick={() => handleRegenerate(item)}
                      disabled={generatingConcept !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate
                    </button>
                  </div>
                ) : cached?.description ? (
                  <div className="p-4 text-center">
                    <p className="text-sm hp-text-secondary leading-relaxed">{cached.description}</p>
                    <button
                      onClick={() => handleRegenerate(item)}
                      disabled={generatingConcept !== null}
                      className="mt-2 flex items-center gap-1 mx-auto text-xs text-cyan-600 dark:text-cyan-400 hover:underline disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Regenerate with image
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 px-4 py-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 hp-icon-cyan" />
                    </div>
                    <span className="text-xs hp-text-quaternary">Waiting to generate...</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3 border-t" style={{ borderColor: 'var(--hp-surface-border)' }}>
                <h4 className="font-semibold hp-text-primary text-sm truncate">{item.concept}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] hp-text-quaternary font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hp-surface-border)' }}>
                    {item.category}
                  </span>
                  {item.frequency > 1 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      {item.frequency}x diagnosed
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
