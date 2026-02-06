'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Target,
  Flame,
  TrendingUp,
  BarChart2,
  Zap,
  Award,
  AlertTriangle,
} from 'lucide-react';

interface SessionMetrics {
  correctAnswers: number;
  incorrectAnswers: number;
  currentStreak: number;
  maxStreak: number;
  averageResponseTime: number;
  categoryPerformance: Record<string, { correct: number; total: number }>;
  consecutiveIncorrect: number;
}

interface SessionSummaryProps {
  sessionMetrics: SessionMetrics;
  questionViewTimes: Map<number, number>;
  selectionChanges: Map<number, number>;
  examDuration: number;
  totalQuestions: number;
}

export default function SessionSummary({
  sessionMetrics,
  questionViewTimes,
  selectionChanges,
  examDuration,
  totalQuestions,
}: SessionSummaryProps) {
  // Calculate response time distribution
  const responseTimeAnalysis = useMemo(() => {
    const times = Array.from(questionViewTimes.values());
    if (times.length === 0) return null;

    const sortedTimes = [...times].sort((a, b) => a - b);
    const fastest = sortedTimes[0];
    const slowest = sortedTimes[sortedTimes.length - 1];
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const average = times.reduce((a, b) => a + b, 0) / times.length;

    // Distribution buckets
    const buckets = {
      fast: 0, // < 30s
      medium: 0, // 30s - 60s
      slow: 0, // 60s - 120s
      verySlow: 0, // > 120s
    };

    times.forEach((time) => {
      const seconds = time / 1000;
      if (seconds < 30) buckets.fast++;
      else if (seconds < 60) buckets.medium++;
      else if (seconds < 120) buckets.slow++;
      else buckets.verySlow++;
    });

    return {
      fastest,
      slowest,
      median,
      average,
      buckets,
      total: times.length,
    };
  }, [questionViewTimes]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    return Object.entries(sessionMetrics.categoryPerformance)
      .map(([category, data]) => ({
        category,
        correct: data.correct,
        total: data.total,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sessionMetrics.categoryPerformance]);

  // Total selection changes
  const totalSelectionChanges = useMemo(() => {
    return Array.from(selectionChanges.values()).reduce((a, b) => a + b, 0);
  }, [selectionChanges]);

  // Questions with most changes
  const mostChangedQuestions = useMemo(() => {
    return Array.from(selectionChanges.entries())
      .filter(([_, changes]) => changes > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [selectionChanges]);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'bg-green-500';
    if (accuracy >= 60) return 'bg-yellow-500';
    if (accuracy >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const overallAccuracy = totalQuestions > 0
    ? Math.round((sessionMetrics.correctAnswers / totalQuestions) * 100)
    : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
            Session Summary
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Accuracy */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Accuracy
              </span>
            </div>
            <p className="text-2xl font-bold text-green-800 dark:text-green-200">
              {overallAccuracy}%
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {sessionMetrics.correctAnswers}/{totalQuestions} correct
            </p>
          </motion.div>

          {/* Max Streak */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg border border-orange-200 dark:border-orange-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                Best Streak
              </span>
            </div>
            <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              {sessionMetrics.maxStreak}
            </p>
            <p className="text-xs text-orange-600 dark:text-orange-400">
              consecutive correct
            </p>
          </motion.div>

          {/* Avg Response Time */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Avg Response
              </span>
            </div>
            <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
              {formatTime(sessionMetrics.averageResponseTime)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">per question</p>
          </motion.div>

          {/* Total Changes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700"
          >
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Answer Changes
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
              {totalSelectionChanges}
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400">total revisions</p>
          </motion.div>
        </div>

        {/* Response Time Distribution */}
        {responseTimeAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Response Time Distribution
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Fast (<30s)', count: responseTimeAnalysis.buckets.fast, color: 'bg-green-500' },
                { label: 'Medium (30-60s)', count: responseTimeAnalysis.buckets.medium, color: 'bg-blue-500' },
                { label: 'Slow (1-2m)', count: responseTimeAnalysis.buckets.slow, color: 'bg-yellow-500' },
                { label: 'Very Slow (>2m)', count: responseTimeAnalysis.buckets.verySlow, color: 'bg-red-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className="text-center">
                  <div className="h-20 flex items-end justify-center mb-1">
                    <div
                      className={`w-8 ${color} rounded-t transition-all duration-500`}
                      style={{
                        height: `${responseTimeAnalysis.total > 0 ? (count / responseTimeAnalysis.total) * 100 : 0}%`,
                        minHeight: count > 0 ? '8px' : '0',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{count}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-600">
              <span>Fastest: {formatTime(responseTimeAnalysis.fastest)}</span>
              <span>Median: {formatTime(responseTimeAnalysis.median)}</span>
              <span>Slowest: {formatTime(responseTimeAnalysis.slowest)}</span>
            </div>
          </motion.div>
        )}

        {/* Category Breakdown */}
        {categoryBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
          >
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <Award className="w-4 h-4" />
              Category Performance
            </h3>
            <div className="space-y-3">
              {categoryBreakdown.map(({ category, correct, total, accuracy }) => (
                <div key={category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300 truncate max-w-[60%]">
                      {category}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">
                      {correct}/{total} ({accuracy}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${accuracy}%` }}
                      transition={{ duration: 0.8, delay: 0.7 }}
                      className={`h-full rounded-full ${getAccuracyColor(accuracy)}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Most Changed Questions */}
        {mostChangedQuestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700"
          >
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Questions with Most Answer Changes
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
              Consider reviewing these topics
            </p>
            <div className="flex flex-wrap gap-2">
              {mostChangedQuestions.map(([questionId, changes]) => (
                <span
                  key={questionId}
                  className="px-2 py-1 bg-amber-100 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded text-xs"
                >
                  Q{questionId}: {changes} changes
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
