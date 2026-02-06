'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Target,
  TrendingUp,
  Flame,
  BookOpen,
  Zap,
} from 'lucide-react';
import {
  getMasteryStats,
  getReviewLogs,
} from '@/lib/questionMastery';
import {
  getReviewForecast,
  calculateRetentionRate,
} from '@/lib/fsrs';
import { getAllMastery } from '@/lib/questionMastery';

export default function ReviewStats() {
  const [stats, setStats] = useState({
    totalCards: 0,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    dueToday: 0,
    dueTomorrow: 0,
    dueThisWeek: 0,
  });
  const [retentionRate, setRetentionRate] = useState(0);
  const [forecast, setForecast] = useState<{ date: string; count: number }[]>([]);

  useEffect(() => {
    // Get stats
    const masteryStats = getMasteryStats();
    setStats(masteryStats);

    // Get retention rate
    const logs = getReviewLogs();
    setRetentionRate(calculateRetentionRate(logs));

    // Get forecast
    const allMastery = getAllMastery();
    const cardMap = new Map(
      Array.from(allMastery.entries()).map(([id, m]) => [id, m.cardState])
    );
    setForecast(getReviewForecast(cardMap, 7));
  }, []);

  const getMaxForecast = () => Math.max(...forecast.map((f) => f.count), 1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
              Review Statistics
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Spaced repetition progress
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Due Today
              </span>
            </div>
            <p className="text-2xl font-bold text-red-800 dark:text-red-200">
              {stats.dueToday}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                Tomorrow
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
              {stats.dueTomorrow}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                This Week
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {stats.dueThisWeek}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Retention
              </span>
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {retentionRate}%
            </p>
          </motion.div>
        </div>

        {/* Card State Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
        >
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Card Breakdown
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.newCards}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">New</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {stats.learningCards}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Learning</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {stats.reviewCards}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Review</p>
            </div>
          </div>

          {/* Progress Bar */}
          {stats.totalCards > 0 && (
            <div className="mt-4">
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${(stats.newCards / stats.totalCards) * 100}%` }}
                />
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${(stats.learningCards / stats.totalCards) * 100}%` }}
                />
                <div
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${(stats.reviewCards / stats.totalCards) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                {stats.totalCards} total cards
              </p>
            </div>
          )}
        </motion.div>

        {/* 7-Day Forecast */}
        {forecast.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              7-Day Workload Forecast
            </h3>
            <div className="flex items-end justify-between h-24 gap-1">
              {forecast.map((day, index) => {
                const date = new Date(day.date);
                const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                const isToday = index === 0;
                const height = (day.count / getMaxForecast()) * 100;

                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${height}%` }}
                      transition={{ delay: 0.6 + index * 0.05, duration: 0.3 }}
                      className={`w-full rounded-t ${
                        isToday
                          ? 'bg-indigo-500'
                          : day.count > 0
                          ? 'bg-indigo-300 dark:bg-indigo-600'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      style={{ minHeight: day.count > 0 ? '4px' : '0' }}
                    />
                    <span
                      className={`text-xs ${
                        isToday
                          ? 'font-bold text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {dayName}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {day.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
