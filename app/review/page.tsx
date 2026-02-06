'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Sparkles,
  Target,
  RotateCcw,
  Zap,
} from 'lucide-react';
import ReviewStats from '@/components/ReviewStats';
import {
  getReviewQueue,
  recordReview,
  QuestionMastery,
} from '@/lib/questionMastery';
import {
  Rating,
  getRatingLabel,
  formatInterval,
  calculateNextInterval,
} from '@/lib/fsrs';
import { useExamStore } from '@/lib/store';

interface Question {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficulty?: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const { availableQuestionSets } = useExamStore();

  const [queue, setQueue] = useState<QuestionMastery[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);

  // Load review queue on mount
  useEffect(() => {
    const reviewQueue = getReviewQueue(20);
    setQueue(reviewQueue);
    setStartTime(Date.now());
  }, []);

  // Get question data from store
  const currentMastery = queue[currentIndex];
  const currentQuestion: Question | null = useMemo(() => {
    if (!currentMastery) return null;

    // Search through all question sets to find this question
    for (const set of availableQuestionSets) {
      const found = set.questions.find((q) => q.id === currentMastery.questionId);
      if (found) return found;
    }

    return null;
  }, [currentMastery, availableQuestionSets]);

  const handleAnswerSelect = (answerId: string) => {
    if (showResult) return;
    setSelectedAnswer(answerId);
  };

  const handleSubmit = () => {
    if (!selectedAnswer || !currentQuestion) return;
    setShowResult(true);
  };

  const handleRate = (rating: Rating) => {
    if (!currentMastery || !currentQuestion) return;

    const responseTime = Date.now() - startTime;

    // Record the review
    recordReview(
      currentMastery.questionId,
      currentMastery.questionSetId,
      rating,
      responseTime
    );

    // Update stats
    setReviewedCount((c) => c + 1);
    if (selectedAnswer === currentQuestion.correctAnswer) {
      setCorrectCount((c) => c + 1);
    }

    // Move to next question
    if (currentIndex < queue.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setStartTime(Date.now());
    } else {
      // Queue complete, reload
      const newQueue = getReviewQueue(20);
      if (newQueue.length > 0) {
        setQueue(newQueue);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setStartTime(Date.now());
      }
    }
  };

  // Calculate preview intervals for each rating
  const previewIntervals = useMemo(() => {
    if (!currentMastery) return { 1: '', 2: '', 3: '', 4: '' };

    const card = currentMastery.cardState;
    const intervals: Record<Rating, string> = { 1: '', 2: '', 3: '', 4: '' };

    ([1, 2, 3, 4] as Rating[]).forEach((rating) => {
      const { interval } = calculateNextInterval(card, rating);
      intervals[rating] = formatInterval(interval);
    });

    return intervals;
  }, [currentMastery]);

  const isCorrect = currentQuestion && selectedAnswer === currentQuestion.correctAnswer;

  if (queue.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Spaced Repetition Review
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Optimize your learning with FSRS
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Empty State */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center"
            >
              <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full w-fit mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                All Caught Up!
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No cards are due for review right now. Take a practice exam to add
                more questions to your review queue.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => router.push('/')}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all flex items-center justify-center gap-2"
                >
                  <Target className="w-5 h-5" />
                  Start Practice
                </button>
                <button
                  onClick={() => router.push('/library')}
                  className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  My Library
                </button>
              </div>
            </motion.div>

            {/* Stats */}
            <ReviewStats />
          </div>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Question not found. It may have been deleted.
          </p>
          <button
            onClick={() => {
              // Skip this question
              if (currentIndex < queue.length - 1) {
                setCurrentIndex((i) => i + 1);
              } else {
                router.push('/');
              }
            }}
            className="px-4 py-2 bg-indigo-500 text-white rounded-lg"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Spaced Repetition Review
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {currentIndex + 1} of {queue.length} • {reviewedCount} reviewed
                {correctCount > 0 && ` • ${correctCount} correct`}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push('/')}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Card */}
          <div className="lg:col-span-2">
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
            >
              {/* Question Meta */}
              <div className="flex items-center gap-2 mb-4">
                {currentQuestion.category && (
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs rounded">
                    {currentQuestion.category}
                  </span>
                )}
                {currentQuestion.difficulty && (
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      currentQuestion.difficulty === 'easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : currentQuestion.difficulty === 'hard'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              {/* Question Text */}
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                {currentQuestion.question}
              </h2>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion.options.map((option) => {
                  const isSelected = selectedAnswer === option.id;
                  const isCorrectOption = option.id === currentQuestion.correctAnswer;

                  let optionStyle = '';
                  if (showResult) {
                    if (isCorrectOption) {
                      optionStyle =
                        'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
                    } else if (isSelected && !isCorrectOption) {
                      optionStyle =
                        'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
                    } else {
                      optionStyle = 'border-gray-200 dark:border-gray-600 opacity-50';
                    }
                  } else {
                    optionStyle = isSelected
                      ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300 dark:hover:border-indigo-400 hover:bg-gray-50 dark:hover:bg-gray-700/50';
                  }

                  return (
                    <button
                      key={option.id}
                      onClick={() => handleAnswerSelect(option.id)}
                      disabled={showResult}
                      className={`w-full text-left p-4 border-2 rounded-lg transition-all ${optionStyle}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`font-bold ${
                            showResult && isCorrectOption
                              ? 'text-green-700 dark:text-green-300'
                              : showResult && isSelected && !isCorrectOption
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {option.id}.
                        </span>
                        <span
                          className={`flex-1 ${
                            showResult && isCorrectOption
                              ? 'text-green-900 dark:text-green-100'
                              : showResult && isSelected && !isCorrectOption
                              ? 'text-red-900 dark:text-red-100'
                              : 'text-gray-800 dark:text-gray-200'
                          }`}
                        >
                          {option.text}
                        </span>
                        {showResult && isCorrectOption && (
                          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                        )}
                        {showResult && isSelected && !isCorrectOption && (
                          <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {showResult && currentQuestion.explanation && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg"
                >
                  <p className="text-blue-800 dark:text-blue-200 text-sm">
                    {currentQuestion.explanation}
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="mt-6">
                {!showResult ? (
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Show Answer
                    <ArrowRight className="w-5 h-5" />
                  </button>
                ) : (
                  <div className="space-y-4">
                    <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                      How well did you recall this?
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {([1, 2, 3, 4] as Rating[]).map((rating) => {
                        const colors = {
                          1: 'bg-red-500 hover:bg-red-600',
                          2: 'bg-orange-500 hover:bg-orange-600',
                          3: 'bg-blue-500 hover:bg-blue-600',
                          4: 'bg-green-500 hover:bg-green-600',
                        };

                        return (
                          <button
                            key={rating}
                            onClick={() => handleRate(rating)}
                            className={`py-3 px-2 ${colors[rating]} text-white rounded-lg font-medium transition-all flex flex-col items-center`}
                          >
                            <span>{getRatingLabel(rating)}</span>
                            <span className="text-xs opacity-80 mt-1">
                              {previewIntervals[rating]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          {/* Side Panel - Stats */}
          <div>
            <ReviewStats />
          </div>
        </div>
      </div>
    </div>
  );
}
