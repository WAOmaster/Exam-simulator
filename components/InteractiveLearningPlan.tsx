'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  MessageCircle,
  Eye,
  Dumbbell,
  CheckCircle,
  Check,
  Lightbulb,
  Target,
  Trophy,
  ExternalLink,
  AlertCircle,
  Loader2,
  GraduationCap,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
} from 'lucide-react';
import type { LearningPlan, LearningPlanDiagnosis } from '@/lib/types';

interface InteractiveLearningPlanProps {
  isOpen: boolean;
  onClose: () => void;
  diagnosis: LearningPlanDiagnosis | null;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  userAnswer: string;
  category: string;
}

const STEPS = [
  { num: 1, label: 'Think', icon: MessageCircle },
  { num: 2, label: 'Learn', icon: Eye },
  { num: 3, label: 'Practice', icon: Dumbbell },
  { num: 4, label: 'Verify', icon: CheckCircle },
] as const;

export default function InteractiveLearningPlan({
  isOpen,
  onClose,
  diagnosis,
  question,
  options,
  correctAnswer,
  userAnswer,
  category,
}: InteractiveLearningPlanProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [plan, setPlan] = useState<LearningPlan | null>(null);

  // Step 1 state
  const [socraticAnswer, setSocraticAnswer] = useState<number | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Step 3 state
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState<Map<number, number>>(new Map());
  const [practiceResults, setPracticeResults] = useState<Map<number, boolean>>(new Map());

  // Step 4 state
  const [verifyAnswer, setVerifyAnswer] = useState<number | null>(null);
  const [verifyResult, setVerifyResult] = useState<'pending' | 'success' | 'retry'>('pending');

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/learning-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis,
          question,
          options,
          correctAnswer,
          userAnswer,
          category,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate learning plan');

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Generation failed');

      setPlan(data.learningPlan);
    } catch (err: any) {
      setError(err.message || 'Failed to generate learning plan');
    } finally {
      setLoading(false);
    }
  }, [diagnosis, question, options, correctAnswer, userAnswer, category]);

  useEffect(() => {
    if (isOpen && !plan && !loading) {
      fetchPlan();
    }
  }, [isOpen, plan, loading, fetchPlan]);

  const handleSocraticAnswer = (idx: number) => {
    if (socraticAnswer !== null) return;
    setSocraticAnswer(idx);
  };

  const handlePracticeAnswer = (idx: number) => {
    if (practiceAnswers.has(practiceIndex)) return;
    const isCorrect = idx === plan!.practice_questions[practiceIndex].correct_index;
    setPracticeAnswers(new Map(practiceAnswers).set(practiceIndex, idx));
    setPracticeResults(new Map(practiceResults).set(practiceIndex, isCorrect));
  };

  const handleVerifyAnswer = (idx: number) => {
    if (verifyAnswer !== null) return;
    setVerifyAnswer(idx);
    setVerifyResult(idx === plan!.verification.correct_index ? 'success' : 'retry');
  };

  const canProceed = (): boolean => {
    if (!plan) return false;
    switch (currentStep) {
      case 1:
        return socraticAnswer === plan.socratic_opener.correct_index || showHint;
      case 2:
        return true;
      case 3:
        return practiceAnswers.size === plan.practice_questions.length;
      case 4:
        return verifyResult === 'success';
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRetry = () => {
    setVerifyAnswer(null);
    setVerifyResult('pending');
    setCurrentStep(2);
  };

  const socraticCorrect = plan && socraticAnswer === plan.socratic_opener.correct_index;

  const renderStepContent = () => {
    if (!plan) return null;

    switch (currentStep) {
      case 1:
        return renderSocratic();
      case 2:
        return renderVisual();
      case 3:
        return renderPractice();
      case 4:
        return renderVerification();
      default:
        return null;
    }
  };

  const renderSocratic = () => {
    if (!plan) return null;
    const s = plan.socratic_opener;

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <MessageCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Let&apos;s Think About This
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Answer this question to check your foundational understanding.
            </p>
          </div>
        </div>

        <div className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 border-2 border-cyan-200 dark:border-cyan-700 rounded-xl">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-5">
            {s.question}
          </p>

          <div className="space-y-3">
            {s.options.map((option, idx) => {
              const isSelected = socraticAnswer === idx;
              const isCorrectOption = idx === s.correct_index;
              const answered = socraticAnswer !== null;

              let style = 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 dark:hover:border-cyan-500 bg-white dark:bg-gray-800';
              if (answered) {
                if (isCorrectOption) {
                  style = 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
                } else if (isSelected) {
                  style = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
                } else {
                  style = 'border-gray-200 dark:border-gray-700 opacity-50 bg-white dark:bg-gray-800';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSocraticAnswer(idx)}
                  disabled={answered}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${style}`}
                >
                  <span className="font-bold mr-3 text-gray-600 dark:text-gray-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Hint button */}
          {!socraticCorrect && socraticAnswer !== null && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
            >
              <Lightbulb className="w-4 h-4" />
              Show hint and continue
            </button>
          )}

          {/* Hint display */}
          {showHint && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Hint</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300">{s.hint_if_stuck}</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Expected insight on correct */}
          {socraticCorrect && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Key Insight</p>
                  <p className="text-sm text-green-700 dark:text-green-300">{s.expected_insight}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  };

  const renderVisual = () => {
    if (!plan) return null;
    const v = plan.visual_explanation;

    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <Eye className="w-8 h-8 text-cyan-600 dark:text-cyan-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              See It Clearly
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Let&apos;s break down this concept visually.
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-cyan-200 dark:border-cyan-700 rounded-xl">
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
            {v.description}
          </p>
        </div>

        {/* Key Concepts */}
        <div className="p-6 bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 border-2 border-cyan-200 dark:border-cyan-700 rounded-xl">
          <h4 className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Key Concepts
          </h4>
          <div className="space-y-3">
            {v.key_concepts.map((concept, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-cyan-100 dark:border-cyan-800"
              >
                <span className="w-6 h-6 rounded-full bg-cyan-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-gray-700 dark:text-gray-300 text-sm">{concept}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Key Takeaway */}
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 border-l-4 border-cyan-500 rounded-r-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-5 h-5 text-cyan-600 dark:text-cyan-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200 mb-1">
                Key Takeaway
              </p>
              <p className="text-sm text-cyan-700 dark:text-cyan-300">{v.key_takeaway}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPractice = () => {
    if (!plan) return null;
    const q = plan.practice_questions[practiceIndex];
    const answered = practiceAnswers.has(practiceIndex);
    const isCorrect = practiceResults.get(practiceIndex);
    const allDone = practiceAnswers.size === plan.practice_questions.length;

    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Dumbbell className="w-8 h-8 text-cyan-600 dark:text-cyan-400 shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                Practice Time
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Question {practiceIndex + 1} of {plan.practice_questions.length}
              </p>
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            q.difficulty === 'easy'
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : q.difficulty === 'medium'
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {q.difficulty}
          </span>
        </div>

        {/* Mini progress */}
        <div className="flex gap-2">
          {plan.practice_questions.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                practiceResults.has(idx)
                  ? practiceResults.get(idx)
                    ? 'bg-green-500'
                    : 'bg-red-500'
                  : idx === practiceIndex
                  ? 'bg-cyan-500'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-cyan-200 dark:border-cyan-700 rounded-xl">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-5">
            {q.question}
          </p>

          <div className="space-y-3">
            {q.options.map((option, idx) => {
              const isSelected = practiceAnswers.get(practiceIndex) === idx;
              const isCorrectOption = idx === q.correct_index;

              let style = 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 dark:hover:border-cyan-500 bg-white dark:bg-gray-800';
              if (answered) {
                if (isCorrectOption) {
                  style = 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
                } else if (isSelected) {
                  style = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
                } else {
                  style = 'border-gray-200 dark:border-gray-700 opacity-50 bg-white dark:bg-gray-800';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handlePracticeAnswer(idx)}
                  disabled={answered}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${style}`}
                >
                  <span className="font-bold mr-3 text-gray-600 dark:text-gray-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">{option}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {answered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-4 rounded-lg ${
                isCorrect
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
              }`}
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{q.explanation}</p>
            </motion.div>
          )}
        </div>

        {/* Next practice question button */}
        {answered && practiceIndex < plan.practice_questions.length - 1 && (
          <button
            onClick={() => setPracticeIndex(practiceIndex + 1)}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Next Practice Question
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* All done message */}
        {allDone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-center"
          >
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">
              All practice questions completed! Click Continue to take the verification quiz.
            </p>
          </motion.div>
        )}
      </div>
    );
  };

  const renderVerification = () => {
    if (!plan) return null;
    const v = plan.verification;

    if (verifyResult === 'success') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="p-8 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-600 rounded-xl text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Trophy className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
            </motion.div>
            <h4 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
              Knowledge Gap Closed!
            </h4>
            <p className="text-green-700 dark:text-green-300 mb-6">
              {v.success_message}
            </p>

            {/* Grounded sources */}
            {plan.grounded_sources && plan.grounded_sources.length > 0 && (
              <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-700 text-left">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Want to learn more? Check these resources:
                </p>
                <div className="space-y-2">
                  {plan.grounded_sources.map((source, idx) => (
                    <a
                      key={idx}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      {source.title}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      );
    }

    if (verifyResult === 'retry') {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-600 rounded-xl text-center">
            <AlertCircle className="w-12 h-12 text-amber-600 dark:text-amber-400 mx-auto mb-4" />
            <h4 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">
              Not Quite There Yet
            </h4>
            <p className="text-amber-700 dark:text-amber-300 mb-6">
              {v.retry_message}
            </p>
            <button
              onClick={handleRetry}
              className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              Review Material Again
            </button>
          </div>
        </motion.div>
      );
    }

    // Pending — show the verification question
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <CheckCircle className="w-8 h-8 text-cyan-600 dark:text-cyan-400 shrink-0 mt-1" />
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Final Verification
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Prove you&apos;ve mastered this concept!
            </p>
          </div>
        </div>

        <div className="p-6 bg-white dark:bg-gray-800 border-2 border-cyan-200 dark:border-cyan-700 rounded-xl">
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-5">
            {v.question}
          </p>

          <div className="space-y-3">
            {v.options.map((option, idx) => {
              const isSelected = verifyAnswer === idx;
              const isCorrectOption = idx === v.correct_index;
              const answered = verifyAnswer !== null;

              let style = 'border-gray-300 dark:border-gray-600 hover:border-cyan-400 dark:hover:border-cyan-500 bg-white dark:bg-gray-800';
              if (answered) {
                if (isCorrectOption) {
                  style = 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
                } else if (isSelected) {
                  style = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
                } else {
                  style = 'border-gray-200 dark:border-gray-700 opacity-50 bg-white dark:bg-gray-800';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleVerifyAnswer(idx)}
                  disabled={answered}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${style}`}
                >
                  <span className="font-bold mr-3 text-gray-600 dark:text-gray-400">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">{option}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Calculate completion percentage
  const completionPercent = plan
    ? Math.round(
        ((currentStep - 1) / 4) * 100 +
          (currentStep === 3 && plan.practice_questions.length > 0
            ? (practiceAnswers.size / plan.practice_questions.length) * 25
            : 0)
      )
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 p-5 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500">
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {plan?.module_title || 'Interactive Learning Plan'}
                      </h2>
                      {plan && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          ~{plan.estimated_minutes} min
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Step Progress */}
              {plan && (
                <div className="shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    {STEPS.map(({ num, label, icon: Icon }, idx) => (
                      <div key={num} className="flex items-center flex-1">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                              currentStep === num
                                ? 'bg-cyan-500 border-cyan-500 text-white'
                                : currentStep > num
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400'
                            }`}
                          >
                            {currentStep > num ? (
                              <Check className="w-5 h-5" />
                            ) : (
                              <Icon className="w-5 h-5" />
                            )}
                          </div>
                          <span className={`text-[10px] font-medium ${
                            currentStep >= num
                              ? 'text-cyan-700 dark:text-cyan-300'
                              : 'text-gray-400 dark:text-gray-500'
                          }`}>
                            {label}
                          </span>
                        </div>
                        {idx < STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mx-2 rounded-full transition-colors ${
                            currentStep > num
                              ? 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`} />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <motion.div
                      className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${completionPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {loading && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="relative">
                      <GraduationCap className="w-12 h-12 text-cyan-500 animate-pulse" />
                    </div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                      Generating your personalized learning plan...
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      This may take a few seconds
                    </p>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-red-800 dark:text-red-200 mb-3">{error}</p>
                    <button
                      onClick={fetchPlan}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                )}

                {plan && !loading && (
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStepContent()}
                  </motion.div>
                )}
              </div>

              {/* Footer */}
              {plan && !loading && (
                <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
                  {currentStep > 1 && verifyResult !== 'success' && verifyResult !== 'retry' ? (
                    <button
                      onClick={handlePrev}
                      className="px-5 py-2.5 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                  ) : (
                    <div />
                  )}

                  {canProceed() && (
                    <button
                      onClick={handleNext}
                      className="px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      {currentStep === 4 ? 'Return to Practice' : 'Continue'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
