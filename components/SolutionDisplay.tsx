'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Lightbulb,
  BookOpen,
  AlertTriangle,
  Sparkles,
  Target,
} from 'lucide-react';

interface SolutionData {
  problemIdentification: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  steps?: string[];
  hints?: string[];
  keyConcepts: string[];
  commonMistakes?: string[];
}

interface SolutionDisplayProps {
  solution: SolutionData | null;
  isLoading?: boolean;
  mode: 'hints' | 'step_by_step' | 'full_solution' | 'analysis';
}

export default function SolutionDisplay({
  solution,
  isLoading = false,
  mode,
}: SolutionDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['main', 'concepts'])
  );
  const [copied, setCopied] = useState(false);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleCopy = async () => {
    if (!solution) return;

    const text = `
Problem: ${solution.problemIdentification}
Subject: ${solution.subject}
Difficulty: ${solution.difficulty}

${solution.content}

${solution.steps ? `Steps:\n${solution.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}` : ''}

Key Concepts: ${solution.keyConcepts.join(', ')}
    `.trim();

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
      case 'hard':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <Sparkles className="w-12 h-12 text-cyan-500 animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <Sparkles className="w-12 h-12 text-cyan-300 opacity-30" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              Analyzing your problem...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              AI is working on your solution
            </p>
          </div>

          {/* Skeleton */}
          <div className="w-full mt-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!solution) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-cyan-50 to-teal-50 dark:from-cyan-900/30 dark:to-teal-900/30 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                AI Solution
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {solution.subject}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(
                    solution.difficulty
                  )}`}
                >
                  {solution.difficulty}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 rounded-lg transition-colors"
            title="Copy solution"
          >
            {copied ? (
              <Check className="w-5 h-5 text-green-500" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Problem Identification */}
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Problem Identified
            </span>
          </div>
          <p className="text-gray-800 dark:text-gray-200">
            {solution.problemIdentification}
          </p>
        </div>

        {/* Hints Section (for hints mode) */}
        {mode === 'hints' && solution.hints && solution.hints.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('hints')}
              className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="font-medium text-amber-800 dark:text-amber-200">
                  Hints ({solution.hints.length})
                </span>
              </div>
              {expandedSections.has('hints') ? (
                <ChevronUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.has('hints') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {solution.hints.map((hint, index) => (
                      <div
                        key={index}
                        className="p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg"
                      >
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="font-medium text-amber-700 dark:text-amber-300">
                            Hint {index + 1}:
                          </span>{' '}
                          {hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Steps Section (for step_by_step mode) */}
        {mode === 'step_by_step' && solution.steps && solution.steps.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('steps')}
              className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  Step-by-Step Solution ({solution.steps.length} steps)
                </span>
              </div>
              {expandedSections.has('steps') ? (
                <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.has('steps') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-3">
                    {solution.steps.map((step, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-3"
                      >
                        <div className="shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 p-3 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{step}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Main Content (for full_solution and analysis modes) */}
        {(mode === 'full_solution' || mode === 'analysis') && (
          <div>
            <button
              onClick={() => toggleSection('main')}
              className="w-full flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-800 dark:text-cyan-200">
                  {mode === 'full_solution' ? 'Complete Solution' : 'Analysis'}
                </span>
              </div>
              {expandedSections.has('main') ? (
                <ChevronUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.has('main') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 prose dark:prose-invert max-w-none">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {solution.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Key Concepts */}
        <div>
          <button
            onClick={() => toggleSection('concepts')}
            className="w-full flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-purple-800 dark:text-purple-200">
                Key Concepts ({solution.keyConcepts.length})
              </span>
            </div>
            {expandedSections.has('concepts') ? (
              <ChevronUp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            )}
          </button>
          <AnimatePresence>
            {expandedSections.has('concepts') && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-wrap gap-2">
                  {solution.keyConcepts.map((concept, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Common Mistakes */}
        {solution.commonMistakes && solution.commonMistakes.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection('mistakes')}
              className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-800 dark:text-red-200">
                  Common Mistakes to Avoid
                </span>
              </div>
              {expandedSections.has('mistakes') ? (
                <ChevronUp className="w-4 h-4 text-red-600 dark:text-red-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-red-600 dark:text-red-400" />
              )}
            </button>
            <AnimatePresence>
              {expandedSections.has('mistakes') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {solution.commonMistakes.map((mistake, index) => (
                      <div
                        key={index}
                        className="p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                      >
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">{mistake}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
