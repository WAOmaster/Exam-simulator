'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Target,
  Flame,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart2,
  Award,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

interface SessionRecord {
  id: string;
  timestamp: number;
  subject: string;
  score: { correct: number; total: number; percentage: number };
  categoryPerformance: Record<string, { correct: number; total: number }>;
  averageResponseTime: number;
  streaks: { max: number; final: number };
}

interface PerformanceDashboardProps {
  sessions: SessionRecord[];
  overallStats: {
    totalSessions: number;
    averageScore: number;
    totalQuestions: number;
    averageResponseTime: number;
    bestStreak: number;
  };
  weakCategories: { category: string; accuracy: number; total: number }[];
  strongCategories: { category: string; accuracy: number; total: number }[];
  trend: 'improving' | 'declining' | 'stable';
}

const formatTime = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
};

const getAccuracyColor = (accuracy: number) => {
  if (accuracy >= 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
  if (accuracy >= 60) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  if (accuracy >= 40) return { bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' };
  return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
};

export default function PerformanceDashboard({
  sessions,
  overallStats,
  weakCategories,
  strongCategories,
  trend,
}: PerformanceDashboardProps) {
  // Aggregate all categories across all sessions
  const allCategories = useMemo(() => {
    const catMap: Record<string, { correct: number; total: number }> = {};
    sessions.forEach((s) => {
      Object.entries(s.categoryPerformance).forEach(([cat, stats]) => {
        if (!catMap[cat]) catMap[cat] = { correct: 0, total: 0 };
        catMap[cat].correct += stats.correct;
        catMap[cat].total += stats.total;
      });
    });
    return Object.entries(catMap)
      .map(([category, stats]) => ({
        category,
        accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
        correct: stats.correct,
        total: stats.total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [sessions]);

  // Score trend data (last 10 sessions)
  const scoreTrend = useMemo(() => {
    return sessions.slice(0, 10).reverse().map((s) => s.score.percentage);
  }, [sessions]);

  const TrendIcon = trend === 'improving' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
  const trendColor = trend === 'improving' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'declining' ? 'text-red-600 dark:text-red-400' : 'hp-text-tertiary';
  const trendLabel = trend === 'improving' ? 'Improving' : trend === 'declining' ? 'Declining' : 'Stable';

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            icon: Target,
            label: 'Avg Score',
            value: `${overallStats.averageScore}%`,
            sub: `${overallStats.totalSessions} sessions`,
            iconClass: 'hp-icon-emerald',
            bg: 'from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20',
            border: 'border-emerald-500/15',
          },
          {
            icon: Flame,
            label: 'Best Streak',
            value: `${overallStats.bestStreak}`,
            sub: 'consecutive correct',
            iconClass: 'hp-icon-amber',
            bg: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20',
            border: 'border-amber-500/15',
          },
          {
            icon: Clock,
            label: 'Avg Response',
            value: formatTime(overallStats.averageResponseTime),
            sub: 'per question',
            iconClass: 'hp-icon-blue',
            bg: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20',
            border: 'border-blue-500/15',
          },
          {
            icon: TrendIcon,
            label: 'Trend',
            value: trendLabel,
            sub: 'recent performance',
            iconClass: trendColor,
            bg: trend === 'improving'
              ? 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20'
              : trend === 'declining'
              ? 'from-red-500/10 to-rose-500/10 dark:from-red-500/20 dark:to-rose-500/20'
              : 'from-gray-500/10 to-slate-500/10 dark:from-gray-500/20 dark:to-slate-500/20',
            border: trend === 'improving' ? 'border-emerald-500/15' : trend === 'declining' ? 'border-red-500/15' : 'border-gray-500/15',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`p-4 rounded-xl bg-gradient-to-br ${stat.bg} border ${stat.border}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.iconClass}`} />
              <span className="text-xs font-medium hp-text-tertiary">{stat.label}</span>
            </div>
            <p className="text-xl font-bold hp-text-primary">{stat.value}</p>
            <p className="text-xs hp-text-quaternary mt-0.5">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Score Trend Chart */}
      {scoreTrend.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-xl border"
          style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 hp-icon-indigo" />
            <h3 className="text-sm font-semibold hp-text-primary">Score Trend</h3>
            <span className="text-xs hp-text-quaternary ml-auto">Last {scoreTrend.length} sessions</span>
          </div>

          {/* SVG Bar Chart */}
          <div className="relative h-32">
            <svg viewBox={`0 0 ${scoreTrend.length * 40 + 10} 120`} className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((v) => (
                <line
                  key={v}
                  x1="0"
                  y1={120 - (v / 100) * 110}
                  x2={scoreTrend.length * 40 + 10}
                  y2={120 - (v / 100) * 110}
                  stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              ))}
              {/* Bars */}
              {scoreTrend.map((score, i) => {
                const barHeight = (score / 100) * 110;
                const x = i * 40 + 10;
                const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={120 - barHeight}
                      width="24"
                      height={barHeight}
                      fill={color}
                      rx="4"
                      opacity="0.85"
                    />
                    <text
                      x={x + 12}
                      y={120 - barHeight - 4}
                      textAnchor="middle"
                      fontSize="8"
                      fill="currentColor"
                      className="hp-text-tertiary"
                    >
                      {score}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </motion.div>
      )}

      {/* Category Performance */}
      {allCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-5 rounded-xl border"
          style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 hp-icon-purple" />
            <h3 className="text-sm font-semibold hp-text-primary">Category Performance</h3>
          </div>
          <div className="space-y-3">
            {allCategories.map(({ category, accuracy, correct, total }, i) => {
              const colors = getAccuracyColor(accuracy);
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + i * 0.05 }}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="hp-text-secondary truncate max-w-[55%] font-medium">{category}</span>
                    <span className={`text-xs font-semibold ${colors.text}`}>
                      {correct}/{total} ({accuracy}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hp-surface-border)' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${accuracy}%` }}
                      transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                      className={`h-full rounded-full ${colors.bar}`}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Strengths */}
        {strongCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-4 rounded-xl border border-emerald-500/15 bg-emerald-50/30 dark:bg-emerald-500/[0.04]"
          >
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4 hp-icon-emerald" />
              <h3 className="text-sm font-semibold hp-text-primary">Strengths</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {strongCategories.map((cat) => (
                <span
                  key={cat.category}
                  className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium"
                >
                  {cat.category} ({cat.accuracy}%)
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Weaknesses */}
        {weakCategories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="p-4 rounded-xl border border-amber-500/15 bg-amber-50/30 dark:bg-amber-500/[0.04]"
          >
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 hp-icon-amber" />
              <h3 className="text-sm font-semibold hp-text-primary">Needs Improvement</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {weakCategories.map((cat) => (
                <span
                  key={cat.category}
                  className="px-2.5 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-medium"
                >
                  {cat.category} ({cat.accuracy}%)
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
