'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiagnosisResult } from '@/lib/cognitiveQueue';
import { Question } from '@/lib/types';
import {
  Brain,
  Sparkles,
  AlertCircle,
  BookOpen,
  Zap,
  Target,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  TrendingDown,
  PieChart,
} from 'lucide-react';

interface CognitiveCompanionSummaryProps {
  results: Map<number, DiagnosisResult>;
  questions: Question[];
}

export default function CognitiveCompanionSummary({
  results,
  questions,
}: CognitiveCompanionSummaryProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  const completedResults = Array.from(results.values()).filter(
    r => r.status === 'completed' && r.diagnosis
  );

  if (completedResults.length === 0) return null;

  // Aggregate diagnosis patterns
  const errorTypeFrequency: Record<string, number> = {};
  const categoryIssues: Record<string, { count: number; types: Set<string> }> = {};
  const allRemediations: { concept: string; action: string; hint: string }[] = [];

  completedResults.forEach(result => {
    if (!result.diagnosis) return;

    const d = result.diagnosis;
    errorTypeFrequency[d.primaryDiagnosis] = (errorTypeFrequency[d.primaryDiagnosis] || 0) + 1;

    const question = questions.find(q => q.id === result.questionId);
    const category = question?.category || 'Unknown';
    if (!categoryIssues[category]) {
      categoryIssues[category] = { count: 0, types: new Set() };
    }
    categoryIssues[category].count++;
    categoryIssues[category].types.add(d.primaryDiagnosis);

    allRemediations.push({
      concept: d.remediation.conceptToReview,
      action: d.remediation.immediateAction,
      hint: d.remediation.practiceHint,
    });
  });

  // Sort error types by frequency
  const sortedErrorTypes = Object.entries(errorTypeFrequency)
    .sort(([, a], [, b]) => b - a);

  // Get unique concepts to review
  const uniqueConcepts = [...new Set(allRemediations.map(r => r.concept))].slice(0, 5);

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      misconception: 'Misconception',
      prerequisite_gap: 'Knowledge Gap',
      careless_error: 'Careless Error',
      time_pressure: 'Time Pressure',
      partial_knowledge: 'Partial Knowledge',
    };
    return labels[type] || type;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'misconception': return <AlertCircle className="w-4 h-4" />;
      case 'prerequisite_gap': return <BookOpen className="w-4 h-4" />;
      case 'careless_error': return <Zap className="w-4 h-4" />;
      case 'time_pressure': return <Target className="w-4 h-4" />;
      case 'partial_knowledge': return <Brain className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'misconception': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'prerequisite_gap': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20';
      case 'careless_error': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'time_pressure': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'partial_knowledge': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'bg-red-500';
    if (confidence > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-colors"
    >
      {/* Header */}
      <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Cognitive Companion Insights
              <Sparkles className="w-5 h-5 text-amber-200" />
            </h2>
            <p className="text-amber-100 text-sm">
              AI analysis of {completedResults.length} incorrect answer{completedResults.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Error Pattern Overview */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Error Patterns
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {sortedErrorTypes.map(([type, count]) => (
              <div
                key={type}
                className={`flex items-center gap-2 p-3 rounded-lg border ${getTypeColor(type)} border-current/20`}
              >
                {getTypeIcon(type)}
                <div>
                  <p className="text-sm font-medium">{getTypeLabel(type)}</p>
                  <p className="text-xs opacity-70">{count} occurrence{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weak Categories */}
        {Object.keys(categoryIssues).length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-red-500 dark:text-red-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Categories Needing Attention
              </h3>
            </div>
            <div className="space-y-2">
              {Object.entries(categoryIssues)
                .sort(([, a], [, b]) => b.count - a.count)
                .map(([category, data]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{category}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {Array.from(data.types).map(getTypeLabel).join(', ')}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-red-600 dark:text-red-400">
                      {data.count} issue{data.count !== 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Key Concepts to Review */}
        {uniqueConcepts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Key Concepts to Review
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {uniqueConcepts.map((concept, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-sm border border-amber-200 dark:border-amber-700"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Per-Question Details (Expandable) */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Question-by-Question Analysis
            </h3>
          </div>
          <div className="space-y-2">
            {completedResults.map((result) => {
              const question = questions.find(q => q.id === result.questionId);
              if (!question || !result.diagnosis) return null;
              const questionIndex = questions.indexOf(question);
              const isExpanded = expandedQuestion === result.questionId;

              return (
                <div key={result.questionId} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedQuestion(isExpanded ? null : result.questionId)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 text-left min-w-0">
                      <span className="text-xs font-bold text-gray-400 dark:text-gray-500 shrink-0">
                        Q{questionIndex + 1}
                      </span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        {question.question}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getTypeColor(result.diagnosis.primaryDiagnosis)}`}>
                        {getTypeLabel(result.diagnosis.primaryDiagnosis)}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                          {/* Explanation */}
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {result.diagnosis.diagnosticExplanation}
                          </p>

                          {/* Hypotheses */}
                          <div className="space-y-1.5">
                            {result.diagnosis.hypotheses.map((h, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span className="text-amber-500">{getTypeIcon(h.type)}</span>
                                <span className="text-gray-600 dark:text-gray-400">{getTypeLabel(h.type)}</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-1">
                                  <div
                                    className={`h-1 rounded-full ${getConfidenceColor(h.confidence)}`}
                                    style={{ width: `${h.confidence * 100}%` }}
                                  />
                                </div>
                                <span className="text-gray-500 dark:text-gray-400">{Math.round(h.confidence * 100)}%</span>
                              </div>
                            ))}
                          </div>

                          {/* Remediation */}
                          <div className="p-2.5 bg-amber-50 dark:bg-amber-900/15 rounded-lg border border-amber-200 dark:border-amber-700/50 text-xs space-y-1">
                            <div className="flex items-start gap-1.5">
                              <Zap className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">{result.diagnosis.remediation.immediateAction}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <BookOpen className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                              <span className="text-gray-700 dark:text-gray-300">
                                <span className="font-medium">Review:</span> {result.diagnosis.remediation.conceptToReview}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
