'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Circle } from 'lucide-react';

interface ProgressBarProps {
  current: number;
  total: number;
  answered: number;
}

export default function ProgressBar({ current, total, answered }: ProgressBarProps) {
  const progressPercentage = ((current + 1) / total) * 100;
  const answeredPercentage = (answered / total) * 100;

  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            Question {current + 1}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm text-muted-foreground">{total}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Answered indicator */}
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-accent-green" />
            <span className="text-sm font-medium text-accent-green">
              {answered}
            </span>
          </div>

          {/* Remaining indicator */}
          <div className="flex items-center gap-1.5">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {total - answered}
            </span>
          </div>
        </div>
      </div>

      {/* Progress track */}
      <div className="relative w-full h-2 progress-track">
        {/* Answered segments (background layer) */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${answeredPercentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="absolute h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, var(--accent-green), color-mix(in srgb, var(--accent-green) 70%, var(--accent-blue)))'
          }}
        />

        {/* Current position indicator */}
        <motion.div
          initial={{ left: 0 }}
          animate={{ left: `${progressPercentage}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
        >
          <div className="w-4 h-4 rounded-full bg-accent-gold border-2 border-white dark:border-gray-800 shadow-md" />
        </motion.div>
      </div>

      {/* Section markers */}
      <div className="flex justify-between mt-2">
        {Array.from({ length: Math.min(total, 10) }).map((_, i) => {
          const sectionIndex = Math.floor((i / 10) * total);
          const isCompleted = sectionIndex < answered;
          const isCurrent = sectionIndex === current;

          return (
            <div
              key={i}
              className={`
                w-1.5 h-1.5 rounded-full transition-all duration-300
                ${isCurrent
                  ? 'bg-accent-gold scale-125'
                  : isCompleted
                    ? 'bg-accent-green'
                    : 'bg-muted'
                }
              `}
            />
          );
        })}
      </div>
    </div>
  );
}
