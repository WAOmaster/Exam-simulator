'use client';

import { motion } from 'framer-motion';
import { Brain, Clock, Target, BarChart3, AlertCircle, Play } from 'lucide-react';

interface CCATStartScreenProps {
  onStart: () => void;
}

export default function CCATStartScreen({ onStart }: CCATStartScreenProps) {
  const details = [
    { label: 'Total Questions', value: '50' },
    { label: 'Time Limit', value: '15 Minutes' },
    { label: 'Avg. Time / Q', value: '18 Seconds' },
    { label: 'Scoring', value: 'No penalty for wrong answers' },
  ];

  const distribution = [
    { name: 'Verbal Ability', count: 18, color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
    { name: 'Math & Logic', count: 21, color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
    { name: 'Spatial Reasoning', count: 11, color: 'bg-violet-500', textColor: 'text-violet-600 dark:text-violet-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-xl mx-auto px-4 py-8 space-y-6"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-2xl bg-violet-100 dark:bg-violet-900/30">
            <Brain className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </div>
        </div>
        <p className="text-xs font-bold tracking-widest text-violet-600 dark:text-violet-400 uppercase">
          Practice Exam
        </p>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          CCAT Practice Test
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Criteria Cognitive Aptitude Test — Full-Length Simulated Exam
        </p>
      </div>

      {/* Exam Details */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-gray-500" />
          Exam Details
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {details.map(({ label, value }) => (
            <div
              key={label}
              className="bg-white dark:bg-gray-700/60 rounded-lg border border-gray-200 dark:border-gray-600 p-3"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {label}
              </p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question Distribution */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-900/10 p-5">
        <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Question Distribution
        </h4>
        <div className="space-y-2">
          {distribution.map(({ name, count, color, textColor }) => (
            <div key={name} className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
              <span className={`text-sm ${textColor} flex-1`}>{name}</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{count} questions</span>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/10 p-5">
        <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Instructions
        </h4>
        <ul className="text-sm text-amber-800 dark:text-amber-200/80 space-y-1.5 list-none">
          {[
            'Calculators are not allowed',
            'No penalty for wrong answers — don\'t leave blanks',
            'Questions from each subject are mixed together',
            'Aim for less than 18 seconds per question',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Start Button */}
      <motion.button
        onClick={onStart}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white font-bold text-base tracking-wide shadow-md hover:shadow-lg transition-shadow flex items-center justify-center gap-2"
      >
        <Play className="w-5 h-5" />
        Start Exam
      </motion.button>
    </motion.div>
  );
}
