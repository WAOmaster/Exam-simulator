'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DiagnosisResult } from '@/lib/cognitiveQueue';
import {
  Brain,
  Loader2,
  AlertCircle,
  X,
  Lightbulb,
  Zap,
  BookOpen,
  Target,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';

interface CognitiveCompanionIndicatorProps {
  result: DiagnosisResult | undefined;
  questionId: number;
  onStartLearningPlan?: (diagnosis: any) => void;
}

export default function CognitiveCompanionIndicator({
  result,
  questionId,
  onStartLearningPlan,
}: CognitiveCompanionIndicatorProps) {
  const [expanded, setExpanded] = useState(false);

  if (!result) return null;

  const getStatusIcon = () => {
    switch (result.status) {
      case 'pending':
      case 'processing':
        return (
          <div className="relative">
            <Brain className="w-4 h-4 text-amber-500" />
            <Loader2 className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 animate-spin" />
          </div>
        );
      case 'completed':
        return (
          <div className="relative">
            <Brain className="w-4 h-4 text-amber-500" />
            <Sparkles className="w-2.5 h-2.5 text-amber-400 absolute -top-0.5 -right-0.5" />
          </div>
        );
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (result.status) {
      case 'pending': return 'Queued';
      case 'processing': return 'Analyzing...';
      case 'completed': return 'Analysis Ready';
      case 'error': return 'Analysis Failed';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.7) return 'bg-red-500';
    if (confidence > 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

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
      case 'misconception': return <AlertCircle className="w-3.5 h-3.5" />;
      case 'prerequisite_gap': return <BookOpen className="w-3.5 h-3.5" />;
      case 'careless_error': return <Zap className="w-3.5 h-3.5" />;
      case 'time_pressure': return <Target className="w-3.5 h-3.5" />;
      case 'partial_knowledge': return <Brain className="w-3.5 h-3.5" />;
      default: return <AlertCircle className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="mt-3">
      {/* Compact indicator button */}
      <button
        onClick={() => result.status === 'completed' && setExpanded(!expanded)}
        disabled={result.status !== 'completed'}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
          result.status === 'completed'
            ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-900/30 dark:hover:to-orange-900/30 cursor-pointer'
            : result.status === 'error'
            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
            : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
        }`}
      >
        {getStatusIcon()}
        <span className={`font-medium ${
          result.status === 'completed'
            ? 'text-amber-700 dark:text-amber-300'
            : result.status === 'error'
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-500 dark:text-gray-400'
        }`}>
          {getStatusText()}
        </span>
        {result.status === 'completed' && result.diagnosis && (
          <>
            <span className="text-amber-500 dark:text-amber-400">•</span>
            <span className="text-amber-600 dark:text-amber-400 text-xs">
              {getTypeLabel(result.diagnosis.primaryDiagnosis)}
            </span>
            <ChevronRight className={`w-3.5 h-3.5 text-amber-500 transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </>
        )}
      </button>

      {/* Expanded diagnosis detail */}
      <AnimatePresence>
        {expanded && result.status === 'completed' && result.diagnosis && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700/50 shadow-sm space-y-4">
              {/* Close button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Cognitive Analysis
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(false);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Diagnostic explanation */}
              <div className={`p-3 rounded-lg text-sm ${
                result.diagnosis.emotionalTone === 'empathetic'
                  ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700'
                  : result.diagnosis.emotionalTone === 'encouraging'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                  : result.diagnosis.emotionalTone === 'supportive'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                  : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700'
              }`}>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {result.diagnosis.diagnosticExplanation}
                </p>
              </div>

              {/* Hypotheses - compact */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Hypotheses
                </span>
                {result.diagnosis.hypotheses.map((hypothesis, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 ${
                      index === 0 ? 'ring-1 ring-amber-200 dark:ring-amber-700' : ''
                    }`}
                  >
                    <span className="text-amber-600 dark:text-amber-400">
                      {getTypeIcon(hypothesis.type)}
                    </span>
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 flex-1">
                      {getTypeLabel(hypothesis.type)}
                    </span>
                    <div className="w-16 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${getConfidenceColor(hypothesis.confidence)}`}
                        style={{ width: `${hypothesis.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">
                      {Math.round(hypothesis.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Remediation - compact */}
              <div className="p-3 rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/15 dark:to-orange-900/15 border border-amber-200 dark:border-amber-700/50">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                    What To Do Next
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start gap-1.5">
                    <Zap className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    <span>{result.diagnosis.remediation.immediateAction}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <BookOpen className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    <span><span className="font-medium">Review:</span> {result.diagnosis.remediation.conceptToReview}</span>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <Target className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                    <span><span className="font-medium">Hint:</span> {result.diagnosis.remediation.practiceHint}</span>
                  </div>
                </div>

                {/* Learning Plan button */}
                {onStartLearningPlan && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartLearningPlan(result.diagnosis);
                    }}
                    className="mt-3 w-full py-2 px-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md transition-all"
                  >
                    <GraduationCap className="w-4 h-4" />
                    Start Learning Plan
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
