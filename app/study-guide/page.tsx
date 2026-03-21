'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  BarChart2,
  Sparkles,
  Image as ImageIcon,
  GraduationCap,
  Brain,
  Play,
  Zap,
} from 'lucide-react';
import { getSessionHistory, getWeakCategories, getStrongCategories, getOverallStats, getRecentTrend } from '@/lib/sessionHistory';
import { getDiagnosisSummary, getWeakConceptsFromDiagnoses } from '@/lib/diagnosisHistory';
import PerformanceDashboard from '@/components/StudyGuide/PerformanceDashboard';
import StudyPlanSection from '@/components/StudyGuide/StudyPlanSection';
import VisualConcepts from '@/components/StudyGuide/VisualConcepts';
import InteractiveModules from '@/components/StudyGuide/InteractiveModules';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

export default function StudyGuidePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Data state
  const [sessions, setSessions] = useState<any[]>([]);
  const [overallStats, setOverallStats] = useState<any>(null);
  const [weakCategories, setWeakCategories] = useState<any[]>([]);
  const [strongCategories, setStrongCategories] = useState<any[]>([]);
  const [trend, setTrend] = useState<'improving' | 'declining' | 'stable'>('stable');
  const [diagnosisSummary, setDiagnosisSummary] = useState<any>(null);
  const [weakConcepts, setWeakConcepts] = useState<any[]>([]);

  // AI Study Plan state
  const [studyGuideData, setStudyGuideData] = useState<any>(null);
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideError, setStudyGuideError] = useState('');

  useEffect(() => {
    setMounted(true);
    // Load all data from localStorage
    const sessionData = getSessionHistory();
    const stats = getOverallStats();
    const weak = getWeakCategories();
    const strong = getStrongCategories();
    const recentTrend = getRecentTrend();
    const diagSummary = getDiagnosisSummary();
    const concepts = getWeakConceptsFromDiagnoses();

    setSessions(sessionData);
    setOverallStats(stats);
    setWeakCategories(weak);
    setStrongCategories(strong);
    setTrend(recentTrend);
    setDiagnosisSummary(diagSummary);
    setWeakConcepts(concepts);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    setMousePos({
      x: (e.clientX / window.innerWidth - 0.5) * 20,
      y: (e.clientY / window.innerHeight - 0.5) * 20,
    });
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  const fetchStudyGuide = useCallback(async () => {
    if (!overallStats) return;
    setStudyGuideLoading(true);
    setStudyGuideError('');

    try {
      const response = await fetch('/api/ai/study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overallStats,
          weakCategories,
          strongCategories,
          trend,
          diagnosisSummary,
          weakConcepts: weakConcepts.slice(0, 5),
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate');
      setStudyGuideData(data.studyGuide);
    } catch (err: any) {
      setStudyGuideError(err.message || 'Failed to generate study guide');
    } finally {
      setStudyGuideLoading(false);
    }
  }, [overallStats, weakCategories, strongCategories, trend, diagnosisSummary, weakConcepts]);

  // Auto-fetch study guide once data is loaded
  useEffect(() => {
    if (mounted && overallStats && !studyGuideData && !studyGuideLoading) {
      fetchStudyGuide();
    }
  }, [mounted, overallStats, studyGuideData, studyGuideLoading, fetchStudyGuide]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center hp-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
      </div>
    );
  }

  const isEmpty = sessions.length === 0;

  return (
    <div className="min-h-screen relative overflow-hidden hp-bg">
      {/* ===== Ambient Background ===== */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute w-[700px] h-[700px] rounded-full animate-pulse-glow"
          style={{
            top: '-10%',
            right: '-10%',
            background: 'radial-gradient(circle, var(--hp-orb-indigo) 0%, var(--hp-orb-indigo-outer) 40%, transparent 70%)',
            transform: `translate(${mousePos.x * 0.3}px, ${mousePos.y * 0.3}px)`,
            transition: 'transform 0.8s ease-out',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-pulse-glow"
          style={{
            bottom: '5%',
            left: '-8%',
            background: 'radial-gradient(circle, var(--hp-orb-pink) 0%, var(--hp-orb-pink-outer) 40%, transparent 70%)',
            animationDelay: '2s',
            transform: `translate(${mousePos.x * -0.2}px, ${mousePos.y * -0.2}px)`,
            transition: 'transform 0.8s ease-out',
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            top: '50%',
            left: '50%',
            background: 'radial-gradient(circle, var(--hp-orb-cyan) 0%, transparent 60%)',
            transform: `translate(-50%, -50%) translate(${mousePos.x * 0.15}px, ${mousePos.y * 0.15}px)`,
            transition: 'transform 1s ease-out',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--hp-grid-line) 1px, transparent 1px),
                              linear-gradient(90deg, var(--hp-grid-line) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-0 left-0 right-0 h-40" style={{ background: `linear-gradient(to bottom, var(--hp-bg), transparent)` }} />
      </div>

      <div className="fixed inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

      {/* ===== Main Content ===== */}
      <div className="relative z-10">
        {/* Header */}
        <section className="px-3 sm:px-4 pt-4 sm:pt-8 pb-4 sm:pb-6">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6"
            >
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl border transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 flex-shrink-0"
                style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 hp-text-secondary" />
              </button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 hp-icon-cyan" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl font-bold hp-text-primary">Study Guide</h1>
                  <p className="text-[10px] sm:text-xs hp-text-quaternary hidden sm:block">Personalized learning based on your performance</p>
                </div>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border flex-shrink-0" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs hp-text-tertiary font-medium">Powered by Gemini</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Empty State */}
        {isEmpty ? (
          <section className="px-4 pb-20">
            <div className="max-w-2xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-12 rounded-3xl border text-center"
                style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)', boxShadow: 'var(--hp-card-shadow)' }}
              >
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15 flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-10 h-10 hp-icon-cyan" />
                </div>
                <h2 className="text-xl font-bold hp-text-primary mb-3">No Data Yet</h2>
                <p className="hp-text-tertiary text-sm max-w-md mx-auto mb-6 leading-relaxed">
                  Complete your first practice exam to unlock personalized study recommendations.
                  Enable Cognitive Companion for deeper insights into your learning patterns.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/generate')}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-semibold rounded-xl transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate Questions
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border font-semibold hp-text-secondary transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                    style={{ borderColor: 'var(--hp-surface-border)' }}
                  >
                    <Play className="w-4 h-4" />
                    Start Practice
                  </button>
                </div>
              </motion.div>
            </div>
          </section>
        ) : (
          /* Content Sections */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="px-4 pb-20 space-y-8"
          >
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Section 1: Performance Dashboard */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/10 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 hp-icon-indigo" />
                  </div>
                  <h2 className="text-xl font-bold hp-text-primary">Performance Overview</h2>
                </div>
                <PerformanceDashboard
                  sessions={sessions}
                  overallStats={overallStats}
                  weakCategories={weakCategories}
                  strongCategories={strongCategories}
                  trend={trend}
                />
              </motion.section>

              {/* Section 2: AI Study Plan */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 hp-icon-cyan" />
                  </div>
                  <h2 className="text-xl font-bold hp-text-primary">AI Study Plan</h2>
                </div>
                <StudyPlanSection
                  data={studyGuideData}
                  loading={studyGuideLoading}
                  error={studyGuideError}
                  onRetry={fetchStudyGuide}
                />
              </motion.section>

              {/* Section 3: Visual Concepts */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-500/10 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 hp-icon-amber" />
                  </div>
                  <h2 className="text-xl font-bold hp-text-primary">Visual Concepts</h2>
                  <span className="text-xs hp-text-quaternary">AI-generated diagrams for weak areas</span>
                </div>
                <VisualConcepts
                  weakConcepts={weakConcepts}
                  weakCategories={weakCategories}
                />
              </motion.section>

              {/* Section 4: Interactive Modules */}
              <motion.section variants={itemVariants}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20 border border-emerald-500/10 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 hp-icon-emerald" />
                  </div>
                  <h2 className="text-xl font-bold hp-text-primary">Interactive Learning</h2>
                  <span className="text-xs hp-text-quaternary">Targeted modules for your weak areas</span>
                </div>
                <InteractiveModules
                  weakConcepts={weakConcepts}
                  weakCategories={weakCategories}
                />
              </motion.section>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
