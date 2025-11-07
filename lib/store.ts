import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Question, QuestionSet } from './types';

export interface UserAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timestamp: number;
}

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

  // Question set management
  currentQuestionSetId: string | null;
  availableQuestionSets: QuestionSet[];

  // Actions
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  submitAnswer: (questionId: number, selectedAnswer: string, isCorrect: boolean) => void;
  startExam: (duration: number, mode?: 'practice' | 'exam', useTimer?: boolean, learnWithAI?: boolean) => void;
  completeExam: () => void;
  resetExam: () => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;
  getScore: () => { correct: number; total: number; percentage: number };
  updateQuestionExplanation: (questionId: number, explanation: string) => void;
  editQuestion: (questionId: number, updatedQuestion: Question) => void;

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

      // Question set management
      currentQuestionSetId: null,
      availableQuestionSets: [],

      setQuestions: (questions) => set({ questions }),

      setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),

      submitAnswer: (questionId, selectedAnswer, isCorrect) =>
        set((state) => {
          const newAnswers = new Map(state.userAnswers);
          newAnswers.set(questionId, {
            questionId,
            selectedAnswer,
            isCorrect,
            timestamp: Date.now(),
          });
          return { userAnswers: newAnswers };
        }),

      startExam: (duration, mode = 'exam', useTimer = true, learnWithAI = false) =>
        set({
          isExamStarted: true,
          isExamCompleted: false,
          examStartTime: Date.now(),
          examDuration: duration,
          mode,
          useTimer,
          learnWithAI: mode === 'practice' ? learnWithAI : false, // Only enable in practice mode
          currentQuestionIndex: 0,
          userAnswers: new Map(),
        }),

      completeExam: () => set({ isExamCompleted: true }),

      resetExam: () =>
        set({
          currentQuestionIndex: 0,
          userAnswers: new Map(),
          isExamStarted: false,
          isExamCompleted: false,
          examStartTime: null,
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
        questions: state.questions, // ✅ Persist current questions
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
      }),
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.userAnswers)) {
          state.userAnswers = new Map(state.userAnswers as any);
        }
      },
    }
  )
);
