'use client';

import { motion } from 'framer-motion';
import { Trophy, RefreshCw, BookOpen } from 'lucide-react';
import { CCATQuestion, CCATCategoryScore } from '@/lib/ccatTypes';

interface CCATResultsScreenProps {
  score: number;
  answers: (number | null)[];
  questions: CCATQuestion[];
  timeLeft: number;
  onReview: (index?: number) => void;
  onRetake: () => void;
}

function catScore(questions: CCATQuestion[], answers: (number | null)[], cat: string): CCATCategoryScore {
  let correct = 0, total = 0;
  questions.forEach((q, i) => {
    if (q.category === cat) {
      total++;
      if (answers[i] === q.correct) correct++;
    }
  });
  return { correct, total, pct: total ? Math.round((correct / total) * 100) : 0 };
}

function getGrade(score: number) {
  if (score >= 36) return { label: 'Excellent', colorClass: 'text-emerald-600 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' };
  if (score >= 25) return { label: 'Competitive', colorClass: 'text-amber-600 dark:text-amber-400', bgClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700' };
  return { label: 'Keep Practicing', colorClass: 'text-rose-600 dark:text-rose-400', bgClass: 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700' };
}

function getPercentile(score: number) {
  return score <= 24
    ? Math.round((score / 24) * 50)
    : Math.round(50 + ((score - 24) / 26) * 50);
}

export default function CCATResultsScreen({
  score,
  answers,
  questions,
  timeLeft,
  onReview,
  onRetake,
}: CCATResultsScreenProps) {
  const grade = getGrade(score);
  const percentile = getPercentile(score);
  const verbal = catScore(questions, answers, 'Verbal');
  const math = catScore(questions, answers, 'Math & Logic');
  const spatial = catScore(questions, answers, 'Spatial Reasoning');

  const timeUsedMinutes = Math.floor((900 - timeLeft) / 60);
  const timeUsedSeconds = (900 - timeLeft) % 60;

  const categories = [
    { name: 'Verbal', score: verbal, colorClass: 'text-blue-600 dark:text-blue-400' },
    { name: 'Math & Logic', score: math, colorClass: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'Spatial', score: spatial, colorClass: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto px-4 py-8 space-y-5"
    >
      {/* Header */}
      <div className="text-center">
        <p className="text-xs font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase mb-1">
          Results
        </p>
        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">CCAT Practice Test</h1>
      </div>

      {/* Main score */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl border-2 p-6 text-center ${grade.bgClass}`}
      >
        <div className="flex justify-center mb-2">
          <Trophy className={`w-8 h-8 ${grade.colorClass}`} />
        </div>
        <div className={`text-5xl font-black ${grade.colorClass}`}>
          {score}
          <span className="text-2xl text-gray-400 dark:text-gray-500 font-medium">/50</span>
        </div>
        <div className={`text-base font-bold ${grade.colorClass} mt-1`}>{grade.label}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Estimated Percentile: ~{percentile}th
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          Time used: {timeUsedMinutes}m {timeUsedSeconds}s
        </div>
      </motion.div>

      {/* Category breakdown */}
      <div className="grid grid-cols-3 gap-3">
        {categories.map(({ name, score: cs, colorClass }) => (
          <div
            key={name}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
              {name}
            </p>
            <p className={`text-2xl font-black ${colorClass}`}>{cs.pct}%</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {cs.correct}/{cs.total}
            </p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onReview()}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Review Answers
        </button>
        <button
          onClick={onRetake}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-violet-600 dark:border-violet-500 text-violet-600 dark:text-violet-400 font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retake Exam
        </button>
      </div>

      {/* Question overview grid */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">Question Overview</h3>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const isCorrect = answers[i] === q.correct;
            const wasAnswered = answers[i] !== null;
            return (
              <button
                key={i}
                onClick={() => onReview(i)}
                className={`w-7 h-7 flex items-center justify-center rounded text-[10px] font-bold transition-colors ${
                  wasAnswered
                    ? isCorrect
                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-600'
                }`}
                title={`Q${i + 1}: ${wasAnswered ? (isCorrect ? 'Correct' : 'Incorrect') : 'Unanswered'}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex gap-4 mt-2">
          {[
            { bg: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700', label: 'Correct' },
            { bg: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700', label: 'Incorrect' },
            { bg: 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600', label: 'Unanswered' },
          ].map(({ bg, label }) => (
            <div key={label} className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <div className={`w-3 h-3 rounded border ${bg}`} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
