'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Zap,
} from 'lucide-react';

interface LiveStatsData {
  currentStreak: number;
  maxStreak: number;
  responseTimeMs: number;
  averageResponseTimeMs: number;
  selectionChanges: number;
  questionsAnswered: number;
  totalQuestions: number;
  categoryAccuracy?: Record<string, { correct: number; total: number }>;
}

interface LiveStatsOverlayProps {
  stats: LiveStatsData;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function LiveStatsOverlay({
  stats,
  isMinimized: controlledMinimized,
  onToggleMinimize,
}: LiveStatsOverlayProps) {
  const [internalMinimized, setInternalMinimized] = useState(false);

  const isMinimized = controlledMinimized ?? internalMinimized;
  const toggleMinimize = onToggleMinimize ?? (() => setInternalMinimized(!internalMinimized));

  const formatTime = (ms: number) => {
    if (ms < 1000) return '<1s';
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 10) return '🔥🔥🔥';
    if (streak >= 5) return '🔥🔥';
    if (streak >= 3) return '🔥';
    return '';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 10) return 'text-orange-500';
    if (streak >= 5) return 'text-yellow-500';
    if (streak >= 3) return 'text-amber-400';
    return 'text-gray-500 dark:text-gray-400';
  };

  // Calculate top 3 categories by accuracy
  const topCategories = stats.categoryAccuracy
    ? Object.entries(stats.categoryAccuracy)
        .filter(([_, data]) => data.total > 0)
        .map(([category, data]) => ({
          category,
          accuracy: Math.round((data.correct / data.total) * 100),
          total: data.total,
        }))
        .sort((a, b) => b.accuracy - a.accuracy)
        .slice(0, 3)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-16 sm:top-20 right-2 sm:right-4 z-40"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[200px]">
        {/* Header */}
        <button
          onClick={toggleMinimize}
          className="w-full px-3 py-2 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Live Stats
            </span>
          </div>
          {isMinimized ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          )}
        </button>

        {/* Content */}
        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-3">
                {/* Streak */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className={`w-4 h-4 ${getStreakColor(stats.currentStreak)}`} />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Streak</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-sm font-bold ${getStreakColor(stats.currentStreak)}`}>
                      {stats.currentStreak}
                    </span>
                    <span className="text-xs">{getStreakEmoji(stats.currentStreak)}</span>
                    {stats.maxStreak > stats.currentStreak && (
                      <span className="text-xs text-gray-400 ml-1">
                        (max: {stats.maxStreak})
                      </span>
                    )}
                  </div>
                </div>

                {/* Response Time */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Response</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {formatTime(stats.responseTimeMs)}
                    </span>
                    {stats.averageResponseTimeMs > 0 && (
                      <span className="text-xs text-gray-400 ml-1">
                        (avg: {formatTime(stats.averageResponseTimeMs)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Selection Changes */}
                {stats.selectionChanges > 0 && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">Changes</span>
                    </div>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {stats.selectionChanges}
                    </span>
                  </div>
                )}

                {/* Progress */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {stats.questionsAnswered}/{stats.totalQuestions}
                  </span>
                </div>

                {/* Category Accuracy Mini Display */}
                {topCategories.length > 0 && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Top Categories
                    </p>
                    <div className="space-y-1.5">
                      {topCategories.map(({ category, accuracy }) => (
                        <div key={category} className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                accuracy >= 80
                                  ? 'bg-green-500'
                                  : accuracy >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${accuracy}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 dark:text-gray-400 w-8 text-right">
                            {accuracy}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
