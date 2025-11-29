'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, ChevronDown, ChevronUp, BookOpen, Lightbulb, ExternalLink, X } from 'lucide-react';

interface LearningContent {
  topic: string;
  subjectArea: string;
  keyConcepts: string[];
  learningGuide: string;
  furtherLearning: string[];
}

interface LearnWithAIProps {
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
}

export default function LearnWithAI({ question, options, correctAnswer }: LearnWithAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [learningContent, setLearningContent] = useState<LearningContent | null>(null);
  const [error, setError] = useState('');

  const fetchLearning = async () => {
    if (learningContent) {
      // Already loaded, just toggle
      setIsOpen(!isOpen);
      return;
    }

    setIsLoading(true);
    setError('');
    setIsOpen(true);

    try {
      const response = await fetch('/api/ai/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, options, correctAnswer }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch learning content');
      }

      setLearningContent(data.learning);
    } catch (err: any) {
      setError(err.message || 'Failed to load learning content');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div className="mt-4">
      {/* Learn with AI Button */}
      <button
        onClick={fetchLearning}
        disabled={isLoading}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading AI Learning...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            Learn with AI
            {isOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </>
        )}
      </button>

      {/* Learning Content Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-4 overflow-hidden"
          >
            <div className="p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-xl font-bold text-purple-900 dark:text-purple-100">
                    AI Learning Guide
                  </h3>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
              )}

              {learningContent && (
                <div className="space-y-4">
                  {/* Topic and Subject */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">TOPIC</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{learningContent.topic}</p>
                    </div>
                    <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">SUBJECT AREA</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{learningContent.subjectArea}</p>
                    </div>
                  </div>

                  {/* Key Concepts */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Key Concepts</h4>
                    </div>
                    <ul className="space-y-2">
                      {learningContent.keyConcepts.map((concept, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-purple-600 dark:text-purple-400 mt-0.5">•</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Learning Guide */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2 mb-3">
                      <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Guided Learning</h4>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {learningContent.learningGuide}
                    </p>
                  </div>

                  {/* Further Learning */}
                  <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-purple-200 dark:border-purple-700">
                    <div className="flex items-center gap-2 mb-3">
                      <ExternalLink className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h4 className="font-semibold text-gray-900 dark:text-white">Further Learning</h4>
                    </div>
                    <ul className="space-y-2">
                      {learningContent.furtherLearning.map((topic, index) => (
                        <li key={index}>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(topic)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {topic}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer Note */}
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">
                    💡 AI-generated learning content to help you understand concepts deeply
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
