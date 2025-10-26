'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/lib/store';
import { motion } from 'framer-motion';
import {
  Trophy,
  Home,
  CheckCircle,
  XCircle,
  BarChart3,
  TrendingUp,
  Clock,
  Target,
} from 'lucide-react';
import questions from '@/data/questions.json';

export default function ResultsPage() {
  const router = useRouter();
  const { userAnswers, isExamCompleted, getScore, resetExam } = useExamStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isExamCompleted || userAnswers.size === 0) {
    router.push('/');
    return null;
  }

  const score = getScore();
  const isPassing = score.percentage >= 70;

  // Calculate stats
  const answeredQuestions = Array.from(userAnswers.values());
  const correctAnswers = answeredQuestions.filter((a) => a.isCorrect);
  const incorrectAnswers = answeredQuestions.filter((a) => !a.isCorrect);

  const handleRetakeExam = () => {
    resetExam();
    router.push('/');
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            {isPassing ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.6 }}
              >
                <Trophy className="w-24 h-24 text-yellow-500 dark:text-yellow-400" />
              </motion.div>
            ) : (
              <Target className="w-24 h-24 text-blue-500 dark:text-blue-400" />
            )}
          </div>

          <h1 className="text-5xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            {isPassing ? 'Congratulations! 🎉' : 'Exam Completed'}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            {isPassing
              ? "You've passed the exam with flying colors!"
              : 'Keep practicing, you can do better!'}
          </p>
        </motion.div>

        {/* Score Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`bg-gradient-to-r ${
            isPassing
              ? 'from-green-500 to-emerald-600 dark:from-green-600 dark:to-emerald-700'
              : 'from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700'
          } rounded-2xl shadow-2xl p-8 mb-8 text-white`}
        >
          <div className="text-center">
            <p className="text-lg mb-2 opacity-90">Your Score</p>
            <div className="text-7xl font-bold mb-4">{score.percentage}%</div>
            <p className="text-2xl opacity-90">
              {score.correct} out of {score.total} questions correct
            </p>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {correctAnswers.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Correct Answers</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {incorrectAnswers.length}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incorrect Answers</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 transition-colors">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {isPassing ? 'PASS' : 'FAIL'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status (70% to pass)</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Performance Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 transition-colors"
        >
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Performance Breakdown
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Accuracy</span>
              <span>{score.percentage}%</span>
            </div>
            <div className="w-full h-6 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${score.percentage}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className={`h-full ${
                  isPassing ? 'bg-green-500' : 'bg-blue-500'
                }`}
              />
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{score.total}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Questions</p>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {score.correct}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {score.total - score.correct}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Incorrect</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {score.percentage}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Score</p>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={handleRetakeExam}
            className="flex-1 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white font-bold rounded-lg shadow-xl transition-all flex items-center justify-center gap-3"
          >
            <Trophy className="w-6 h-6" />
            Retake Exam
          </button>

          <button
            onClick={handleGoHome}
            className="flex-1 py-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold rounded-lg shadow-lg border-2 border-gray-300 dark:border-gray-600 transition-all flex items-center justify-center gap-3"
          >
            <Home className="w-6 h-6" />
            Go Home
          </button>
        </motion.div>

        {/* Motivational Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-600 dark:text-gray-400 italic">
            {isPassing
              ? '"Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill'
              : '"The only real mistake is the one from which we learn nothing." - Henry Ford'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
