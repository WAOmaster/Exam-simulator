'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Trophy,
  Brain,
  Sparkles,
  Play,
  BarChart3,
  Atom,
  Code,
  Cog,
  Palette,
  Calculator,
  Cloud,
  CheckCircle,
  ChevronRight,
  Wand2,
  BookMarked,
  Zap,
  ArrowRight,
  Timer,
  Eye,
  GraduationCap,
  Layers,
  Star,
  MessageCircle,
  Camera,
} from 'lucide-react';
import subjects from '@/data/default-questions/subjects.json';

const iconMap: Record<string, any> = {
  Atom, Code, Cog, Palette, Calculator, Cloud,
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

// Color accent config for subject cards (light/dark adaptive via CSS classes)
const subjectAccents: Record<string, {
  glowDark: string;
  glowLight: string;
  iconClass: string;
  borderSelected: string;
  bgIcon: string;
  checkClass: string;
}> = {
  science: { glowDark: 'rgba(16,185,129,0.15)', glowLight: 'rgba(16,185,129,0.08)', iconClass: 'hp-icon-emerald', borderSelected: 'border-emerald-500/30 dark:border-emerald-500/30', bgIcon: 'from-emerald-500/10 to-green-500/10 dark:from-emerald-500/20 dark:to-green-500/20', checkClass: 'text-emerald-600 dark:text-emerald-400' },
  technology: { glowDark: 'rgba(59,130,246,0.15)', glowLight: 'rgba(59,130,246,0.08)', iconClass: 'hp-icon-blue', borderSelected: 'border-blue-500/30 dark:border-blue-500/30', bgIcon: 'from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20', checkClass: 'text-blue-600 dark:text-blue-400' },
  engineering: { glowDark: 'rgba(249,115,22,0.15)', glowLight: 'rgba(249,115,22,0.08)', iconClass: 'hp-icon-orange', borderSelected: 'border-orange-500/30 dark:border-orange-500/30', bgIcon: 'from-orange-500/10 to-amber-500/10 dark:from-orange-500/20 dark:to-amber-500/20', checkClass: 'text-orange-600 dark:text-orange-400' },
  arts: { glowDark: 'rgba(168,85,247,0.15)', glowLight: 'rgba(168,85,247,0.08)', iconClass: 'hp-icon-purple', borderSelected: 'border-purple-500/30 dark:border-purple-500/30', bgIcon: 'from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20', checkClass: 'text-purple-600 dark:text-purple-400' },
  mathematics: { glowDark: 'rgba(244,63,94,0.15)', glowLight: 'rgba(244,63,94,0.08)', iconClass: 'hp-icon-rose', borderSelected: 'border-rose-500/30 dark:border-rose-500/30', bgIcon: 'from-rose-500/10 to-red-500/10 dark:from-rose-500/20 dark:to-red-500/20', checkClass: 'text-rose-600 dark:text-rose-400' },
  oci: { glowDark: 'rgba(99,102,241,0.15)', glowLight: 'rgba(99,102,241,0.08)', iconClass: 'hp-icon-indigo', borderSelected: 'border-indigo-500/30 dark:border-indigo-500/30', bgIcon: 'from-indigo-500/10 to-blue-500/10 dark:from-indigo-500/20 dark:to-blue-500/20', checkClass: 'text-indigo-600 dark:text-indigo-400' },
};

export default function Home() {
  const router = useRouter();
  const { startExam, resetExam, getScore, isExamCompleted, setQuestions } = useExamStore();
  const [examDuration, setExamDuration] = useState(90);
  const [mode, setMode] = useState<'practice' | 'exam'>('exam');
  const [useTimer, setUseTimer] = useState(true);
  const [learnWithAI, setLearnWithAI] = useState(false);
  const [reviewAnswers, setReviewAnswers] = useState(false);
  const [cognitiveCompanion, setCognitiveCompanion] = useState(false);
  const [socraticMode, setSocraticMode] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loadedQuestions, setLoadedQuestions] = useState<any[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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

  useEffect(() => {
    if (selectedSubject) {
      const subject = subjects.find((s) => s.id === selectedSubject);
      if (subject) {
        import(`@/data/default-questions/${subject.file}`)
          .then((module) => setLoadedQuestions(module.default))
          .catch((err) => console.error('Failed to load questions:', err));
      }
    }
  }, [selectedSubject]);

  const handleStart = () => {
    if (!selectedSubject || loadedQuestions.length === 0) {
      alert('Please select a subject first!');
      return;
    }
    resetExam();
    setQuestions(loadedQuestions);
    startExam(examDuration, mode, useTimer, learnWithAI, reviewAnswers, cognitiveCompanion, socraticMode);
    router.push(mode === 'practice' ? '/practice' : '/exam');
  };

  const score = isExamCompleted ? getScore() : null;
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="min-h-screen relative overflow-hidden hp-bg">
      {/* ===== Ambient Background ===== */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {/* Primary orb - indigo */}
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
        {/* Secondary orb - pink */}
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
        {/* Accent orb - cyan */}
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
        {/* Grid pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(var(--hp-grid-line) 1px, transparent 1px),
                              linear-gradient(90deg, var(--hp-grid-line) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-40" style={{ background: `linear-gradient(to bottom, var(--hp-bg), transparent)` }} />
      </div>

      {/* Grain texture */}
      <div className="fixed inset-0 pointer-events-none grain-overlay" aria-hidden="true" />

      {/* ===== Main Content ===== */}
      <div className="relative z-10">
        {/* ===== HERO SECTION ===== */}
        <section className="relative pt-20 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            {/* Orbiting elements around logo */}
            <div className="relative inline-block mb-8">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-orbit">
                  <Star className="w-4 h-4 text-indigo-400/60 dark:text-indigo-400/60" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-orbit-reverse">
                  <Sparkles className="w-3 h-3 text-pink-400/50 dark:text-pink-400/50" />
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[2px] animate-float">
                  <div className="w-full h-full rounded-3xl flex items-center justify-center" style={{ backgroundColor: 'var(--hp-logo-inner)' }}>
                    <GraduationCap className="w-12 h-12 hp-icon-indigo" />
                  </div>
                </div>
                {/* Glow behind logo */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 blur-2xl opacity-20 dark:opacity-30" />
              </motion.div>
            </div>

            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              <h1 className="text-6xl md:text-7xl font-extrabold tracking-tight mb-4">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-900 to-gray-700 dark:from-white dark:via-white dark:to-white/70">
                  Exam
                </span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 animate-gradient-shift" style={{ backgroundSize: '200% 200%' }}>
                  Simulator
                </span>
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.6 }}
              className="text-lg md:text-xl hp-text-tertiary max-w-xl mx-auto mb-3 font-light"
            >
              AI-powered practice exams that adapt to your learning
            </motion.p>

            {/* Powered by badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.5 }}
              className="flex items-center justify-center gap-2 mb-12"
            >
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
                <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span className="text-xs hp-text-tertiary font-medium tracking-wide uppercase">Powered by Google Gemini</span>
              </div>
            </motion.div>

            {/* ===== ACTION CARDS ===== */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-6"
            >
              {/* Generate Questions */}
              <motion.button
                variants={itemVariants}
                onClick={() => router.push('/generate')}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.97 }}
                className="action-card-shine group relative p-6 rounded-2xl border backdrop-blur-sm text-left transition-all duration-300 hover:border-indigo-500/30"
                style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)', boxShadow: 'var(--hp-card-shadow)' }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 dark:from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-500/10 flex items-center justify-center mb-4 group-hover:border-indigo-500/30 transition-colors">
                    <Wand2 className="w-6 h-6 hp-icon-indigo" />
                  </div>
                  <h3 className="text-lg font-semibold hp-text-primary mb-1">Generate Questions</h3>
                  <p className="text-sm hp-text-tertiary leading-relaxed">Create custom exams from files, URLs, or any content</p>
                  <div className="flex items-center gap-1.5 mt-4 text-indigo-600 dark:text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Get started</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>

              {/* My Library */}
              <motion.button
                variants={itemVariants}
                onClick={() => router.push('/library')}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.97 }}
                className="action-card-shine group relative p-6 rounded-2xl border backdrop-blur-sm text-left transition-all duration-300 hover:border-emerald-500/30"
                style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)', boxShadow: 'var(--hp-card-shadow)' }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 dark:from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20 border border-emerald-500/10 flex items-center justify-center mb-4 group-hover:border-emerald-500/30 transition-colors">
                    <BookMarked className="w-6 h-6 hp-icon-emerald" />
                  </div>
                  <h3 className="text-lg font-semibold hp-text-primary mb-1">My Library</h3>
                  <p className="text-sm hp-text-tertiary leading-relaxed">Browse and manage your saved question sets</p>
                  <div className="flex items-center gap-1.5 mt-4 text-emerald-600 dark:text-emerald-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Browse sets</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>

              {/* Visual Solver */}
              <motion.button
                variants={itemVariants}
                onClick={() => router.push('/generate')}
                whileHover={{ y: -6, transition: { duration: 0.3 } }}
                whileTap={{ scale: 0.97 }}
                className="action-card-shine group relative p-6 rounded-2xl border backdrop-blur-sm text-left transition-all duration-300 hover:border-amber-500/30"
                style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)', boxShadow: 'var(--hp-card-shadow)' }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 dark:from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-500/10 flex items-center justify-center mb-4 group-hover:border-amber-500/30 transition-colors">
                    <Camera className="w-6 h-6 hp-icon-amber" />
                  </div>
                  <h3 className="text-lg font-semibold hp-text-primary mb-1">Visual Solver</h3>
                  <p className="text-sm hp-text-tertiary leading-relaxed">Upload images for AI-powered solutions</p>
                  <div className="flex items-center gap-1.5 mt-4 text-amber-600 dark:text-amber-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Upload image</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.button>
            </motion.div>
          </div>
        </section>

        {/* ===== EXPLORE SUBJECTS ===== */}
        <section className="relative px-4 pb-12">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.6 }}
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20 border border-purple-500/10 flex items-center justify-center">
                  <Layers className="w-4 h-4 hp-icon-purple" />
                </div>
                <h2 className="text-2xl font-bold hp-text-primary">Explore Subjects</h2>
              </div>
              <p className="hp-text-tertiary mb-8 ml-11 text-sm">
                Jump into pre-built question sets to experience the platform
              </p>

              {/* Subject Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subjects.map((subject, i) => {
                  const Icon = iconMap[subject.icon] || FileText;
                  const isSelected = selectedSubject === subject.id;
                  const accent = subjectAccents[subject.id] || subjectAccents.technology;

                  return (
                    <motion.button
                      key={subject.id}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.06, duration: 0.4 }}
                      whileHover={{ y: -3, transition: { duration: 0.25 } }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSubject(subject.id)}
                      className={`subject-card relative p-5 rounded-2xl text-left transition-all duration-300 ${
                        isSelected
                          ? `border-2 ${accent.borderSelected}`
                          : 'border'
                      }`}
                      style={isSelected ? {
                        backgroundColor: 'var(--hp-surface-hover)',
                        boxShadow: 'var(--hp-card-shadow-hover)',
                      } : {
                        borderColor: 'var(--hp-surface-border)',
                        backgroundColor: 'var(--hp-surface)',
                        boxShadow: 'var(--hp-card-shadow)',
                      }}
                    >
                      {/* Selected glow (dark mode only, light mode uses shadow instead) */}
                      {isSelected && (
                        <div
                          className="absolute inset-0 rounded-2xl opacity-0 dark:opacity-40 blur-xl pointer-events-none"
                          style={{ background: accent.glowDark }}
                        />
                      )}

                      <div className="relative z-10 flex items-start gap-4">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${accent.bgIcon} border ${isSelected ? accent.borderSelected : ''} flex items-center justify-center shrink-0 transition-colors`} style={!isSelected ? { borderColor: 'var(--hp-surface-border)' } : {}}>
                          <Icon className={`w-5 h-5 ${accent.iconClass}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold hp-text-primary text-[15px]">{subject.name}</h3>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                              >
                                <CheckCircle className={`w-5 h-5 ${accent.checkClass}`} />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-sm hp-text-tertiary mb-3 leading-relaxed">{subject.description}</p>
                          <div className="flex items-center gap-2.5">
                            <span className="text-xs hp-text-quaternary font-medium">{subject.questionCount} questions</span>
                            <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--hp-text-quaternary)' }} />
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isSelected ? 'bg-black/5 dark:bg-white/10 hp-text-secondary' : 'hp-text-quaternary'}`} style={!isSelected ? { backgroundColor: 'var(--hp-surface)' } : {}}>
                              {subject.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* ===== CONFIGURATION PANEL ===== */}
        <AnimatePresence>
          {selectedSubject && selectedSubjectData && (
            <motion.section
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="relative px-4 pb-20"
            >
              <div className="max-w-4xl mx-auto">
                <div className="relative rounded-3xl border backdrop-blur-sm overflow-hidden" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)', boxShadow: 'var(--hp-card-shadow)' }}>
                  {/* Top gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

                  {/* Stats bar */}
                  <div className="grid grid-cols-3 gap-0 border-b" style={{ borderColor: 'var(--hp-surface-border)' }}>
                    {[
                      { icon: FileText, label: 'Questions', value: loadedQuestions.length.toString(), iconClass: 'hp-icon-indigo' },
                      { icon: iconMap[selectedSubjectData.icon] || FileText, label: 'Subject', value: selectedSubjectData.name, iconClass: 'hp-icon-emerald' },
                      { icon: Brain, label: 'AI Powered', value: 'Gemini', iconClass: 'hp-icon-purple' },
                    ].map((stat, i) => (
                      <div key={i} className={`p-5 flex items-center gap-3 ${i < 2 ? 'border-r' : ''}`} style={i < 2 ? { borderColor: 'var(--hp-surface-border)' } : {}}>
                        <stat.icon className={`w-5 h-5 ${stat.iconClass} shrink-0`} />
                        <div className="min-w-0">
                          <p className="text-lg font-bold hp-text-primary truncate">{stat.value}</p>
                          <p className="text-xs hp-text-quaternary">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Previous Score */}
                    {isExamCompleted && score && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/[0.05]"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 hp-icon-emerald" />
                          </div>
                          <div>
                            <p className="text-xs hp-text-tertiary font-medium mb-0.5">Previous Score</p>
                            <p className="text-2xl font-bold hp-text-primary">
                              {score.correct}/{score.total}
                              <span className="text-base ml-2 text-emerald-600 dark:text-emerald-400">({score.percentage}%)</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => router.push('/results')}
                          className="px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors"
                        >
                          View Results
                        </button>
                      </motion.div>
                    )}

                    {/* Mode Selector */}
                    <div>
                      <label className="block text-sm font-medium hp-text-tertiary mb-3 tracking-wide uppercase">Mode</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'practice' as const, icon: Brain, title: 'Practice', desc: 'Instant AI feedback', iconClass: 'hp-icon-indigo', activeClasses: 'border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-500/[0.06]', dotClass: 'bg-indigo-500 dark:bg-indigo-400' },
                          { key: 'exam' as const, icon: Trophy, title: 'Exam', desc: 'Timed simulation', iconClass: 'hp-icon-amber', activeClasses: 'border-amber-500/30 bg-amber-50/50 dark:bg-amber-500/[0.06]', dotClass: 'bg-amber-500 dark:bg-amber-400' },
                        ].map((m) => (
                          <button
                            key={m.key}
                            onClick={() => setMode(m.key)}
                            className={`relative p-4 rounded-xl border text-left transition-all duration-300 ${
                              mode === m.key
                                ? m.activeClasses
                                : ''
                            }`}
                            style={mode !== m.key ? { borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' } : {}}
                          >
                            <div className="flex items-center gap-3">
                              <m.icon className={`w-5 h-5 ${mode === m.key ? m.iconClass : 'hp-text-quaternary'}`} />
                              <div>
                                <h3 className={`font-semibold text-sm ${mode === m.key ? 'hp-text-primary' : 'hp-text-secondary'}`}>
                                  {m.title} Mode
                                </h3>
                                <p className="text-xs hp-text-quaternary mt-0.5">{m.desc}</p>
                              </div>
                            </div>
                            {mode === m.key && (
                              <motion.div
                                layoutId="mode-indicator"
                                className={`absolute top-3 right-3 w-2 h-2 rounded-full ${m.dotClass}`}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Toggle Group */}
                    <div className="space-y-3">
                      {/* Timer Toggle */}
                      <div className="flex items-center justify-between p-4 rounded-xl border" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
                        <div className="flex items-center gap-3">
                          <Timer className="w-5 h-5 hp-icon-cyan" />
                          <div>
                            <h3 className="text-sm font-semibold hp-text-primary">Countdown Timer</h3>
                            <p className="text-xs hp-text-quaternary mt-0.5">
                              {useTimer ? `${examDuration} minute limit` : 'No time limit'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setUseTimer(!useTimer)}
                          className={`toggle-switch relative w-12 h-7 rounded-full transition-colors ${
                            useTimer ? 'bg-cyan-500' : ''
                          }`}
                          style={!useTimer ? { backgroundColor: 'var(--hp-toggle-off)' } : {}}
                        >
                          <div
                            className={`toggle-knob absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg ${
                              useTimer ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Learn with AI (Practice only) */}
                      <AnimatePresence>
                        {mode === 'practice' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between p-4 rounded-xl border border-purple-500/15 bg-purple-50/30 dark:bg-purple-500/[0.03]">
                              <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5 hp-icon-purple" />
                                <div>
                                  <h3 className="text-sm font-semibold hp-text-primary">Learn with AI</h3>
                                  <p className="text-xs hp-text-quaternary mt-0.5">Deep learning guides for each question</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setLearnWithAI(!learnWithAI)}
                                className={`toggle-switch relative w-12 h-7 rounded-full transition-colors ${
                                  learnWithAI ? 'bg-purple-500' : ''
                                }`}
                                style={!learnWithAI ? { backgroundColor: 'var(--hp-toggle-off)' } : {}}
                              >
                                <div
                                  className={`toggle-knob absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg ${
                                    learnWithAI ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Review Answers (Exam only) */}
                      <AnimatePresence>
                        {mode === 'exam' && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <div className="flex items-center justify-between p-4 rounded-xl border border-emerald-500/15 bg-emerald-50/30 dark:bg-emerald-500/[0.03]">
                              <div className="flex items-center gap-3">
                                <Eye className="w-5 h-5 hp-icon-emerald" />
                                <div>
                                  <h3 className="text-sm font-semibold hp-text-primary">Review Answers</h3>
                                  <p className="text-xs hp-text-quaternary mt-0.5">See explanations during exam</p>
                                </div>
                              </div>
                              <button
                                onClick={() => setReviewAnswers(!reviewAnswers)}
                                className={`toggle-switch relative w-12 h-7 rounded-full transition-colors ${
                                  reviewAnswers ? 'bg-emerald-500' : ''
                                }`}
                                style={!reviewAnswers ? { backgroundColor: 'var(--hp-toggle-off)' } : {}}
                              >
                                <div
                                  className={`toggle-knob absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg ${
                                    reviewAnswers ? 'translate-x-5' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Cognitive Companion (Both Modes) */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-amber-500/15 bg-amber-50/30 dark:bg-amber-500/[0.03]">
                        <div className="flex items-center gap-3">
                          <Brain className="w-5 h-5 hp-icon-amber" />
                          <div>
                            <h3 className="text-sm font-semibold hp-text-primary">Cognitive Companion</h3>
                            <p className="text-xs hp-text-quaternary mt-0.5">AI diagnoses why you got it wrong</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCognitiveCompanion(!cognitiveCompanion)}
                          className={`toggle-switch relative w-12 h-7 rounded-full transition-colors ${
                            cognitiveCompanion ? 'bg-amber-500' : ''
                          }`}
                          style={!cognitiveCompanion ? { backgroundColor: 'var(--hp-toggle-off)' } : {}}
                        >
                          <div
                            className={`toggle-knob absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg ${
                              cognitiveCompanion ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Socratic Dialogue (Both Modes) */}
                      <div className="flex items-center justify-between p-4 rounded-xl border border-indigo-500/15 bg-indigo-50/30 dark:bg-indigo-500/[0.03]">
                        <div className="flex items-center gap-3">
                          <MessageCircle className="w-5 h-5 hp-icon-indigo" />
                          <div>
                            <h3 className="text-sm font-semibold hp-text-primary">Socratic Dialogue</h3>
                            <p className="text-xs hp-text-quaternary mt-0.5">AI guides you to discover answers</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSocraticMode(!socraticMode)}
                          className={`toggle-switch relative w-12 h-7 rounded-full transition-colors ${
                            socraticMode ? 'bg-indigo-500' : ''
                          }`}
                          style={!socraticMode ? { backgroundColor: 'var(--hp-toggle-off)' } : {}}
                        >
                          <div
                            className={`toggle-knob absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-lg ${
                              socraticMode ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Duration Selector */}
                    <AnimatePresence>
                      {useTimer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <label className="block text-sm font-medium hp-text-tertiary mb-3 tracking-wide uppercase">Duration</label>
                          <div className="flex gap-2">
                            {[30, 60, 90, 120].map((d) => (
                              <button
                                key={d}
                                onClick={() => setExamDuration(d)}
                                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-300 border ${
                                  examDuration === d
                                    ? 'bg-indigo-50 dark:bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-300 shadow-lg shadow-indigo-500/5'
                                    : 'hp-text-tertiary'
                                }`}
                                style={examDuration !== d ? { borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' } : {}}
                              >
                                {d} min
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Start Button */}
                    <motion.button
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={handleStart}
                      className="group w-full relative py-4 rounded-2xl font-semibold text-lg overflow-hidden transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-90 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer opacity-0 group-hover:opacity-100" />
                      <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                        <Play className="w-5 h-5" />
                        <span>{mode === 'practice' ? 'Start Practice' : 'Start Exam'}</span>
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ===== FOOTER ===== */}
        <footer className="relative px-4 pb-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-center">
              <p className="text-xs hp-text-quaternary">
                Built for learners who demand more from their study tools
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
