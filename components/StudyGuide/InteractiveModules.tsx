'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageCircle,
  Eye,
  Dumbbell,
  Target,
  Lightbulb,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Trophy,
  ExternalLink,
  Check,
} from 'lucide-react';
import type { LearningPlan } from '@/lib/types';
import type { WeakConcept } from '@/lib/diagnosisHistory';

interface InteractiveModulesProps {
  weakConcepts: WeakConcept[];
  weakCategories: { category: string; accuracy: number; total: number }[];
}

const STEPS = [
  { num: 1, label: 'Think', icon: MessageCircle },
  { num: 2, label: 'Learn', icon: Eye },
  { num: 3, label: 'Practice', icon: Dumbbell },
  { num: 4, label: 'Verify', icon: CheckCircle },
] as const;

interface ModuleState {
  loading: boolean;
  error: string;
  plan: LearningPlan | null;
  currentStep: number;
  socraticAnswer: number | null;
  showHint: boolean;
  practiceIndex: number;
  practiceAnswers: Map<number, number>;
  practiceResults: Map<number, boolean>;
  verifyAnswer: number | null;
  verifyResult: 'pending' | 'success' | 'retry';
}

function getInitialModuleState(): ModuleState {
  return {
    loading: false,
    error: '',
    plan: null,
    currentStep: 1,
    socraticAnswer: null,
    showHint: false,
    practiceIndex: 0,
    practiceAnswers: new Map(),
    practiceResults: new Map(),
    verifyAnswer: null,
    verifyResult: 'pending',
  };
}

