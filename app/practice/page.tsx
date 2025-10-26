'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import Timer from '@/components/Timer';
import ProgressBar from '@/components/ProgressBar';
import EvaluationPane from '@/components/EvaluationPane';
import { ChevronLeft, ChevronRight, Home, AlertCircle } from 'lucide-react';

export default function PracticePage() {
  const router = useRouter();
  const {
    questions,
    currentQuestionIndex,
    userAnswers,
    isExamStarted,
    examStartTime,
    examDuration,
    useTimer,
    submitAnswer,
    nextQuestion,
    previousQuestion,
  } = useExamStore();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);

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

  useEffect(() => {
    // Load saved answer for current question
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
      const savedAnswer = userAnswers.get(currentQuestion.id);
      if (savedAnswer) {
        setSelectedAnswer(savedAnswer.selectedAnswer);
        setShowEvaluation(true);
      } else {
        setSelectedAnswer(null);
        setShowEvaluation(false);
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
  const answeredCount = userAnswers.size;

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswer(answerId);

    const isCorrect = answerId === currentQuestion.correctAnswer;

    // Auto-submit answer in practice mode
    submitAnswer(currentQuestion.id, answerId, isCorrect);

    // Show evaluation pane immediately
    setShowEvaluation(true);
  };

  const handleNext = () => {
    setShowEvaluation(false);
    setSelectedAnswer(null);
    if (currentQuestionIndex < questions.length - 1) {
      nextQuestion();
    }
  };

  const handlePrevious = () => {
    setShowEvaluation(false);
    setSelectedAnswer(null);
    previousQuestion();
  };

  const handleGoHome = () => {
    if (confirm('Are you sure you want to exit practice mode? Your progress will be saved.')) {
      router.push('/');
    }
  };

  const handleTimeUp = () => {
    alert('Time is up! You can continue practicing or go back to home.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-30 transition-colors border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Practice Mode
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Instant AI feedback • Interactive Learning
              </p>
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
                onClick={handleGoHome}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Exit
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

      {/* Main Content - Split Layout */}
      <div className="flex">
        {/* Question Section */}
        <div className={`transition-all duration-300 ${showEvaluation ? 'lg:w-2/3' : 'w-full'} px-4 py-8`}>
          <div className="max-w-4xl mx-auto">
            {/* Practice Mode Info */}
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg flex items-center gap-3 transition-colors">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Practice Mode: Click an answer to see instant AI feedback in the side panel
              </p>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mt-2">
                  {currentQuestion.question}
                </h2>
              </div>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrect = option.id === currentQuestion.correctAnswer;
                  const showResult = selectedAnswer !== null;

                  let optionStyle = '';
                  if (showResult) {
                    if (isCorrect) {
                      optionStyle = 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
                    } else if (isSelected && !isCorrect) {
                      optionStyle = 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
                    } else {
                      optionStyle = 'border-gray-200 dark:border-gray-600';
                    }
                  } else {
                    optionStyle = isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50';
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id)}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-all ${optionStyle}`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`font-bold ${
                          showResult && isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : showResult && isSelected && !isCorrect
                            ? 'text-red-700 dark:text-red-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.id}.
                        </span>
                        <span className={`flex-1 ${
                          showResult && isCorrect
                            ? 'text-green-900 dark:text-green-100'
                            : showResult && isSelected && !isCorrect
                            ? 'text-red-900 dark:text-red-100'
                            : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          {option.text}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
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

              {currentQuestionIndex < questions.length - 1 && (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              {currentQuestionIndex === questions.length - 1 && (
                <button
                  onClick={handleGoHome}
                  className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg"
                >
                  <Home className="w-5 h-5" />
                  Finish Practice
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Evaluation Pane */}
        {selectedAnswer && (
          <EvaluationPane
            isOpen={showEvaluation}
            onClose={() => setShowEvaluation(false)}
            question={currentQuestion.question}
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            correctAnswer={currentQuestion.correctAnswer}
            isCorrect={selectedAnswer === currentQuestion.correctAnswer}
            explanation={currentQuestion.explanation}
            questionId={currentQuestion.id}
          />
        )}
      </div>
    </div>
  );
}
