'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import QuestionCard from '@/components/QuestionCard';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import EvaluationPane from '@/components/EvaluationPane';
import CognitiveCompanion from '@/components/CognitiveCompanion';
import SocraticDialogue from '@/components/SocraticDialogue';
import LiveStatsOverlay from '@/components/LiveStatsOverlay';
import { ChevronLeft, ChevronRight, Trophy, AlertCircle, MessageCircle, BarChart3 } from 'lucide-react';

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
    submitAnswer,
    nextQuestion,
    previousQuestion,
    completeExam,
    recordQuestionView,
    recordSelectionChange,
    showLiveStats,
    toggleLiveStats,
  } = useExamStore();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showCognitiveCompanion, setShowCognitiveCompanion] = useState(false);
  const [showSocratic, setShowSocratic] = useState(false);
  const [ccDismissed, setCcDismissed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isExamStarted) {
      router.push('/');
      return;
    }

    if (questions.length === 0) {
      // No questions loaded, redirect to home
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
        setShowCognitiveCompanion(false);
        setShowSocratic(false);
        setCcDismissed(false);
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
    // User explicitly wants to review their answer
    const savedAnswer = userAnswers.get(currentQuestion.id);
    const isWrong = savedAnswer && savedAnswer.selectedAnswer !== currentQuestion.correctAnswer;

    if (isWrong && cognitiveCompanion) {
      // Show Cognitive Companion for wrong answers when enabled
      setShowCognitiveCompanion(true);
      setShowExplanation(false);
      setShowSocratic(false);
    } else if (isWrong && socraticMode && !cognitiveCompanion) {
      // Show Socratic Dialogue for wrong answers when Socratic enabled (and CC not enabled)
      setShowSocratic(true);
      setShowExplanation(false);
      setShowCognitiveCompanion(false);
    } else {
      // Standard evaluation pane
      setShowExplanation(true);
      setShowCognitiveCompanion(false);
      setShowSocratic(false);
    }
  };

  const handleCloseCognitiveCompanion = () => {
    setShowCognitiveCompanion(false);
    setCcDismissed(true);
    // Show standard evaluation pane after CC is closed
    setShowExplanation(true);
  };

  const handleNext = () => {
    setShowExplanation(false);
    setShowCognitiveCompanion(false);
    setShowSocratic(false);
    setCcDismissed(false);
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    } else {
      // Exam completed
      completeExam();
      router.push('/results');
    }
  };

  const handlePrevious = () => {
    setShowExplanation(false);
    setShowCognitiveCompanion(false);
    setShowSocratic(false);
    setCcDismissed(false);
    previousQuestion();
  };

  const handleTimeUp = () => {
    completeExam();
    router.push('/results');
  };

  const handleFinishExam = () => {
    if (
      confirm(
        `You have answered ${answeredCount} out of ${questions.length} questions. Are you sure you want to finish the exam?`
      )
    ) {
      completeExam();
      router.push('/results');
    }
  };

  // Compute response time for current question (snapshot at submit time)
  const currentResponseTimeMs = useMemo(() => {
    const viewTime = questionViewTimes.get(currentQuestion.id);
    if (!viewTime || !isAnswered) return 0;
    const savedAnswer = userAnswers.get(currentQuestion.id);
    // Use the saved answer timestamp if available, otherwise estimate
    return savedAnswer?.timestamp ? savedAnswer.timestamp - viewTime : 15000;
  }, [currentQuestion.id, isAnswered, questionViewTimes, userAnswers]);
  const currentSelectionChanges = selectionChanges.get(currentQuestion.id) || 0;

  // Check if the current answer is wrong (for showing Socratic button after CC dismissal)
  const savedUserAnswer = userAnswers.get(currentQuestion.id);
  const isCurrentAnswerWrong = savedUserAnswer && savedUserAnswer.selectedAnswer !== currentQuestion.correctAnswer;
  const showSocraticButton = ccDismissed && socraticMode && isCurrentAnswerWrong && !showSocratic && reviewAnswers;

  const anySidePaneOpen = showExplanation || showCognitiveCompanion || showSocratic;

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
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Practice Exam
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">AI-Powered Questions</p>
            </div>

            <div className="flex items-center gap-4">
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
                className="px-4 py-2 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Trophy className="w-4 h-4" />
                Finish Exam
              </button>
            </div>
          </div>

          <div className="mt-4">
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
        <div className={`transition-all duration-300 ${anySidePaneOpen ? 'lg:w-2/3' : 'w-full'} px-4 py-8`}>
          <div className="max-w-4xl mx-auto">
            {/* Warning if unanswered */}
            {!isAnswered && answeredCount > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center gap-3 transition-colors">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
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

            {/* Navigation */}
            <div className="flex justify-between items-center mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                  currentQuestionIndex === 0
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>

              <div className="flex gap-3">
                {isAnswered && !anySidePaneOpen && reviewAnswers && (
                  <button
                    onClick={handleReviewAnswer}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    Review Answer
                  </button>
                )}

                {showSocraticButton && (
                  <button
                    onClick={() => {
                      setShowSocratic(true);
                      setShowExplanation(false);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Try Socratic Dialogue
                  </button>
                )}

                {isAnswered && (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
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

        {/* Cognitive Companion Pane */}
        {selectedAnswer && showCognitiveCompanion && reviewAnswers && (
          <CognitiveCompanion
            isOpen={showCognitiveCompanion}
            onClose={handleCloseCognitiveCompanion}
            question={currentQuestion.question}
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={currentQuestion.correctAnswer}
            questionId={currentQuestion.id}
            responseTimeMs={currentResponseTimeMs}
            selectionChanges={currentSelectionChanges}
            consecutiveIncorrect={sessionMetrics.consecutiveIncorrect}
            category={currentQuestion.category}
            difficulty={currentQuestion.difficulty}
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
            onResolved={() => {
              // Optionally show evaluation after resolution
            }}
          />
        )}
      </div>
    </div>
  );
}
