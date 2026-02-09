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
  Target,
  Flame,
  TrendingUp,
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

const priorityStyles: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  critical: {
    bg: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-300',
    label: 'Critical',
    dot: 'bg-red-500',
  },
  important: {
    bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'Important',
    dot: 'bg-amber-500',
  },
  recommended: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-300',
    label: 'Recommended',
    dot: 'bg-emerald-500',
  },
};

function getTabSummary(items: StudyPlanItem[]) {
  if (items.length === 0) return null;

  const priorityOrder = ['critical', 'important', 'recommended'];
  const sorted = [...items].sort(
    (a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );
  const topItem = sorted[0];
  const totalMinutes = items.reduce((sum, item) => sum + (item.estimatedMinutes || 0), 0);
  const priorityCounts = {
    critical: items.filter((i) => i.priority === 'critical').length,
    important: items.filter((i) => i.priority === 'important').length,
    recommended: items.filter((i) => i.priority === 'recommended').length,
  };
  const categories = [...new Set(items.map((i) => i.category))];

  return {
    primaryFocus: topItem.title,
    keyAction: topItem.description,
    totalMinutes,
    priorityCounts,
    categories,
    itemCount: items.length,
  };
}

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
  const summary = getTabSummary(currentItems);

  // Get item counts for tab badges
  const tabCounts = {
    immediate: (data.studyPlan.immediate || []).length,
    shortTerm: (data.studyPlan.shortTerm || []).length,
    longTerm: (data.studyPlan.longTerm || []).length,
  };

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

      {/* Tabs with item counts */}
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
            {tabCounts[tab.key] > 0 && (
              <span className={`text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full font-bold ${
                activeTab === tab.key
                  ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300'
                  : 'bg-gray-200 dark:bg-gray-700 hp-text-quaternary'
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Summary Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`summary-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {summary && (
            <div className="p-4 rounded-xl border border-cyan-500/10 bg-gradient-to-br from-cyan-50/80 to-teal-50/80 dark:from-cyan-500/[0.06] dark:to-teal-500/[0.06]">
              <div className="grid grid-cols-2 gap-3">
                {/* Primary Focus */}
                <div className="col-span-2 flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/20 flex items-center justify-center shrink-0">
                    <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-cyan-600/70 dark:text-cyan-400/70">Primary Focus</p>
                    <p className="text-sm font-semibold hp-text-primary truncate">{summary.primaryFocus}</p>
                    <p className="text-xs hp-text-tertiary mt-0.5 line-clamp-2">{summary.keyAction}</p>
                  </div>
                </div>

                {/* Total Time */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 dark:bg-gray-800/40 border border-white/50 dark:border-gray-700/30">
                  <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold hp-text-quaternary">Est. Time</p>
                    <p className="text-sm font-bold hp-text-primary">
                      {summary.totalMinutes >= 60
                        ? `${Math.floor(summary.totalMinutes / 60)}h ${summary.totalMinutes % 60}m`
                        : `${summary.totalMinutes} min`}
                    </p>
                  </div>
                </div>

                {/* Priority Breakdown */}
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-white/60 dark:bg-gray-800/40 border border-white/50 dark:border-gray-700/30">
                  <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold hp-text-quaternary">Priority</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {summary.priorityCounts.critical > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          {summary.priorityCounts.critical}
                        </span>
                      )}
                      {summary.priorityCounts.important > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {summary.priorityCounts.important}
                        </span>
                      )}
                      {summary.priorityCounts.recommended > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {summary.priorityCounts.recommended}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Categories */}
                {summary.categories.length > 0 && (
                  <div className="col-span-2 flex items-center gap-1.5 flex-wrap">
                    <Flame className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    {summary.categories.slice(0, 4).map((cat, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-cyan-100/60 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200/50 dark:border-cyan-700/30">
                        {cat}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

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
                        <span className={`w-2 h-2 rounded-full shrink-0 ${priority.dot}`} />
                        <h4 className="font-semibold hp-text-primary text-sm">{item.title}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${priority.bg} ${priority.text}`}>
                          {priority.label}
                        </span>
                      </div>
                      <p className="text-xs hp-text-tertiary leading-relaxed ml-4">{item.description}</p>
                      <div className="flex items-center gap-3 mt-2 ml-4">
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
