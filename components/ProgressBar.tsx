'use client';

import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  answered: number;
}

export default function ProgressBar({ current, total, answered }: ProgressBarProps) {
  const progressPercentage = ((current + 1) / total) * 100;
  const answeredPercentage = (answered / total) * 100;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Progress: {current + 1} / {total}
        </span>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Answered: {answered} / {total}
        </span>
      </div>

      <div className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Answered Progress */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${answeredPercentage}%` }}
          transition={{ duration: 0.3 }}
          className="absolute h-full bg-green-400 dark:bg-green-500 opacity-50"
        />

        {/* Current Progress */}
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.3 }}
          className="absolute h-full bg-blue-600 dark:bg-blue-500"
        />
      </div>
    </div>
  );
}
