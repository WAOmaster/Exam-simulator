'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import QuestionCard from '@/components/QuestionCard';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import EvaluationPane from '@/components/EvaluationPane';
import CognitiveCompanionIndicator from '@/components/CognitiveCompanionIndicator';
import SocraticDialogue from '@/components/SocraticDialogue';
import LiveStatsOverlay from '@/components/LiveStatsOverlay';
import { cognitiveQueue } from '@/lib/cognitiveQueue';
import { ChevronLeft, ChevronRight, Trophy, AlertCircle, MessageCircle, BarChart3, Brain } from 'lucide-react';

export default function ExamPage() {
  const router = useRouter();
  const {
    questions,
    currentQuestionIndex,
    userAnswers,
    isExamStarted,
    examStartTime,
    examDuration,
    useTimer,
    reviewAnswers,
    cognitiveCompanion,
    socraticMode,
    sessionMetrics,
    questionViewTimes,
    selectionChanges,
    diagnosisResults,
    submitAnswer,
    nextQuestion,
    previousQuestion,
    completeExam,
    recordQuestionView,
    recordSelectionChange,
    showLiveStats,
    toggleLiveStats,
    updateDiagnosisResults,
  } = useExamStore();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showSocratic, setShowSocratic] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [queueSummary, setQueueSummary] = useState({ total: 0, completed: 0, processing: 0 });

  // Subscribe to cognitive queue updates
  useEffect(() => {
    if (!cognitiveCompanion) return;

    // Reset queue for new session
    cognitiveQueue.reset();

    const unsubscribe = cognitiveQueue.subscribe((results) => {
      updateDiagnosisResults(results);
      const summary = cognitiveQueue.getSummary();
      setQueueSummary({ total: summary.total, completed: summary.completed, processing: summary.processing + summary.pending });
    });

    return () => unsubscribe();
  }, [cognitiveCompanion, updateDiagnosisResults]);

  useEffect(() => {
    if (!isExamStarted) {
      router.push('/');
      return;
    }

    if (questions.length === 0) {
      router.push('/');
    }
  }, [isExamStarted, questions.length, router]);

  // Track question view time
  useEffect(() => {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      recordQuestionView(currentQuestion.id);
    }
  }, [currentQuestionIndex]);

  useEffect(() => {
    // Load saved answer for current question
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const savedAnswer = userAnswers.get(currentQuestion.id);
      setSelectedAnswer(savedAnswer?.selectedAnswer || null);
      if (!savedAnswer) {
        setShowExplanation(false);
        setShowSocratic(false);
      }
    }
  }, [currentQuestionIndex, userAnswers]);

  if (!isExamStarted || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isAnswered = userAnswers.has(currentQuestion.id);
  const answeredCount = userAnswers.size;

  const handleAnswerSelect = (answerId: string) => {
    if (!isAnswered) {
      // Track selection changes
      if (selectedAnswer && selectedAnswer !== answerId) {
        recordSelectionChange(currentQuestion.id);
      }
      setSelectedAnswer(answerId);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAnswer) return;

    setIsSubmitting(true);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    // Submit the answer
    submitAnswer(currentQuestion.id, selectedAnswer, isCorrect);

    // Enqueue background diagnosis for wrong answers
    if (!isCorrect && cognitiveCompanion) {
      const viewTime = questionViewTimes.get(currentQuestion.id);
      const responseTimeMs = viewTime ? Date.now() - viewTime : 15000;
      const selChanges = selectionChanges.get(currentQuestion.id) || 0;

      cognitiveQueue.enqueue({
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        options: currentQuestion.options,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        responseTimeMs,
        selectionChanges: selChanges,
        consecutiveIncorrect: sessionMetrics.consecutiveIncorrect,
        category: currentQuestion.category,
        difficulty: currentQuestion.difficulty,
      });
    }

    // In exam mode without review, auto-advance to next question
    setTimeout(() => {
      setIsSubmitting(false);

      // Auto-advance if review answers is disabled
      if (!reviewAnswers) {
        setTimeout(() => {
          handleNext();
        }, 300);
      }
    }, 300);
  };

  const handleReviewAnswer = () => {
    const savedAnswer = userAnswers.get(currentQuestion.id);
    const isWrong = savedAnswer && savedAnswer.selectedAnswer !== currentQuestion.correctAnswer;

    if (isWrong && socraticMode) {
      setShowSocratic(true);
      setShowExplanation(false);
    } else {
      setShowExplanation(true);
      setShowSocratic(false);
    }
  };

  const handleNext = () => {
    setShowExplanation(false);
    setShowSocratic(false);
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    } else {
      if (cognitiveCompanion) cognitiveQueue.flush();
      completeExam();
      router.push('/results');
    }
  };

  const handlePrevious = () => {
    setShowExplanation(false);
    setShowSocratic(false);
    previousQuestion();
  };

  const handleTimeUp = () => {
    if (cognitiveCompanion) cognitiveQueue.flush();
    completeExam();
    router.push('/results');
  };

  const handleFinishExam = () => {
    if (
      confirm(
        `You have answered ${answeredCount} out of ${questions.length} questions. Are you sure you want to finish the exam?`
      )
    ) {
      if (cognitiveCompanion) cognitiveQueue.flush();
      completeExam();
      router.push('/results');
    }
  };

  // Compute response time for current question
  const currentResponseTimeMs = useMemo(() => {
    const viewTime = questionViewTimes.get(currentQuestion.id);
    if (!viewTime || !isAnswered) return 0;
    const savedAnswer = userAnswers.get(currentQuestion.id);
    return savedAnswer?.timestamp ? savedAnswer.timestamp - viewTime : 15000;
  }, [currentQuestion.id, isAnswered, questionViewTimes, userAnswers]);
  const currentSelectionChanges = selectionChanges.get(currentQuestion.id) || 0;

  // Check current answer state
  const savedUserAnswer = userAnswers.get(currentQuestion.id);
  const isCurrentAnswerWrong = savedUserAnswer && savedUserAnswer.selectedAnswer !== currentQuestion.correctAnswer;

  const anySidePaneOpen = showExplanation || showSocratic;

  // Get diagnosis result for current question
  const currentDiagnosisResult = diagnosisResults.get(currentQuestion.id);

  // Compute max streak from streak history
  const maxStreak = useMemo(() => {
    let max = 0;
    let current = 0;
    sessionMetrics.streakHistory.forEach((result) => {
      if (result === 'correct') {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    });
    return max;
  }, [sessionMetrics.streakHistory]);

  // Live stats data for overlay
  const liveStatsData = useMemo(() => ({
    currentStreak: sessionMetrics.consecutiveCorrect,
    maxStreak,
    responseTimeMs: currentResponseTimeMs,
    averageResponseTimeMs: sessionMetrics.averageResponseTime,
    selectionChanges: currentSelectionChanges,
    questionsAnswered: answeredCount,
    totalQuestions: questions.length,
    categoryAccuracy: sessionMetrics.categoryPerformance,
  }), [
    sessionMetrics.consecutiveCorrect,
    maxStreak,
    currentResponseTimeMs,
    sessionMetrics.averageResponseTime,
    currentSelectionChanges,
    answeredCount,
    questions.length,
    sessionMetrics.categoryPerformance,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30 transition-colors border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">
                Practice Exam
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 hidden sm:block">AI-Powered Questions</p>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* CC Queue Status */}
              {cognitiveCompanion && queueSummary.total > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {queueSummary.completed}/{queueSummary.total}
                  </span>
                  {queueSummary.processing > 0 && (
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                  )}
                </div>
              )}

              {useTimer && examStartTime && (
                <Timer
                  startTime={examStartTime}
                  duration={examDuration}
                  onTimeUp={handleTimeUp}
                />
              )}

              <button
                onClick={toggleLiveStats}
                className={`p-2 rounded-lg transition-colors ${
                  showLiveStats
                    ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
                title={showLiveStats ? 'Hide Live Stats' : 'Show Live Stats'}
              >
                <BarChart3 className="w-5 h-5" />
              </button>

              <button
                onClick={handleFinishExam}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white text-sm sm:text-base font-medium rounded-lg transition-colors flex items-center gap-1.5 sm:gap-2"
              >
                <Trophy className="w-4 h-4" />
                <span className="hidden sm:inline">Finish Exam</span>
                <span className="sm:hidden">Finish</span>
              </button>
            </div>
          </div>

          <div className="mt-2 sm:mt-4">
            <ProgressBar
              current={currentQuestionIndex}
              total={questions.length}
              answered={answeredCount}
            />
          </div>
        </div>
      </div>

      {/* Live Stats Overlay */}
      {showLiveStats && (
        <LiveStatsOverlay
          stats={liveStatsData}
          onToggleMinimize={toggleLiveStats}
        />
      )}

      {/* Main Content - Split Layout */}
      <div className="flex">
        {/* Question Section */}
        <div className={`transition-all duration-300 ${anySidePaneOpen ? 'lg:w-2/3' : 'w-full'} px-3 sm:px-4 py-4 sm:py-8`}>
          <div className="max-w-4xl mx-auto">
            {/* Warning if unanswered */}
            {!isAnswered && answeredCount > 0 && (
              <div className="mb-3 sm:mb-4 p-3 sm:p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center gap-2 sm:gap-3 transition-colors">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-yellow-800 dark:text-yellow-300">
                  You haven&apos;t answered this question yet. Select an answer and submit.
                </p>
              </div>
            )}

            <QuestionCard
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={selectedAnswer}
              onAnswerSelect={handleAnswerSelect}
              onSubmit={handleSubmit}
              isSubmitted={isAnswered}
              isLoading={isSubmitting}
              showFeedback={reviewAnswers}
            />

            {/* CC Indicator - inline below question when answered wrong */}
            {isAnswered && isCurrentAnswerWrong && cognitiveCompanion && (
              <CognitiveCompanionIndicator
                result={currentDiagnosisResult}
                questionId={currentQuestion.id}
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-4 sm:mt-6 gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Prev</span>
              </button>

              <div className="flex gap-2 sm:gap-3">
                {isAnswered && !anySidePaneOpen && reviewAnswers && (
                  <button
                    onClick={handleReviewAnswer}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg text-sm sm:text-base font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <span className="hidden sm:inline">Review Answer</span>
                    <span className="sm:hidden">Review</span>
                  </button>
                )}

                {isAnswered && (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-1 sm:gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    {currentQuestionIndex < questions.length - 1 ? (
                      <>
                        Next
                        <ChevronRight className="w-5 h-5" />
                      </>
                    ) : (
                      <>
                        Finish
                        <Trophy className="w-5 h-5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Pane */}
        {showExplanation && selectedAnswer && (
          <EvaluationPane
            isOpen={showExplanation}
            onClose={() => setShowExplanation(false)}
            question={currentQuestion.question}
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={currentQuestion.correctAnswer}
            isCorrect={selectedAnswer === currentQuestion.correctAnswer}
            explanation={currentQuestion.explanation}
            questionId={currentQuestion.id}
          />
        )}

        {/* Socratic Dialogue Pane */}
        {selectedAnswer && showSocratic && reviewAnswers && (
          <SocraticDialogue
            isOpen={showSocratic}
            onClose={() => {
              setShowSocratic(false);
              setShowExplanation(true);
            }}
            question={currentQuestion.question}
            options={currentQuestion.options}
            correctAnswer={currentQuestion.correctAnswer}
            userAnswer={selectedAnswer}
            onResolved={() => {}}
          />
        )}
      </div>
    </div>
  );
}
