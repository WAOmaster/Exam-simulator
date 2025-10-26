'use client';

import { Question } from '@/lib/types';
import { CheckCircle } from 'lucide-react';

interface QuestionPreviewProps {
  questions: Question[];
}

export default function QuestionPreview({ questions }: QuestionPreviewProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Generated Questions ({questions.length})
        </h3>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-shadow"
          >
            {/* Question Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Question {index + 1}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    question.difficulty === 'easy'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : question.difficulty === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }`}>
                    {question.difficulty}
                  </span>
                  {question.type && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      {question.type}
                    </span>
                  )}
                </div>
                <p className="text-base font-medium text-gray-800 dark:text-gray-200">
                  {question.question}
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-2 mb-3">
              {question.options.map((option) => {
                const isCorrect = option.id === question.correctAnswer;
                return (
                  <div
                    key={option.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect && (
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <span className={`font-semibold ${
                          isCorrect
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {option.id}.
                        </span>{' '}
                        <span className={isCorrect
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-gray-800 dark:text-gray-200'
                        }>
                          {option.text}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            {question.explanation && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Explanation:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {question.explanation}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
