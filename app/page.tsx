'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Clock,
  FileText,
  Trophy,
  Brain,
  Sparkles,
  Play,
  BarChart3,
  Library,
  Plus,
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
  MessageCircle,
} from 'lucide-react';
import subjects from '@/data/default-questions/subjects.json';

// Icon mapping
const iconMap: Record<string, any> = {
  Atom,
  Code,
  Cog,
  Palette,
  Calculator,
  Cloud,
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

  // Load questions when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      const subject = subjects.find((s) => s.id === selectedSubject);
      if (subject) {
        import(`@/data/default-questions/${subject.file}`)
          .then((module) => {
            setLoadedQuestions(module.default);
          })
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

    // Load the selected subject's questions into the store
    setQuestions(loadedQuestions);

    startExam(examDuration, mode, useTimer, learnWithAI, reviewAnswers, cognitiveCompanion, socraticMode);
    router.push(mode === 'practice' ? '/practice' : '/exam');
  };

  const handleViewResults = () => {
    router.push('/results');
  };

  const score = isExamCompleted ? getScore() : null;
  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50 dark:from-slate-950 dark:via-indigo-950 dark:to-purple-950">
      <div className="min-h-screen relative">
        {/* Decorative gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-400/20 to-purple-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 -left-40 w-80 h-80 bg-gradient-to-br from-emerald-400/15 to-teal-400/15 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 right-1/3 w-80 h-80 bg-gradient-to-br from-amber-400/15 to-orange-400/15 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 py-12 relative z-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center mb-14"
          >
            <div className="flex items-center justify-center gap-5 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
                <Trophy className="w-12 h-12 text-white drop-shadow-md" />
              </div>
              <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-900 dark:from-white dark:via-indigo-200 dark:to-purple-200 bg-clip-text text-transparent">
                ExamSimulator
              </h1>
            </div>
            <p className="text-2xl text-slate-700 dark:text-slate-300 font-semibold">
              AI-Powered Practice Exams
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400 mt-3 max-w-2xl mx-auto">
              Master any subject with custom-generated questions and intelligent feedback
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
          >
            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/generate')}
              className="group p-6 rounded-2xl shadow-xl transition-all relative overflow-hidden hover:shadow-2xl"
              style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute top-4 right-4 opacity-30">
                <Sparkles className="w-20 h-20 text-white" />
              </div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                  <Wand2 className="w-9 h-9 text-white drop-shadow-lg" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">Generate Questions</h3>
                  <p className="text-white/90 text-base">Create custom exams from your content</p>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.03, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push('/library')}
              className="group p-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute top-4 right-4 opacity-30">
                <BookMarked className="w-20 h-20 text-white" />
              </div>
              <div className="flex items-center gap-5 relative z-10">
                <div className="p-4 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                  <BookMarked className="w-9 h-9 text-white drop-shadow-lg" />
                </div>
                <div className="text-left">
                  <h3 className="text-2xl font-bold text-white mb-1 drop-shadow-md">My Library</h3>
                  <p className="text-white/90 text-base">Browse saved question sets</p>
                </div>
              </div>
            </motion.button>
          </motion.div>

          {/* Subject Selection Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="bg-white dark:bg-slate-800/50 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/20">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                Explore Sample Questions
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Try out the app with pre-built question sets before creating your own
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => {
                  const Icon = iconMap[subject.icon] || FileText;
                  const isSelected = selectedSubject === subject.id;

                  return (
                    <button
                      key={subject.id}
                      onClick={() => setSelectedSubject(subject.id)}
                      className={`relative p-5 rounded-xl border-2 transition-all text-left group overflow-hidden ${isSelected
                        ? 'border-white dark:border-white bg-gradient-to-br ' + subject.color + ' shadow-2xl scale-105 ring-4 ring-white ring-opacity-30'
                        : 'border-gray-300 dark:border-gray-600 bg-gradient-to-br ' + subject.color + ' bg-opacity-10 dark:bg-opacity-20 hover:border-opacity-50 hover:scale-102 hover:shadow-lg'
                        }`}
                    >
                      {/* Background gradient overlay */}
                      {!isSelected && (
                        <div className="absolute inset-0 overlay-strong" />
                      )}

                      {isSelected && (
                        <div className="absolute top-3 right-3 z-10">
                          <div className="glass-bg backdrop-blur-sm rounded-full p-1">
                            <CheckCircle className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}

                      <div className={`flex items-start gap-3 relative z-10 ${isSelected ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                        <div className={`p-2 rounded-lg ${isSelected ? 'glass-bg backdrop-blur-sm' : `bg-gradient-to-br ${subject.color} bg-opacity-20`}`}>
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : ''}`} style={!isSelected ? { color: 'inherit' } : {}} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-lg mb-1">{subject.name}</h3>
                          <p className={`text-sm mb-2 ${isSelected ? 'text-white text-opacity-95' : 'text-gray-600 dark:text-gray-300'}`}>
                            {subject.description}
                          </p>
                          <div className="flex items-center gap-3 text-xs">
                            <span className={`font-medium ${isSelected ? 'text-white text-opacity-90' : 'text-gray-600 dark:text-gray-400'}`}>
                              {subject.questionCount} questions
                            </span>
                            <span className={`px-2 py-1 rounded font-medium ${isSelected ? 'glass-bg backdrop-blur-sm text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                              {subject.difficulty}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Configuration Card (Only show if subject is selected) */}
          {selectedSubject && selectedSubjectData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-colors"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
                <div className="flex items-center gap-4 p-4 bg-card dark:bg-gray-700 rounded-lg shadow-sm transition-colors">
                  <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                      {loadedQuestions.length}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Questions</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-card dark:bg-gray-700 rounded-lg shadow-sm transition-colors">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${selectedSubjectData.color}`}>
                    {(() => {
                      const Icon = iconMap[selectedSubjectData.icon] || FileText;
                      return <Icon className="w-6 h-6 text-white" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                      {selectedSubjectData.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Selected</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-card dark:bg-gray-700 rounded-lg shadow-sm transition-colors">
                  <Brain className="w-10 h-10 text-theme-accent" />
                  <div>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">AI</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Explanations</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Previous Score */}
                {isExamCompleted && score && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 rounded-lg border-2 border-green-200 dark:border-green-700"
                    style={{
                      backgroundImage: 'linear-gradient(to right, color-mix(in srgb, #10b981 15%, white), color-mix(in srgb, var(--primary) 15%, white))'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <BarChart3 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                            Your Last Score
                          </p>
                          <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                            {score.correct} / {score.total}
                            <span className="text-xl ml-2 text-green-600 dark:text-green-400">
                              ({score.percentage}%)
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={handleViewResults}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
                      >
                        View Results
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Features */}
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
                    Features
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                      <Sparkles className="w-6 h-6 text-theme-secondary mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          AI Explanations
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Get detailed explanations powered by Google Gemini AI
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                      <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Timed Mode</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Practice under real exam conditions with a timer
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                      <Trophy className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Track Progress
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Monitor your performance and identify weak areas
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg transition-colors">
                      <FileText className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Practice Questions
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Test your knowledge with {selectedSubjectData.name} questions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="mb-8">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select Mode
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setMode('practice')}
                      className={`p-4 rounded-lg border-2 transition-all ${mode === 'practice'
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600 bg-card dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Brain className={`w-6 h-6 ${mode === 'practice' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="text-left">
                          <h3 className={`font-semibold ${mode === 'practice' ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                            Practice Mode
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Instant AI feedback for each answer
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setMode('exam')}
                      className={`p-4 rounded-lg border-2 transition-all ${mode === 'exam'
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-300 dark:border-gray-600 bg-card dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-6 h-6 ${mode === 'exam' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="text-left">
                          <h3 className={`font-semibold ${mode === 'exam' ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                            Exam Mode
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Simulate real exam conditions
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Timer Toggle */}
                <div className="mb-8">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Use Timer
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {useTimer ? `${examDuration} minutes countdown` : 'No time limit'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUseTimer(!useTimer)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${useTimer ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${useTimer ? 'translate-x-6' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Learn with AI Toggle (Practice Mode Only) */}
                {mode === 'practice' && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            Learn with AI
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Get AI-guided learning for each question
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLearnWithAI(!learnWithAI)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${learnWithAI ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${learnWithAI ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Answers Toggle (Exam Mode Only) */}
                {mode === 'exam' && (
                  <div className="mb-8">
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            Review Answers
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Review answers during exam (optional)
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReviewAnswers(!reviewAnswers)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${reviewAnswers ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${reviewAnswers ? 'translate-x-6' : 'translate-x-0'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Cognitive Companion Toggle (Both Modes) */}
                <div className="mb-8">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Brain className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Cognitive Companion
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          AI diagnoses why you got it wrong with visible reasoning
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCognitiveCompanion(!cognitiveCompanion)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${cognitiveCompanion ? 'bg-amber-600 dark:bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${cognitiveCompanion ? 'translate-x-6' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Socratic Dialogue Toggle (Both Modes) */}
                <div className="mb-8">
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Socratic Dialogue
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          AI guides you to discover answers through questions
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSocraticMode(!socraticMode)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${socraticMode ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${socraticMode ? 'translate-x-6' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Exam Duration Selector (only if timer is enabled) */}
                {useTimer && (
                  <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Exam Duration
                    </label>
                    <div className="flex gap-3 flex-wrap">
                      {[30, 60, 90, 120].map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setExamDuration(duration)}
                          className={`px-6 py-3 rounded-lg font-medium transition-all ${examDuration === duration
                            ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-lg scale-105'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                            }`}
                        >
                          {duration} min
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Start Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleStart}
                  className={`w-full py-4 bg-gradient-to-r ${selectedSubjectData.color} text-white text-xl font-bold rounded-lg shadow-xl transition-all flex items-center justify-center gap-3`}
                >
                  <Play className="w-6 h-6" />
                  {mode === 'practice' ? 'Start Practice' : 'Start Exam'}
                  <ChevronRight className="w-6 h-6" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Footer with Gemini Branding */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <div className="flex items-center justify-center gap-3 p-4 glass-bg backdrop-blur-md rounded-xl border border-glass">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300 animate-pulse" />
                  <div className="absolute inset-0 blur-sm">
                    <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                  </div>
                </div>
                <span className="text-gray-900 dark:text-white font-semibold">Powered by</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="text-white font-bold">Google Gemini AI</span>
              </div>
              <span className="text-theme-light hidden sm:inline">•</span>
              <span className="text-theme-light hidden sm:inline">Generate questions from any subject</span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
