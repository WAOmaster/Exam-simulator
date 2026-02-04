import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, QuestionSet, SessionMetrics } from './types';

export interface UserAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

const defaultSessionMetrics: SessionMetrics = {
  totalTimeSpent: 0,
  averageResponseTime: 0,
  consecutiveCorrect: 0,
  consecutiveIncorrect: 0,
  streakHistory: [],
  categoryPerformance: {},
};

interface ExamState {
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: Map<number, UserAnswer>;
  isExamStarted: boolean;
  isExamCompleted: boolean;
  examStartTime: number | null;
  examDuration: number; // in minutes
  mode: 'practice' | 'exam';
  useTimer: boolean;
  learnWithAI: boolean; // AI-guided learning (practice mode only)
  reviewAnswers: boolean; // Review answers during exam (exam mode only)
  cognitiveCompanion: boolean; // AI diagnostic reasoning (both modes)
  socraticMode: boolean; // Socratic dialogue (both modes)

  // Enhanced tracking for Cognitive Companion
  sessionMetrics: SessionMetrics;
  questionViewTimes: Map<number, number>; // questionId → timestamp when first viewed
  selectionChanges: Map<number, number>; // questionId → count of answer changes

  // Question set management
  currentQuestionSetId: string | null;
  availableQuestionSets: QuestionSet[];

  // Actions
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  submitAnswer: (questionId: number, selectedAnswer: string, isCorrect: boolean) => void;
  startExam: (duration: number, mode?: 'practice' | 'exam', useTimer?: boolean, learnWithAI?: boolean, reviewAnswers?: boolean, cognitiveCompanion?: boolean, socraticMode?: boolean) => void;
  completeExam: () => void;
  resetExam: () => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  getScore: () => { correct: number; total: number; percentage: number };
  updateQuestionExplanation: (questionId: number, explanation: string) => void;
  editQuestion: (questionId: number, updatedQuestion: Question) => void;

  // Enhanced tracking actions
  recordQuestionView: (questionId: number) => void;
  recordSelectionChange: (questionId: number) => void;

