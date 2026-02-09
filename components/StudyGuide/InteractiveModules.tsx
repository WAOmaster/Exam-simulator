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
  Star,
  Zap,
  Award,
} from 'lucide-react';
import type { LearningPlan } from '@/lib/types';
import type { WeakConcept } from '@/lib/diagnosisHistory';

interface InteractiveModulesProps {
  weakConcepts: WeakConcept[];
  weakCategories: { category: string; accuracy: number; total: number }[];
}

const STEPS = [
  { num: 1, label: 'Think', icon: MessageCircle, points: 10 },
  { num: 2, label: 'Learn', icon: Eye, points: 0 },
  { num: 3, label: 'Practice', icon: Dumbbell, points: 45 },
  { num: 4, label: 'Verify', icon: CheckCircle, points: 25 },
] as const;

const COMPLIMENTS = [
  "Outstanding! You've mastered this concept!",
  "Brilliant work! Knowledge gap: closed!",
  "Excellent! You're on fire!",
  "Incredible focus! You nailed it!",
  "Superb understanding! Keep it up!",
  "Perfect! That concept is locked in!",
];

function getRandomCompliment(): string {
  return COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
}

function getStarRating(points: number): number {
  if (points >= 70) return 3;
  if (points >= 40) return 2;
  return 1;
}

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
  earnedPoints: number;
  completed: boolean;
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
    earnedPoints: 0,
    completed: false,
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
    const state = getState(module.key);
    if (state.completed) return; // Don't collapse completed modules on header click

    if (expandedModule === module.key) {
      setExpandedModule(null);
    } else {
      setExpandedModule(module.key);
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
            className={`rounded-xl border overflow-hidden ${state.completed ? 'border-emerald-300 dark:border-emerald-700' : ''}`}
            style={!state.completed ? { borderColor: 'var(--hp-surface-border)', backgroundColor: 'var(--hp-surface)' } : { backgroundColor: 'var(--hp-surface)' }}
          >
            {/* Accordion Header */}
            <button
              onClick={() => toggleModule(module)}
              className={`w-full p-4 flex items-center justify-between text-left transition-colors ${
                state.completed
                  ? 'bg-emerald-50/50 dark:bg-emerald-900/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  state.completed
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20'
                    : 'bg-gradient-to-br from-cyan-500/10 to-teal-500/10 dark:from-cyan-500/20 dark:to-teal-500/20 border border-cyan-500/15'
                }`}>
                  {state.completed ? (
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-500" />
                  ) : (
                    <GraduationCap className="w-4.5 h-4.5 hp-icon-cyan" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold hp-text-primary text-sm truncate">{module.concept}</h4>
                    {state.completed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        Done
                      </span>
                    )}
                    {state.earnedPoints > 0 && !state.completed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-bold flex items-center gap-0.5">
                        <Zap className="w-3 h-3" />
                        {state.earnedPoints} pts
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] hp-text-quaternary">{module.category}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">{module.frequency}x</span>
                  </div>
                </div>
              </div>
              {!state.completed && (
                isExpanded ? (
                  <ChevronUp className="w-4 h-4 hp-text-quaternary shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 hp-text-quaternary shrink-0" />
                )
              )}
            </button>

            {/* Expanded Content */}
            <AnimatePresence>
              {isExpanded && !state.completed && (
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

// Inline module renderer
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
  const { currentStep, socraticAnswer, showHint, practiceIndex, practiceAnswers, practiceResults, verifyAnswer, verifyResult, earnedPoints } = state;

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
      {/* Points display */}
      {earnedPoints > 0 && verifyResult !== 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-full bg-gradient-to-r from-amber-100/80 to-orange-100/80 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200/50 dark:border-amber-700/30 mx-auto w-fit"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{earnedPoints} / 80 pts</span>
        </motion.div>
      )}

      {/* Step Progress */}
      <div className="flex items-center justify-between">
        {STEPS.map(({ num, label, icon: Icon, points: stepPts }, idx) => (
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
              {stepPts > 0 && (
                <span className={`text-[8px] font-bold ${
                  currentStep > num ? 'text-emerald-500' : 'hp-text-quaternary'
                }`}>
                  +{stepPts}
                </span>
              )}
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
              onAnswer={(idx) => {
                const isCorrect = idx === plan.socratic_opener.correct_index;
                const pts = isCorrect && socraticAnswer === null ? 10 : 0;
                onUpdateState({ socraticAnswer: idx, earnedPoints: earnedPoints + pts });
              }}
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
                const pts = isCorrect ? 15 : 0;
                onUpdateState({
                  practiceAnswers: newAnswers,
                  practiceResults: newResults,
                  earnedPoints: earnedPoints + pts,
                });
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
              earnedPoints={earnedPoints}
              onAnswer={(idx) => {
                const isCorrect = idx === plan.verification.correct_index;
                const result = isCorrect ? 'success' : 'retry';
                const pts = isCorrect ? 25 : 0;
                onUpdateState({
                  verifyAnswer: idx,
                  verifyResult: result as any,
                  earnedPoints: earnedPoints + pts,
                  completed: isCorrect,
                });
              }}
              onRetry={() => {
                // Full reset — go back to step 1
                onUpdateState({
                  currentStep: 1,
                  socraticAnswer: null,
                  showHint: false,
                  practiceIndex: 0,
                  practiceAnswers: new Map(),
                  practiceResults: new Map(),
                  verifyAnswer: null,
                  verifyResult: 'pending',
                  earnedPoints: 0,
                });
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
        {canProceed() && currentStep < 4 && (
          <button
            onClick={handleNext}
            className="flex items-center gap-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg transition-all"
          >
            Continue
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
      {correct && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-xs text-emerald-700 dark:text-emerald-300"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="font-bold">+10 pts</span>
          </div>
          {data.expected_insight}
        </motion.div>
      )}
      {!correct && answer !== null && !showHint && (
        <button onClick={onShowHint} className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <Lightbulb className="w-3.5 h-3.5" />Show hint
        </button>
      )}
      {showHint && <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-xs text-amber-700 dark:text-amber-300"><Lightbulb className="w-3.5 h-3.5 inline mr-1" />{data.hint_if_stuck}</div>}
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
      {answered && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-2.5 rounded-lg text-xs ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'}`}
        >
          {isCorrect && <span className="font-bold">+15 pts — </span>}
          {q.explanation}
        </motion.div>
      )}
      {answered && practiceIndex < questions.length - 1 && (
        <button onClick={onNextPractice} className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-medium rounded-lg flex items-center justify-center gap-1">
          Next Question <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
      {allDone && (
        <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg text-center text-xs text-emerald-700 dark:text-emerald-300 font-medium">
          All practice complete! Continue to verification.
        </div>
      )}
    </div>
  );
}

function StepVerify({ data, answer, result, sources, earnedPoints, onAnswer, onRetry }: {
  data: LearningPlan['verification'];
  answer: number | null;
  result: 'pending' | 'success' | 'retry';
  sources: LearningPlan['grounded_sources'];
  earnedPoints: number;
  onAnswer: (idx: number) => void;
  onRetry: () => void;
}) {
  if (result === 'success') {
    const stars = getStarRating(earnedPoints);
    const compliment = getRandomCompliment();

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="p-6 bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl text-center relative overflow-hidden"
      >
        {/* Celebration particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                background: ['#10b981', '#06b6d4', '#f59e0b', '#8b5cf6', '#ec4899'][i % 5],
                left: `${10 + (i * 12)}%`,
                top: '-10%',
              }}
              animate={{
                y: [0, 200, 300],
                x: [0, (i % 2 ? 30 : -30), (i % 2 ? -20 : 20)],
                opacity: [1, 0.8, 0],
                scale: [1, 1.2, 0.5],
              }}
              transition={{
                duration: 2,
                delay: i * 0.1,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>

        <motion.div
          animate={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        </motion.div>

        {/* Star rating */}
        <div className="flex items-center justify-center gap-1 mb-2">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + s * 0.15, type: 'spring', damping: 10 }}
            >
              <Star className={`w-6 h-6 ${s <= stars ? 'text-amber-400 fill-amber-400' : 'text-gray-300 dark:text-gray-600'}`} />
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <span className="text-lg font-black text-cyan-700 dark:text-cyan-300">{earnedPoints} pts</span>
          </div>
          <h4 className="font-bold text-emerald-800 dark:text-emerald-200 text-sm mb-1">Knowledge Gap Closed!</h4>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">{compliment}</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400">{data.success_message}</p>
        </motion.div>

        {sources && sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-700 text-left">
            <p className="text-[10px] font-semibold hp-text-tertiary mb-1">Further reading:</p>
            {sources.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline mt-0.5">
                <ExternalLink className="w-3 h-3 shrink-0" />{s.title}
              </a>
            ))}
          </div>
        )}
      </motion.div>
    );
  }

  if (result === 'retry') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl text-center"
      >
        <RotateCcw className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <h4 className="font-bold text-amber-800 dark:text-amber-200 text-sm mb-1">Not Quite There</h4>
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-1">{data.retry_message}</p>
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-3 italic">
          Let&apos;s try again from the beginning — you&apos;ve got this!
        </p>
        <button onClick={onRetry} className="flex items-center gap-1.5 mx-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-lg transition-all shadow-sm">
          <RotateCcw className="w-3.5 h-3.5" />
          Start Over
        </button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm hp-text-primary font-medium">{data.question}</p>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 font-bold">
          +25 pts
        </span>
      </div>
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
