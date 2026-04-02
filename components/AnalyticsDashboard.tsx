'use client';

import { TrendingUp, BarChart2, Target, Award } from 'lucide-react';

interface AnalyticsData {
  totalExams: number;
  averageScore: number;
  scoreTrend: number[];
  subjectPerformance: {
    [subject: string]: { correct: number; total: number; percentage: number };
  };
  difficultyPerformance: { easy: number; medium: number; hard: number };
}

interface AnalyticsDashboardProps {
  analytics: AnalyticsData;
}

export default function AnalyticsDashboard({ analytics }: AnalyticsDashboardProps) {
  if (analytics.totalExams === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
        <BarChart2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
          No exam data yet
        </p>
        <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
          Complete some exams to see your performance analytics
        </p>
      </div>
    );
  }

  // Calculate trend direction
  const trendDirection =
    analytics.scoreTrend.length > 1
      ? analytics.scoreTrend[analytics.scoreTrend.length - 1] -
        analytics.scoreTrend[0]
      : 0;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Exams */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Exams
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.totalExams}
          </p>
        </div>

        {/* Average Score */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Target className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Average Score
            </h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {analytics.averageScore}%
          </p>
        </div>

        {/* Trend */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-2">
            <div
              className={`p-2 rounded-lg ${
                trendDirection >= 0
                  ? 'bg-purple-100 dark:bg-purple-900/30'
                  : 'bg-orange-100 dark:bg-orange-900/30'
              }`}
            >
              <TrendingUp
                className={`w-5 h-5 ${
                  trendDirection >= 0
                    ? 'text-purple-600 dark:text-purple-400'
                    : 'text-orange-600 dark:text-orange-400 transform rotate-180'
                }`}
              />
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Performance Trend
            </h3>
          </div>
          <p className={`text-3xl font-bold ${
            trendDirection >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-orange-600 dark:text-orange-400'
          }`}>
            {trendDirection >= 0 ? '+' : ''}{Math.round(trendDirection)}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            From first to last exam
          </p>
        </div>
      </div>

      {/* Score Trend Chart */}
      {analytics.scoreTrend.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Score Trend (Last {analytics.scoreTrend.length} Exams)
          </h3>
          <div className="flex items-end justify-between h-40 gap-2">
            {analytics.scoreTrend.map((score, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div
                  className={`w-full rounded-t transition-all ${
                    score >= 80
                      ? 'bg-green-500 dark:bg-green-600'
                      : score >= 60
                      ? 'bg-blue-500 dark:bg-blue-600'
                      : score >= 40
                      ? 'bg-orange-500 dark:bg-orange-600'
                      : 'bg-red-500 dark:bg-red-600'
                  }`}
                  style={{ height: `${score}%` }}
                  title={`Exam ${index + 1}: ${score}%`}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {score}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject Performance */}
      {Object.keys(analytics.subjectPerformance).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Subject Performance
            </h3>
          </div>
          <div className="space-y-4">
            {Object.entries(analytics.subjectPerformance).map(([subject, performance]) => (
              <div key={subject}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {subject}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {performance.percentage}% ({performance.correct}/{performance.total})
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      performance.percentage >= 80
                        ? 'bg-green-500 dark:bg-green-600'
                        : performance.percentage >= 60
                        ? 'bg-blue-500 dark:bg-blue-600'
                        : performance.percentage >= 40
                        ? 'bg-orange-500 dark:bg-orange-600'
                        : 'bg-red-500 dark:bg-red-600'
                    }`}
                    style={{ width: `${performance.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Difficulty Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Performance by Difficulty
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {/* Easy */}
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
            <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
              Easy
            </p>
            <p className="text-2xl font-bold text-green-900 dark:text-green-100">
              {analytics.difficultyPerformance.easy}%
            </p>
          </div>

          {/* Medium */}
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
              Medium
            </p>
            <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {analytics.difficultyPerformance.medium}%
            </p>
          </div>

          {/* Hard */}
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
              Hard
            </p>
            <p className="text-2xl font-bold text-red-900 dark:text-red-100">
              {analytics.difficultyPerformance.hard}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
