'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export type ProgressStage = {
  label: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  message?: string;
};

interface ProgressTrackerProps {
  stages: ProgressStage[];
  currentStageIndex: number;
  isComplete: boolean;
  hasError: boolean;
  totalItems?: number;
  completedItems?: number;
}

export default function ProgressTracker({
  stages,
  currentStageIndex,
  isComplete,
  hasError,
  totalItems,
  completedItems,
}: ProgressTrackerProps) {
  const [progress, setProgress] = useState(0);

  // Calculate progress percentage
  useEffect(() => {
    if (totalItems && completedItems !== undefined) {
      setProgress((completedItems / totalItems) * 100);
    } else if (stages.length > 0) {
      setProgress((currentStageIndex / stages.length) * 100);
    }
  }, [currentStageIndex, stages.length, totalItems, completedItems]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {isComplete ? (
            hasError ? (
              <span className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                Processing Failed
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                Processing Complete
              </span>
            )
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
              Processing...
            </span>
          )}
        </h3>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${
            hasError
              ? 'bg-red-600 dark:bg-red-500'
              : isComplete
              ? 'bg-green-600 dark:bg-green-500'
              : 'bg-blue-600 dark:bg-blue-500'
          }`}
        />
      </div>

      {/* Item Count (if provided) */}
      {totalItems !== undefined && completedItems !== undefined && (
        <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
          {completedItems} of {totalItems} items processed
        </div>
      )}

      {/* Stages */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {stages.map((stage, index) => {
          const isActive = index === currentStageIndex;
          const isPast = index < currentStageIndex;
          const isFuture = index > currentStageIndex;

          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                  : stage.status === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                  : stage.status === 'completed'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">
                {stage.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : stage.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                ) : stage.status === 'in_progress' ? (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium ${
                    stage.status === 'completed'
                      ? 'text-green-900 dark:text-green-100'
                      : stage.status === 'error'
                      ? 'text-red-900 dark:text-red-100'
                      : stage.status === 'in_progress'
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {stage.label}
                </p>
                {stage.message && (
                  <p
                    className={`text-sm mt-1 ${
                      stage.status === 'error'
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {stage.message}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion Message */}
      {isComplete && !hasError && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-green-700 dark:text-green-300 text-center font-medium">
            ✓ All operations completed successfully
          </p>
        </div>
      )}
    </div>
  );
}
