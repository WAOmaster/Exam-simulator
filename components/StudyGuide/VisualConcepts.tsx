'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
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

interface VisualConceptsProps {
  weakConcepts: WeakConcept[];
  weakCategories: { category: string; accuracy: number; total: number }[];
}

export default function VisualConcepts({ weakConcepts, weakCategories }: VisualConceptsProps) {
  const [generatingConcept, setGeneratingConcept] = useState<string | null>(null);
  const [images, setImages] = useState<Record<string, CachedImage>>(() => getCachedImages());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Combine weak concepts and categories into up to 4 items
  const conceptsToShow = weakConcepts.slice(0, 4).map((wc) => ({
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

  const generateImage = useCallback(async (item: typeof conceptsToShow[0]) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {conceptsToShow.map((item, i) => {
        const cached = images[item.key];
        const isGenerating = generatingConcept === item.key;
        const errorMsg = errors[item.key];

        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
          >
            {/* Image area */}
            <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
              {cached?.imageData ? (
                <img
                  src={`data:${cached.mimeType};base64,${cached.imageData}`}
                  alt={cached.description || item.concept}
                  className="w-full h-full object-contain"
                />
              ) : isGenerating ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 hp-icon-cyan animate-spin" />
                  <p className="text-xs hp-text-quaternary">Generating diagram...</p>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                  <p className="text-xs text-red-500">{errorMsg}</p>
                  <button
                    onClick={() => generateImage(item)}
                    className="flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                </div>
              ) : cached?.description ? (
                <div className="p-4 text-center">
                  <p className="text-sm hp-text-secondary leading-relaxed">{cached.description}</p>
                </div>
              ) : (
                <button
                  onClick={() => generateImage(item)}
                  disabled={generatingConcept !== null}
                  className="flex flex-col items-center gap-2 px-4 py-6 rounded-xl transition-colors hover:bg-gray-200/50 dark:hover:bg-gray-700/50 disabled:opacity-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 hp-icon-cyan" />
                  </div>
                  <span className="text-xs hp-text-tertiary font-medium">Generate Diagram</span>
                </button>
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
  );
}
