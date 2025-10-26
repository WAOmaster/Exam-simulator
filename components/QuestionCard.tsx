'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Question } from '@/lib/store';

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answerId: string) => void;
  onSubmit: () => void;
  isSubmitted: boolean;
  isLoading?: boolean;
}

export default function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onAnswerSelect,
  onSubmit,
  isSubmitted,
  isLoading = false,
}: QuestionCardProps) {
  const getOptionStyle = (optionId: string) => {
    if (!isSubmitted) {
      return selectedAnswer === optionId
        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50';
    }

    // After submission
    if (optionId === question.correctAnswer) {
      return 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/30';
    }

    if (optionId === selectedAnswer && optionId !== question.correctAnswer) {
      return 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/30';
    }

    return 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 opacity-60';
  };

  const getOptionIcon = (optionId: string) => {
    if (!isSubmitted) return null;

    if (optionId === question.correctAnswer) {
      return <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />;
    }

    if (optionId === selectedAnswer && optionId !== question.correctAnswer) {
      return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
    }

    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:p-8 transition-colors"
    >
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
            {question.category}
          </span>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed">
          {question.question}
        </h2>
      </div>

      {/* Options */}
      <div className="space-y-3 mb-6">
        {question.options.map((option) => (
          <motion.button
            key={option.id}
            whileHover={{ scale: isSubmitted ? 1 : 1.01 }}
            whileTap={{ scale: isSubmitted ? 1 : 0.99 }}
            onClick={() => !isSubmitted && onAnswerSelect(option.id)}
            disabled={isSubmitted}
            className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${getOptionStyle(
              option.id
            )} ${isSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <div className="flex items-start gap-3">
              <span className="font-bold text-lg text-gray-700 dark:text-gray-300 min-w-[24px]">
                {option.id}.
              </span>
              <span className="flex-1 text-gray-800 dark:text-gray-200">{option.text}</span>
              {getOptionIcon(option.id)}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <button
          onClick={onSubmit}
          disabled={!selectedAnswer || isLoading}
          className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
            selectedAnswer && !isLoading
              ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Checking Answer...
            </>
          ) : (
            'Submit Answer'
          )}
        </button>
      )}
    </motion.div>
  );
}
