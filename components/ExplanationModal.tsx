'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export default function ExplanationModal({
  isOpen,
  onClose,
  question,
  options,
  correctAnswer,
  userAnswer,
  isCorrect,
}: ExplanationModalProps) {
  const [explanation, setExplanation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchExplanation();
    }
  }, [isOpen]);

  const fetchExplanation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          options,
          correctAnswer,
          userAnswer,
          isCorrect,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch explanation');
      }

      setExplanation(data.explanation);
    } catch (err: any) {
      setError(err.message || 'Failed to generate explanation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 flex flex-col max-h-[90vh] transition-colors"
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between p-6 border-b ${
                isCorrect ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700'
              }`}
            >
              <div className="flex items-center gap-3">
                {isCorrect ? (
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                )}
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {isCorrect ? 'Correct! 🎉' : 'Incorrect'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Answer Info */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Your Answer:
                  </span>
                  <span
                    className={`font-bold ${
                      isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {userAnswer}
                  </span>
                </div>
                {!isCorrect && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Correct Answer:
                    </span>
                    <span className="font-bold text-green-600 dark:text-green-400">{correctAnswer}</span>
                  </div>
                )}
              </div>

              {/* AI Explanation */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                    AI Explanation
                  </h3>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                ) : error ? (
                  <div className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <p className="font-medium mb-2">Error loading explanation:</p>
                    <p className="text-sm">{error}</p>
                    {error.includes('API key') && (
                      <p className="text-sm mt-2">
                        Please configure your GEMINI_API_KEY in .env.local file.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 leading-relaxed">
                    {explanation.split('\n').map((paragraph, index) => (
                      <p key={index} className="mb-3">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button
                onClick={onClose}
                className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
