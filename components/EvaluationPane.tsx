'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, CheckCircle, XCircle, Brain, ExternalLink, ShieldCheck, MessageSquare, FileText } from 'lucide-react';
import { parseInlineImages } from '@/lib/parseInlineImages';
import { useExamStore } from '@/lib/store';
import { parseAnswers, getCorrectOptionTexts } from '@/lib/multiAnswer';
import QuestionImages from './QuestionImages';
import RichText from './RichContent';

interface EvaluationPaneProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  options: { id: string; text: string }[];
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string; // Pre-generated explanation from the question
  questionId?: number; // For saving fetched explanations
  // ExamTopics extensions
  explanationSource?: string;
  explanationVotes?: number;
  sourceUrl?: string;
  answerImages?: string[];
}

export default function EvaluationPane({
  isOpen,
  onClose,
  question,
  options,
  selectedAnswer,
  correctAnswer,
  isCorrect,
  explanation: preGeneratedExplanation,
  questionId,
  explanationSource,
  explanationVotes,
  sourceUrl,
  answerImages,
}: EvaluationPaneProps) {
  const [explanation, setExplanation] = useState('');
  // Build the lightbox gallery once per render: answer images first, then
  // any inline `[IMAGE:]` markers from the explanation, deduped.
  const evalGallery = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const push = (u?: string) => {
      if (!u || seen.has(u)) return;
      seen.add(u);
      out.push(u);
    };
    answerImages?.forEach(push);
    for (const p of parseInlineImages(preGeneratedExplanation || explanation || '')) {
      if (p.kind === 'img') push(p.value);
    }
    return out;
  })();
  const [sources, setSources] = useState<Array<{ title: string; url: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { updateQuestionExplanation } = useExamStore();

  useEffect(() => {
    if (isOpen && selectedAnswer) {
      // Use pre-generated explanation if available, otherwise fetch from AI
      if (preGeneratedExplanation) {
        setExplanation(preGeneratedExplanation);
        setLoading(false);
        setError('');
      } else {
        fetchExplanation();
      }
    }
  }, [isOpen, selectedAnswer, preGeneratedExplanation]);

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
          isCorrect,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch explanation');
      }

      const data = await response.json();
      setExplanation(data.explanation);
      setSources(data.sources || []);

      // Save the fetched explanation to the question for future use
      if (questionId && data.explanation) {
        updateQuestionExplanation(questionId, data.explanation);
      }
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
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
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
                    Correct Answer{parseAnswers(correctAnswer).length > 1 ? 's' : ''}:
                  </p>
                  {getCorrectOptionTexts(correctAnswer, options).map((text, i) => (
                    <p key={i} className="text-blue-800 dark:text-blue-200">
                      {parseAnswers(correctAnswer)[i]}. {text}
                    </p>
                  ))}
                </div>
              )}

              {/* Answer images (hotspot / drag-and-drop) */}
              {answerImages && answerImages.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Answer</p>
                  <QuestionImages images={answerImages} gallery={evalGallery} altPrefix="Answer image" />
                </div>
              )}

              {/* AI Explanation */}
              <div className="mb-6">
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Explanation
                  </h3>
                  {explanationSource === 'community-comment' && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                      <MessageSquare className="w-3 h-3" />
                      Top community comment
                      {typeof explanationVotes === 'number' && explanationVotes > 0 && (
                        <span className="font-semibold"> · {explanationVotes} votes</span>
                      )}
                    </span>
                  )}
                  {explanationSource === 'answer-description' && (
                    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                      <FileText className="w-3 h-3" />
                      Official answer description
                    </span>
                  )}
                </div>

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
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    <RichText text={explanation} gallery={evalGallery} />
                  </div>
                )}

                {sourceUrl && (
                  <div className="mt-4">
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on ExamTopics
                    </a>
                  </div>
                )}
              </div>

              {/* Grounded Sources */}
              {!loading && sources.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">
                      Verified with Google Search
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sources.map((source, index) => (
                      <a
                        key={index}
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-colors group"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-700 dark:group-hover:text-blue-300 truncate">
                          {source.title || source.url}
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
