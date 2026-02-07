'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Target,
  BookOpen,
  Zap,
  GraduationCap,
  ChevronRight,
} from 'lucide-react';

interface Hypothesis {
  type: string;
  confidence: number;
  reasoning: string;
}

interface Diagnosis {
  hypotheses: Hypothesis[];
  primaryDiagnosis: string;
  emotionalTone: 'encouraging' | 'empathetic' | 'challenging' | 'supportive';
  diagnosticExplanation: string;
  remediation: {
    immediateAction: string;
    conceptToReview: string;
    practiceHint: string;
  };
}

interface CognitiveCompanionProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: { id: string; text: string }[];
  selectedAnswer: string;
  correctAnswer: string;
  questionId: number;
  responseTimeMs: number;
  selectionChanges: number;
  consecutiveIncorrect: number;
  category: string;
  difficulty: string;
  onStartLearningPlan?: (diagnosis: Diagnosis) => void;
}

export default function CognitiveCompanion({
  isOpen,
  onClose,
  question,
  options,
  selectedAnswer,
  correctAnswer,
  responseTimeMs,
  selectionChanges,
  consecutiveIncorrect,
  category,
  difficulty,
  onStartLearningPlan,
}: CognitiveCompanionProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [thinkingSteps, setThinkingSteps] = useState<string[]>([]);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [showThinking, setShowThinking] = useState(false);
  const [phase, setPhase] = useState<'thinking' | 'diagnosis' | 'remediation'>('thinking');
  const animationRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDiagnosis = useCallback(async () => {
    setLoading(true);
    setError('');
    setDiagnosis(null);
    setThinkingSteps([]);
    setVisibleSteps(0);
    setPhase('thinking');

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options,
          correctAnswer,
          userAnswer: selectedAnswer,
          responseTimeMs,
          selectionChanges,
          consecutiveIncorrect,
          category,
          difficulty,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch diagnosis');

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Diagnosis failed');

      setDiagnosis(data.diagnosis);
      setThinkingSteps(data.thinkingProcess || []);

      // Animate thinking steps
      const steps = data.thinkingProcess || [];
      if (steps.length > 0) {
        let step = 0;
        const animateStep = () => {
          step++;
          setVisibleSteps(step);
          if (step < steps.length) {
            animationRef.current = setTimeout(animateStep, 200);
          } else {
            // Move to diagnosis phase after all thinking steps
            animationRef.current = setTimeout(() => setPhase('diagnosis'), 500);
            animationRef.current = setTimeout(() => setPhase('remediation'), 1500);
          }
        };
        animateStep();
      } else {
        setPhase('diagnosis');
        setTimeout(() => setPhase('remediation'), 800);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate diagnosis');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, selectedAnswer, correctAnswer, responseTimeMs, selectionChanges, consecutiveIncorrect, category, difficulty]);

  useEffect(() => {
    if (isOpen && selectedAnswer) {
      fetchDiagnosis();
    }
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current);
    };
  }, [isOpen, selectedAnswer, fetchDiagnosis]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'bg-red-500';
    if (confidence > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      misconception: 'Misconception',
      prerequisite_gap: 'Knowledge Gap',
      careless_error: 'Careless Error',
      time_pressure: 'Time Pressure',
      partial_knowledge: 'Partial Knowledge',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'misconception': return <AlertCircle className="w-4 h-4" />;
      case 'prerequisite_gap': return <BookOpen className="w-4 h-4" />;
      case 'careless_error': return <Zap className="w-4 h-4" />;
      case 'time_pressure': return <Target className="w-4 h-4" />;
      case 'partial_knowledge': return <Brain className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />

          {/* Side Pane */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full lg:w-1/3 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-1">
                      Cognitive Companion
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Diagnostic Analysis</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Loading State */}
              {loading && !diagnosis && (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <Brain className="w-12 h-12 text-amber-500 animate-pulse" />
                    <Sparkles className="w-5 h-5 text-orange-400 absolute -top-1 -right-1 animate-bounce" />
                  </div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">
                    Analyzing your response...
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Examining behavioral patterns
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {/* Diagnosis Content */}
              {diagnosis && (
                <div className="space-y-5">
                  {/* Diagnostic Explanation */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border-2 ${
                      diagnosis.emotionalTone === 'empathetic'
                        ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                        : diagnosis.emotionalTone === 'encouraging'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                        : diagnosis.emotionalTone === 'supportive'
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                    }`}>
                    <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                      {diagnosis.diagnosticExplanation}
                    </p>
                  </motion.div>

                  {/* Hypotheses */}
                  {(phase === 'diagnosis' || phase === 'remediation') && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                        Diagnostic Hypotheses
                      </h3>
                      <div className="space-y-3">
                        {diagnosis.hypotheses.map((hypothesis, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * index }}
                            className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border ${
                              index === 0
                                ? 'border-amber-300 dark:border-amber-600 ring-1 ring-amber-200 dark:ring-amber-700'
                                : 'border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-amber-600 dark:text-amber-400">
                                  {getTypeIcon(hypothesis.type)}
                                </span>
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                  {getTypeLabel(hypothesis.type)}
                                </span>
                                {index === 0 && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-800/50 text-amber-700 dark:text-amber-300 rounded-full font-medium">
                                    PRIMARY
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                {Math.round(hypothesis.confidence * 100)}%
                              </span>
                            </div>
                            {/* Confidence bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mb-2">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${hypothesis.confidence * 100}%` }}
                                transition={{ duration: 0.6, delay: 0.2 * index }}
                                className={`h-1.5 rounded-full ${getConfidenceColor(hypothesis.confidence)}`}
                              />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {hypothesis.reasoning}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Remediation */}
                  {phase === 'remediation' && diagnosis.remediation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                          What To Do Next
                        </h3>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">
                            <Zap className="w-3.5 h-3.5" />
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {diagnosis.remediation.immediateAction}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">
                            <BookOpen className="w-3.5 h-3.5" />
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Review:</span> {diagnosis.remediation.conceptToReview}
                          </p>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-amber-500 mt-0.5">
                            <Target className="w-3.5 h-3.5" />
                          </span>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">Hint:</span> {diagnosis.remediation.practiceHint}
                          </p>
                        </div>
                      </div>

                      {/* Start Learning Plan button */}
                      {onStartLearningPlan && (
                        <button
                          onClick={() => onStartLearningPlan(diagnosis)}
                          className="mt-4 w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 dark:from-cyan-700 dark:to-teal-700 dark:hover:from-cyan-600 dark:hover:to-teal-600 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                        >
                          <GraduationCap className="w-5 h-5" />
                          Start Learning Plan
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                    </motion.div>
                  )}

                  {/* Expandable Thinking Process */}
                  {thinkingSteps.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <button
                        onClick={() => setShowThinking(!showThinking)}
                        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors w-full"
                      >
                        <Brain className="w-4 h-4" />
                        <span>AI Thinking Process ({thinkingSteps.length} steps)</span>
                        {showThinking ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
                      </button>

                      <AnimatePresence>
                        {showThinking && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 space-y-2 max-h-60 overflow-y-auto">
                              {thinkingSteps.slice(0, visibleSteps).map((step, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-700/30 rounded text-xs"
                                >
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                                  <p className="text-gray-600 dark:text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                                    {step.length > 200 ? step.substring(0, 200) + '...' : step}
                                  </p>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