export default function InteractiveModules({ weakConcepts, weakCategories }: InteractiveModulesProps) {
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [moduleStates, setModuleStates] = useState<Record<string, ModuleState>>({});

  // Build modules from weak concepts
  const modules = weakConcepts.slice(0, 6).map((wc) => ({
    key: `${wc.category}::${wc.conceptToReview}`,
    concept: wc.conceptToReview,
    category: wc.category,
    explanation: wc.latestExplanation,
    hint: wc.latestHint,
    frequency: wc.frequency,
    diagnoses: wc.primaryDiagnoses,
  }));

  const getState = (key: string): ModuleState => {
    return moduleStates[key] || getInitialModuleState();
  };

  const updateState = (key: string, updates: Partial<ModuleState>) => {
    setModuleStates((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || getInitialModuleState()), ...updates },
    }));
  };

  const fetchPlan = useCallback(async (module: typeof modules[0]) => {
    updateState(module.key, { loading: true, error: '' });

    try {
      const response = await fetch('/api/ai/learning-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          diagnosis: {
            primaryDiagnosis: module.diagnoses[0] || 'misconception',
            diagnosticExplanation: module.explanation,
            remediation: {
              immediateAction: 'Review the concept carefully',
              conceptToReview: module.concept,
              practiceHint: module.hint,
            },
          },
          question: `Understanding ${module.concept}`,
          options: [],
          correctAnswer: '',
          userAnswer: '',
          category: module.category,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to load');
      updateState(module.key, { loading: false, plan: data.learningPlan });
    } catch (err: any) {
      updateState(module.key, { loading: false, error: err.message || 'Failed to load module' });
    }
  }, []);

  const toggleModule = (module: typeof modules[0]) => {
    if (expandedModule === module.key) {
      setExpandedModule(null);
    } else {
      setExpandedModule(module.key);
      const state = getState(module.key);
      if (!state.plan && !state.loading) {
        fetchPlan(module);
      }
    }
  };

  if (modules.length === 0) {
    return (
      <div className="p-8 rounded-xl border text-center" style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}>
        <GraduationCap className="w-10 h-10 hp-text-quaternary mx-auto mb-3" />
        <p className="hp-text-tertiary text-sm">No learning modules available yet.</p>
        <p className="hp-text-quaternary text-xs mt-1">Complete exams with Cognitive Companion enabled to unlock interactive learning.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {modules.map((module, i) => {
        const state = getState(module.key);
        const isExpanded = expandedModule === module.key;

        return (
          <motion.div
            key={module.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border overflow-hidden"
            style={{ borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' }}
          >
            {/* Accordion Header */}
            <button
              onClick={() => toggleModule(module)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15 flex items-center justify-center shrink-0">
                  <GraduationCap className="w-4.5 h-4.5 hp-icon-cyan" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold hp-text-primary text-sm truncate">{module.concept}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] hp-text-quaternary">{module.category}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">{module.frequency}x</span>
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 hp-text-quaternary shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 hp-text-quaternary shrink-0" />
              )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: 'var(--hp-surface-border)' }}>
                    {state.loading && (
                      <div className="flex flex-col items-center py-8">
                        <Loader2 className="w-6 h-6 hp-icon-cyan animate-spin" />
                        <p className="mt-2 text-xs hp-text-quaternary">Generating learning module...</p>
                      </div>
                    )}

                    {state.error && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                        <p className="text-xs text-red-600 dark:text-red-300">{state.error}</p>
                        <button
                          onClick={() => fetchPlan(module)}
                          className="mt-2 text-xs text-red-700 dark:text-red-300 font-medium hover:underline"
                        >
                          Try Again
                        </button>
                      </div>
                    )}

                    {state.plan && (
                      <InlineModule
                        plan={state.plan}
                        moduleKey={module.key}
                        state={state}
                        onUpdateState={(updates) => updateState(module.key, updates)}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// Inline module renderer (simplified version of InteractiveLearningPlan)
function InlineModule({
  plan,
  moduleKey,
  state,
  onUpdateState,
}: {
  plan: LearningPlan;
  moduleKey: string;
  state: ModuleState;
  onUpdateState: (updates: Partial<ModuleState>) => void;
}) {
  const { currentStep, socraticAnswer, showHint, practiceIndex, practiceAnswers, practiceResults, verifyAnswer, verifyResult } = state;

  const socraticCorrect = socraticAnswer === plan.socratic_opener.correct_index;

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 1: return socraticCorrect || showHint;
      case 2: return true;
      case 3: return practiceAnswers.size === plan.practice_questions.length;
      case 4: return verifyResult === 'success';
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      onUpdateState({ currentStep: currentStep + 1 });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      onUpdateState({ currentStep: currentStep - 1 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Step Progress */}
      <div className="flex items-center justify-between">
        {STEPS.map(({ num, label, icon: Icon }, idx) => (
          <div key={num} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors text-xs ${
                currentStep === num
                  ? 'bg-cyan-500 border-cyan-500 text-white'
                  : currentStep > num
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-gray-300 dark:border-gray-600 hp-text-quaternary'
              }`}>
                {currentStep > num ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[9px] font-medium ${currentStep >= num ? 'text-cyan-600 dark:text-cyan-400' : 'hp-text-quaternary'}`}>
                {label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1.5 rounded-full ${currentStep > num ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div key={currentStep} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
          {currentStep === 1 && (
            <StepSocratic
              data={plan.socratic_opener}
              answer={socraticAnswer}
              showHint={showHint}
              onAnswer={(idx) => onUpdateState({ socraticAnswer: idx })}
              onShowHint={() => onUpdateState({ showHint: true })}
            />
          )}
          {currentStep === 2 && <StepVisual data={plan.visual_explanation} />}
          {currentStep === 3 && (
            <StepPractice
              questions={plan.practice_questions}
              practiceIndex={practiceIndex}
              answers={practiceAnswers}
              results={practiceResults}
              onAnswer={(idx) => {
                const isCorrect = idx === plan.practice_questions[practiceIndex].correct_index;
                const newAnswers = new Map(practiceAnswers).set(practiceIndex, idx);
                const newResults = new Map(practiceResults).set(practiceIndex, isCorrect);
                onUpdateState({ practiceAnswers: newAnswers, practiceResults: newResults });
              }}
              onNextPractice={() => onUpdateState({ practiceIndex: practiceIndex + 1 })}
            />
          )}
          {currentStep === 4 && (
            <StepVerify
              data={plan.verification}
              answer={verifyAnswer}
              result={verifyResult}
              sources={plan.grounded_sources}
              onAnswer={(idx) => {
                const result = idx === plan.verification.correct_index ? 'success' : 'retry';
                onUpdateState({ verifyAnswer: idx, verifyResult: result as any });
              }}
              onRetry={() => {
                onUpdateState({ verifyAnswer: null, verifyResult: 'pending', currentStep: 2 });
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--hp-surface-border)' }}>
        {currentStep > 1 && verifyResult !== 'success' && verifyResult !== 'retry' ? (
          <button onClick={handlePrev} className="flex items-center gap-1 text-xs hp-text-tertiary font-medium hover:hp-text-secondary transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Previous
          </button>
        ) : <div />}
        {canProceed() && (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            {currentStep === 4 ? 'Complete' : 'Continue'}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Sub-components for each step

function StepSocratic({ data, answer, showHint, onAnswer, onShowHint }: {
  data: LearningPlan['socratic_opener'];
  answer: number | null;
  showHint: boolean;
  onAnswer: (idx: number) => void;
  onShowHint: () => void;
}) {
  const correct = answer === data.correct_index;

  return (
    <div className="space-y-3">
      <p className="text-sm hp-text-primary font-medium">{data.question}</p>
      <div className="space-y-2">
        {data.options.map((opt, idx) => {
          let cls = 'border hp-text-secondary';
          if (answer !== null) {
            if (idx === data.correct_index) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
            else if (idx === answer) cls = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
            else cls = 'border opacity-40 hp-text-quaternary';
          } else {
            cls = 'border hover:border-cyan-400 dark:hover:border-cyan-500 hp-text-secondary';
          }
          return (
            <button key={idx} onClick={() => answer === null && onAnswer(idx)} disabled={answer !== null} className={`w-full text-left p-3 rounded-lg text-xs transition-all ${cls}`} style={answer === null ? { borderColor: 'var(--hp-surface-border)' } : {}}>
              <span className="font-bold mr-2 hp-text-quaternary">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
      {!correct && answer !== null && !showHint && (
        <button onClick={onShowHint} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Lightbulb className="w-3.5 h-3.5" />Show hint
        </button>
      )}
      {showHint && <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300"><Lightbulb className="w-3.5 h-3.5 inline mr-1" />{data.hint_if_stuck}</div>}
      {correct && <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs text-emerald-700 dark:text-emerald-300"><CheckCircle className="w-3.5 h-3.5 inline mr-1" />{data.expected_insight}</div>}
    </div>
  );
}

function StepVisual({ data }: { data: LearningPlan['visual_explanation'] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm hp-text-secondary leading-relaxed">{data.description}</p>
      <div className="space-y-2">
        {data.key_concepts.map((concept, idx) => (
          <div key={idx} className="flex items-start gap-2 p-2.5 rounded-lg border" style={{ borderColor: 'var(--hp-surface-border)' }}>
            <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
            <p className="text-xs hp-text-secondary">{concept}</p>
          </div>
        ))}
      </div>
      <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border-l-3 border-cyan-500 rounded-r-lg">
        <p className="text-xs text-cyan-700 dark:text-cyan-300"><Target className="w-3.5 h-3.5 inline mr-1" /><span className="font-semibold">Takeaway:</span> {data.key_takeaway}</p>
      </div>
    </div>
  );
}

function StepPractice({ questions, practiceIndex, answers, results, onAnswer, onNextPractice }: {
  questions: LearningPlan['practice_questions'];
  practiceIndex: number;
  answers: Map<number, number>;
  results: Map<number, boolean>;
  onAnswer: (idx: number) => void;
  onNextPractice: () => void;
}) {
  const q = questions[practiceIndex];
  const answered = answers.has(practiceIndex);
  const isCorrect = results.get(practiceIndex);
  const allDone = answers.size === questions.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs hp-text-tertiary font-medium">Question {practiceIndex + 1}/{questions.length}</p>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          q.difficulty === 'easy' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
            : q.difficulty === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>{q.difficulty}</span>
      </div>
      <div className="flex gap-1.5">
        {questions.map((_, idx) => (
          <div key={idx} className={`h-1 flex-1 rounded-full ${results.has(idx) ? results.get(idx) ? 'bg-emerald-500' : 'bg-red-500' : idx === practiceIndex ? 'bg-cyan-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>
      <p className="text-sm hp-text-primary font-medium">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let cls = 'border hp-text-secondary';
          if (answered) {
            if (idx === q.correct_index) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
            else if (idx === answers.get(practiceIndex)) cls = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
            else cls = 'border opacity-40 hp-text-quaternary';
          } else {
            cls = 'border hover:border-cyan-400 dark:hover:border-cyan-500 hp-text-secondary';
          }
          return (
            <button key={idx} onClick={() => !answered && onAnswer(idx)} disabled={answered} className={`w-full text-left p-3 rounded-lg text-xs transition-all ${cls}`} style={!answered ? { borderColor: 'var(--hp-surface-border)' } : {}}>
              <span className="font-bold mr-2 hp-text-quaternary">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered && <div className={`p-2.5 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'}`}>{q.explanation}</div>}
      {answered && practiceIndex < questions.length - 1 && (
        <button onClick={onNextPractice} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1">
          Next Question <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      {allDone && <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-center text-xs text-emerald-700 dark:text-emerald-300 font-medium">All practice complete! Continue to verification.</div>}
    </div>
  );
}

function StepVerify({ data, answer, result, sources, onAnswer, onRetry }: {
  data: LearningPlan['verification'];
  answer: number | null;
  result: 'pending' | 'success' | 'retry';
  sources: LearningPlan['grounded_sources'];
  onAnswer: (idx: number) => void;
  onRetry: () => void;
}) {
  if (result === 'success') {
    return (
      <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl text-center">
        <Trophy className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
        <h4 className="font-bold text-emerald-800 dark:text-emerald-200 text-sm mb-1">Knowledge Gap Closed!</h4>
        <p className="text-xs text-emerald-700 dark:text-emerald-300">{data.success_message}</p>
        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700 text-left">
            <p className="text-[10px] font-semibold hp-text-tertiary mb-1">Further reading:</p>
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline mt-0.5">
                <ExternalLink className="w-3 h-3 shrink-0" />{s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (result === 'retry') {
    return (
      <div className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm mb-1">Not Quite There</h4>
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-3">{data.retry_message}</p>
        <button onClick={onRetry} className="flex items-center gap-1 mx-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-medium rounded-lg">
          <RotateCcw className="w-3.5 h-3.5" />Review Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm hp-text-primary font-medium">{data.question}</p>
      <div className="space-y-2">
        {data.options.map((opt, idx) => {
          let cls = 'border hp-text-secondary';
          if (answer !== null) {
            if (idx === data.correct_index) cls = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300';
            else if (idx === answer) cls = 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300';
            else cls = 'border opacity-40 hp-text-quaternary';
          } else {
            cls = 'border hover:border-cyan-400 dark:hover:border-cyan-500 hp-text-secondary';
          }
          return (
            <button key={idx} onClick={() => answer === null && onAnswer(idx)} disabled={answer !== null} className={`w-full text-left p-3 rounded-lg text-xs transition-all ${cls}`} style={answer === null ? { borderColor: 'var(--hp-surface-border)' } : {}}>
              <span className="font-bold mr-2 hp-text-quaternary">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}
