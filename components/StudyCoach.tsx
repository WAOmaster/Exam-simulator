'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  GraduationCap,
  Sparkles,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Calendar,
  Loader2,
} from 'lucide-react';
import { getSessionHistory, SessionRecord } from '@/lib/sessionHistory';

interface CoachingData {
  tone: 'encouraging' | 'challenging' | 'supportive';
  message: string;
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    action: string;
    reason: string;
  }[];
  focusAreas?: string[];
  strengths?: string[];
  studyPlan?: {
    today: string[];
    thisWeek: string[];
    goals: string[];
  };
}

interface StudyCoachProps {
  mode: 'pre_exam' | 'during_exam' | 'post_exam';
  subject?: string;
  currentMetrics?: {
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
    currentScore: number;
    questionsAnswered: number;
    totalQuestions: number;
  };
  latestScore?: { correct: number; total: number; percentage: number };
  onClose?: () => void;
  inline?: boolean; // Show inline instead of as side pane
}

export default function StudyCoach({
  mode,
  subject,
  currentMetrics,
  latestScore,
  onClose,
  inline = false,
}: StudyCoachProps) {
  const [coaching, setCoaching] = useState<CoachingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStudyPlan, setShowStudyPlan] = useState(false);

  const fetchCoaching = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const sessionHistory = getSessionHistory();

      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          sessionHistory,
          currentMetrics,
          subject,
          latestScore,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get coaching');
      }

      setCoaching(data.coaching);
    } catch (err: any) {
      setError(err.message || 'Failed to get coaching advice');
    } finally {
      setLoading(false);
    }
  }, [mode, subject, currentMetrics, latestScore]);

  useEffect(() => {
    fetchCoaching();
  }, [fetchCoaching]);

  const getToneColor = (tone: string) => {
    switch (tone) {
      case 'encouraging':
        return 'from-green-500 to-emerald-500';
      case 'challenging':
        return 'from-orange-500 to-amber-500';
      case 'supportive':
        return 'from-blue-500 to-indigo-500';
      default:
        return 'from-purple-500 to-pink-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
      case 'low':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const Content = () => (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-gradient-to-r ${coaching ? getToneColor(coaching.tone) : 'from-purple-500 to-pink-500'}`}>
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              Study Coach
              <Sparkles className="w-4 h-4 text-purple-500" />
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mode === 'pre_exam' && 'Pre-Exam Prep'}
              {mode === 'during_exam' && 'Real-time Support'}
              {mode === 'post_exam' && 'Post-Exam Analysis'}
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          <p className="mt-3 text-gray-600 dark:text-gray-400">
            Getting personalized advice...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Coaching Content */}
      {coaching && (
        <>
          {/* Main Message */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg bg-gradient-to-r ${getToneColor(coaching.tone)} bg-opacity-10`}
            style={{
              background: `linear-gradient(135deg, ${
                coaching.tone === 'encouraging' ? 'rgba(34, 197, 94, 0.1)' :
                coaching.tone === 'challenging' ? 'rgba(249, 115, 22, 0.1)' :
                'rgba(59, 130, 246, 0.1)'
              } 0%, ${
                coaching.tone === 'encouraging' ? 'rgba(16, 185, 129, 0.1)' :
                coaching.tone === 'challenging' ? 'rgba(245, 158, 11, 0.1)' :
                'rgba(99, 102, 241, 0.1)'
              } 100%)`
            }}
          >
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {coaching.message}
            </p>
          </motion.div>

          {/* Strengths */}
          {coaching.strengths && coaching.strengths.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Your Strengths
              </h3>
              <div className="flex flex-wrap gap-2">
                {coaching.strengths.map((strength, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm"
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Focus Areas */}
          {coaching.focusAreas && coaching.focusAreas.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                Focus Areas
              </h3>
              <div className="flex flex-wrap gap-2">
                {coaching.focusAreas.map((area, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm"
                  >
                    {area}
                  </span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Recommendations */}
          {coaching.recommendations && coaching.recommendations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                Recommendations
              </h3>
              <div className="space-y-2">
                {coaching.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${getPriorityColor(rec.priority)}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold uppercase px-1.5 py-0.5 rounded">
                        {rec.priority}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{rec.action}</p>
                        <p className="text-xs opacity-80 mt-0.5">{rec.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Study Plan (post_exam only) */}
          {coaching.studyPlan && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                onClick={() => setShowStudyPlan(!showStudyPlan)}
                className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-800 dark:text-purple-200">
                    Your Study Plan
                  </span>
                </div>
                {showStudyPlan ? (
                  <ChevronUp className="w-4 h-4 text-purple-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-purple-600" />
                )}
              </button>

              <AnimatePresence>
                {showStudyPlan && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-4">
                      {/* Today */}
                      {coaching.studyPlan.today.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            Today
                          </p>
                          <ul className="space-y-1">
                            {coaching.studyPlan.today.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-purple-500 mt-1">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* This Week */}
                      {coaching.studyPlan.thisWeek.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            This Week
                          </p>
                          <ul className="space-y-1">
                            {coaching.studyPlan.thisWeek.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <span className="text-purple-500 mt-1">•</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Goals */}
                      {coaching.studyPlan.goals.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                            Goals
                          </p>
                          <ul className="space-y-1">
                            {coaching.studyPlan.goals.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                                <Target className="w-3 h-3 text-purple-500 mt-1 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Content />
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 h-full w-full lg:w-1/3 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
      >
        <Content />
      </motion.div>
    </AnimatePresence>
  );
}
