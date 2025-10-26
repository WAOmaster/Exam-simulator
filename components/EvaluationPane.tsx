'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, XCircle, Brain } from 'lucide-react';

interface EvaluationPaneProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: { id: string; text: string }[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
}

export default function EvaluationPane({
  isOpen,
  onClose,
  question,
  options,
  selectedAnswer,
  correctAnswer,
  isCorrect,
}: EvaluationPaneProps) {
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && selectedAnswer) {
      fetchExplanation();
    }
  }, [isOpen, selectedAnswer]);

  const fetchExplanation = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          options,
          correctAnswer,
          userAnswer: selectedAnswer,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
    } catch (err) {
      setError('Failed to generate explanation. Please try again.');
      console.error('Error fetching explanation:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          />

          {/* Side Pane */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full lg:w-1/3 bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    AI Evaluation
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Result Badge */}
              <div className={`p-4 rounded-lg mb-6 ${
                isCorrect
                  ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-500'
                  : 'bg-red-50 dark:bg-red-900/30 border-2 border-red-500'
              }`}>
                <div className="flex items-center gap-3">
                  {isCorrect ? (
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <p className={`text-lg font-bold ${
                      isCorrect ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                    }`}>
                      {isCorrect ? 'Correct Answer!' : 'Incorrect Answer'}
                    </p>
                    <p className={`text-sm ${
                      isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                    }`}>
                      {isCorrect ? 'Great job! Keep it up.' : 'Learn from this and try again.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Answer Details */}
              {!isCorrect && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Correct Answer:
                  </p>
                  <p className="text-blue-800 dark:text-blue-200">
                    {options.find((opt) => opt.id === correctAnswer)?.text}
                  </p>
                </div>
              )}

              {/* AI Explanation */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Explanation
                </h3>

                {loading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span className="ml-3 text-gray-600 dark:text-gray-400">
                      Generating AI explanation...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}

                {!loading && !error && explanation && (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {explanation}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
