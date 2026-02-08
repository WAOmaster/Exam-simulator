'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CalendarDays,
  CalendarRange,
  Clock,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface StudyPlanItem {
  title: string;
  description: string;
  category: string;
  priority: 'critical' | 'important' | 'recommended';
  estimatedMinutes: number;
}

interface ConceptBreakdown {
  concept: string;
  category: string;
  explanation: string;
  commonMistakes: string[];
  keyPoints: string[];
  practiceRecommendation: string;
}

interface StudyGuideData {
  overview: string;
  studyPlan: {
    immediate: StudyPlanItem[];
    shortTerm: StudyPlanItem[];
    longTerm: StudyPlanItem[];
  };
  conceptBreakdowns: ConceptBreakdown[];
  motivationalMessage: string;
  resources?: { title: string; url: string }[];
}

interface StudyPlanSectionProps {
  data: StudyGuideData | null;
  loading: boolean;
  error: string;
  onRetry: () => void;
}

const tabs = [
  { key: 'immediate' as const, label: 'Today', icon: Calendar },
  { key: 'shortTerm' as const, label: 'This Week', icon: CalendarDays },
  { key: 'longTerm' as const, label: 'This Month', icon: CalendarRange },
] as const;

const priorityStyles: Record<string, { bg: string; text: string; label: string }> = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    label: 'Critical',
  },
  important: {
    bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Important',
  },
  recommended: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Recommended',
  },
};

export default function StudyPlanSection({ data, loading, error, onRetry }: StudyPlanSectionProps) {
  const [activeTab, setActiveTab] = useState<'immediate' | 'shortTerm' | 'longTerm'>('immediate');

  if (loading) {
    return (
      <div className="p-8 rounded-xl border flex flex-col items-center justify-center" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
        <Loader2 className="w-8 h-8 hp-icon-cyan animate-spin" />
        <p className="mt-3 hp-text-secondary font-medium">Generating your personalized study plan...</p>
        <p className="text-xs hp-text-quaternary mt-1">Powered by Gemini AI</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-xl border border-red-200 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const currentItems = data.studyPlan[activeTab] || [];

  return (
    <div className="space-y-5">
      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-50/50 to-teal-50/50 dark:from-cyan-500/[0.04] dark:to-teal-500/[0.04]"
      >
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 hp-icon-cyan shrink-0 mt-0.5" />
          <div>
            <p className="hp-text-secondary leading-relaxed text-sm">{data.overview}</p>
            {data.motivationalMessage && (
              <p className="mt-2 text-xs font-medium text-cyan-600 dark:text-cyan-400 italic">
                &ldquo;{data.motivationalMessage}&rdquo;
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: 'var(--hp-surface-border)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-800 hp-text-primary shadow-sm'
                : 'hp-text-tertiary hover:hp-text-secondary'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Plan Items */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {currentItems.length === 0 ? (
            <p className="text-center py-6 hp-text-quaternary text-sm">No items for this period yet.</p>
          ) : (
            currentItems.map((item, i) => {
              const priority = priorityStyles[item.priority] || priorityStyles.recommended;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="p-4 rounded-xl border"
                  style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold hp-text-primary text-sm">{item.title}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-xs hp-text-tertiary leading-relaxed">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] hp-text-quaternary font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hp-surface-border)' }}>
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] hp-text-quaternary">
                          <Clock className="w-3 h-3" />
                          ~{item.estimatedMinutes} min
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>

      {/* Concept Breakdowns */}
      {data.conceptBreakdowns && data.conceptBreakdowns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <h3 className="text-sm font-semibold hp-text-primary flex items-center gap-2 px-1">
            <Sparkles className="w-4 h-4 hp-icon-purple" />
            Concept Deep Dives
          </h3>
          {data.conceptBreakdowns.map((cb, i) => (
            <div
              key={i}
              className="p-4 rounded-xl border"
              style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-semibold hp-text-primary text-sm">{cb.concept}</h4>
                <span className="text-[10px] hp-text-quaternary font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--hp-surface-border)' }}>
                  {cb.category}
                </span>
              </div>
              <p className="text-xs hp-text-secondary leading-relaxed mb-3">{cb.explanation}</p>

              {cb.keyPoints.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold hp-text-tertiary uppercase tracking-wider mb-1">Key Points</p>
                  <ul className="space-y-0.5">
                    {cb.keyPoints.map((point, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs hp-text-secondary">
                        <span className="text-cyan-500 mt-0.5">&#8226;</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {cb.commonMistakes.length > 0 && (
                <div className="mb-2">
                  <p className="text-[10px] font-semibold hp-text-tertiary uppercase tracking-wider mb-1">Common Mistakes</p>
                  <ul className="space-y-0.5">
                    {cb.commonMistakes.map((mistake, j) => (
                      <li key={j} className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        {mistake}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium mt-2">
                {cb.practiceRecommendation}
              </p>
            </div>
          ))}
        </motion.div>
      )}

      {/* Resources */}
      {data.resources && data.resources.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-4 rounded-xl border"
          style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
        >
          <h3 className="text-sm font-semibold hp-text-primary mb-3">Study Resources</h3>
          <div className="space-y-2">
            {data.resources.map((resource, i) => (
              <a
                key={i}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{resource.title}</span>
              </a>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