  // Question set actions
  setCurrentQuestionSet: (questionSetId: string) => void;
  loadQuestionSets: (sets: QuestionSet[]) => void;
  addQuestionSet: (set: QuestionSet) => void;
}

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      questions: [],
      currentQuestionIndex: 0,
      userAnswers: new Map(),
      isExamStarted: false,
      isExamCompleted: false,
      examStartTime: null,
      examDuration: 90, // default 90 minutes
      mode: 'exam',
      useTimer: true,
      learnWithAI: false,
      reviewAnswers: false,
      cognitiveCompanion: false,
      socraticMode: false,

      // Enhanced tracking
      sessionMetrics: { ...defaultSessionMetrics },
      questionViewTimes: new Map(),
      selectionChanges: new Map(),

      // Question set management
      currentQuestionSetId: null,
      availableQuestionSets: [],

      setQuestions: (questions) => set({ questions }),

      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      recordQuestionView: (questionId) =>
        set((state) => {
          if (state.questionViewTimes.has(questionId)) return {}; // Already recorded
          const newViewTimes = new Map(state.questionViewTimes);
          newViewTimes.set(questionId, Date.now());
          return { questionViewTimes: newViewTimes };
        }),

      recordSelectionChange: (questionId) =>
        set((state) => {
          const newChanges = new Map(state.selectionChanges);
          newChanges.set(questionId, (newChanges.get(questionId) || 0) + 1);
          return { selectionChanges: newChanges };
        }),

      submitAnswer: (questionId, selectedAnswer, isCorrect) =>
        set((state) => {
          const newAnswers = new Map(state.userAnswers);
          newAnswers.set(questionId, {
            questionId,
            selectedAnswer,
            isCorrect,
            timestamp: Date.now(),
          });

          // Update session metrics
          const newStreak = [...state.sessionMetrics.streakHistory, isCorrect ? 'correct' as const : 'incorrect' as const];
          const consecutiveCorrect = isCorrect ? state.sessionMetrics.consecutiveCorrect + 1 : 0;
          const consecutiveIncorrect = !isCorrect ? state.sessionMetrics.consecutiveIncorrect + 1 : 0;

          // Calculate response time
          const viewTime = state.questionViewTimes.get(questionId);
          const responseTimeMs = viewTime ? Date.now() - viewTime : 0;
          const answeredCount = newAnswers.size;
          const prevAvg = state.sessionMetrics.averageResponseTime;
          const newAvg = answeredCount > 1
            ? (prevAvg * (answeredCount - 1) + responseTimeMs) / answeredCount
            : responseTimeMs;

          // Update category performance
          const question = state.questions.find(q => q.id === questionId);
          const category = question?.category || 'Unknown';
          const catPerf = { ...state.sessionMetrics.categoryPerformance };
          if (!catPerf[category]) catPerf[category] = { correct: 0, total: 0 };
          catPerf[category] = {
            correct: catPerf[category].correct + (isCorrect ? 1 : 0),
            total: catPerf[category].total + 1,
          };

          return {
            userAnswers: newAnswers,
            sessionMetrics: {
              ...state.sessionMetrics,
              streakHistory: newStreak,
              consecutiveCorrect,
              consecutiveIncorrect,
              averageResponseTime: newAvg,
              totalTimeSpent: state.sessionMetrics.totalTimeSpent + responseTimeMs,
              categoryPerformance: catPerf,
            },
          };
        }),

      startExam: (duration, mode = 'exam', useTimer = true, learnWithAI = false, reviewAnswers = false, cognitiveCompanion = false, socraticMode = false) =>
        set({
          isExamStarted: true,
          isExamCompleted: false,
          examStartTime: Date.now(),
          examDuration: duration,
          mode,
          useTimer,
          learnWithAI: mode === 'practice' ? learnWithAI : false, // Only enable in practice mode
          reviewAnswers: mode === 'exam' ? reviewAnswers : false, // Only enable in exam mode
          cognitiveCompanion,
          socraticMode,
          currentQuestionIndex: 0,
          userAnswers: new Map(),
          sessionMetrics: { ...defaultSessionMetrics },
          questionViewTimes: new Map(),
          selectionChanges: new Map(),
        }),

      completeExam: () => set({ isExamCompleted: true }),

      resetExam: () =>
        set({
          currentQuestionIndex: 0,
          userAnswers: new Map(),
          isExamStarted: false,
          isExamCompleted: false,
          examStartTime: null,
          sessionMetrics: { ...defaultSessionMetrics },
          questionViewTimes: new Map(),
          selectionChanges: new Map(),
        }),

      nextQuestion: () =>
        set((state) => {
          const nextIndex = Math.min(
            state.currentQuestionIndex + 1,
            state.questions.length - 1
          );
          return { currentQuestionIndex: nextIndex };
        }),

      previousQuestion: () =>
        set((state) => ({
          currentQuestionIndex: Math.max(state.currentQuestionIndex - 1, 0),
        })),

      goToQuestion: (index) => set({ currentQuestionIndex: index }),

      getScore: () => {
        const state = get();
        const total = state.questions.length;
        const correct = Array.from(state.userAnswers.values()).filter(
          (answer) => answer.isCorrect
        ).length;
        const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
        return { correct, total, percentage };
      },

      updateQuestionExplanation: (questionId, explanation) =>
        set((state) => {
          // Update the question in the questions array
          const updatedQuestions = state.questions.map((q) =>
            q.id === questionId ? { ...q, explanation } : q
          );

          // Also update in available question sets if this question belongs to one
          const updatedQuestionSets = state.availableQuestionSets.map((questionSet) => {
            const hasQuestion = questionSet.questions.some((q) => q.id === questionId);
            if (hasQuestion) {
              return {
                ...questionSet,
                questions: questionSet.questions.map((q) =>
                  q.id === questionId ? { ...q, explanation } : q
                ),
              };
            }
            return questionSet;
          });

          return {
            questions: updatedQuestions,
            availableQuestionSets: updatedQuestionSets,
          };
        }),

      editQuestion: (questionId, updatedQuestion) =>
        set((state) => {
          // Update the question in the questions array
          const updatedQuestions = state.questions.map((q) =>
            q.id === questionId ? { ...updatedQuestion, id: questionId } : q
          );

          // Also update in available question sets if this question belongs to one
          const updatedQuestionSets = state.availableQuestionSets.map((questionSet) => {
            const hasQuestion = questionSet.questions.some((q) => q.id === questionId);
            if (hasQuestion) {
              return {
                ...questionSet,
                questions: questionSet.questions.map((q) =>
                  q.id === questionId ? { ...updatedQuestion, id: questionId } : q
                ),
                updatedAt: new Date().toISOString(),
              };
            }
            return questionSet;
          });

          return {
            questions: updatedQuestions,
            availableQuestionSets: updatedQuestionSets,
          };
        }),

      // Question set actions
      setCurrentQuestionSet: (questionSetId) => {
        const state = get();
        console.log('setCurrentQuestionSet called with ID:', questionSetId);
        console.log('Available question sets:', state.availableQuestionSets.length);

        const questionSet = state.availableQuestionSets.find(set => set.id === questionSetId);

        if (questionSet) {
          console.log('Found question set:', questionSet.title, 'with', questionSet.questions.length, 'questions');
          set({
            currentQuestionSetId: questionSetId,
            questions: questionSet.questions,
          });
        } else {
          console.error('Question set not found with ID:', questionSetId);
          console.log('Available IDs:', state.availableQuestionSets.map(s => s.id));
        }
      },

      loadQuestionSets: (sets) => set({ availableQuestionSets: sets }),

      addQuestionSet: (questionSet) => {
        const state = get();
        set({
          availableQuestionSets: [...state.availableQuestionSets, questionSet],
        });
      },
    }),
    {
      name: 'exam-generator-storage',
      partialize: (state) => ({
        questions: state.questions,
        userAnswers: Array.from(state.userAnswers.entries()),
        isExamStarted: state.isExamStarted,
        isExamCompleted: state.isExamCompleted,
        examStartTime: state.examStartTime,
        examDuration: state.examDuration,
        currentQuestionIndex: state.currentQuestionIndex,
        mode: state.mode,
        useTimer: state.useTimer,
        currentQuestionSetId: state.currentQuestionSetId,
        availableQuestionSets: state.availableQuestionSets,
        sessionMetrics: state.sessionMetrics,
        questionViewTimes: Array.from(state.questionViewTimes.entries()),
        selectionChanges: Array.from(state.selectionChanges.entries()),
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.userAnswers)) {
          state.userAnswers = new Map(state.userAnswers as any);
        }
        if (state && Array.isArray(state.questionViewTimes)) {
          state.questionViewTimes = new Map(state.questionViewTimes as any);
        }
        if (state && Array.isArray(state.selectionChanges)) {
          state.selectionChanges = new Map(state.selectionChanges as any);
        }
      },
    }
  )
);
