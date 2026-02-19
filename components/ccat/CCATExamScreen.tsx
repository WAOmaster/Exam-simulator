'use client';

import { CCATQuestion } from '@/lib/ccatTypes';
import {
  CCATNextInSeries,
  CCATMatrix,
  CCATOddOneOut,
  CCATAttentionTable,
} from './CCATSpatialRenderer';
import { ChevronLeft, ChevronRight, Flag } from 'lucide-react';

interface CCATExamScreenProps {
  questions: CCATQuestion[];
  current: number;
  answers: (number | null)[];
  timeLeft: number;
  reviewMode: boolean;
  onSelect: (optionIndex: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
  onBackToResults: () => void;
  onJump: (index: number) => void;
}

function formatTime(seconds: number): string {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function TimerColor(timeLeft: number) {
  if (timeLeft < 60) return 'text-rose-500 dark:text-rose-400';
  if (timeLeft < 180) return 'text-amber-500 dark:text-amber-400';
  return 'text-gray-800 dark:text-gray-200';
}

function TimerDot(timeLeft: number) {
  if (timeLeft < 60) return 'bg-rose-500 animate-pulse';
  if (timeLeft < 180) return 'bg-amber-500';
  return 'bg-emerald-500';
}

export default function CCATExamScreen({
  questions,
  current,
  answers,
  timeLeft,
  reviewMode,
  onSelect,
  onPrevious,
  onNext,
  onFinish,
  onBackToResults,
  onJump,
}: CCATExamScreenProps) {
  const q = questions[current];
  const userAnswer = answers[current];
  const isLast = current === questions.length - 1;

  // Category badge colors
  const catStyles: Record<string, string> = {
    'Verbal': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    'Math & Logic': 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    'Spatial Reasoning': 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300',
  };

  function optionStyle(i: number) {
    if (reviewMode) {
      if (i === q.correct) return 'border-emerald-500/60 bg-emerald-50/60 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-medium';
      if (userAnswer === i && i !== q.correct) return 'border-rose-500/60 bg-rose-50/60 dark:bg-rose-500/10 text-rose-800 dark:text-rose-200';
      return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
    if (userAnswer === i) return 'border-indigo-500/60 bg-indigo-50/60 dark:bg-indigo-500/[0.08] text-indigo-800 dark:text-indigo-200 font-medium';
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50/30 dark:hover:bg-indigo-500/[0.04]';
  }

  function letterBubbleStyle(i: number) {
    if (reviewMode) {
      if (i === q.correct) return 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100';
      if (userAnswer === i && i !== q.correct) return 'bg-rose-200 dark:bg-rose-800 text-rose-800 dark:text-rose-100';
    }
    if (userAnswer === i) return 'bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Q {current + 1}</span>
          <span className="text-sm text-gray-400 dark:text-gray-500"> / 50</span>
        </div>
        {reviewMode ? (
          <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 px-3 py-1 rounded-full">
            Review Mode
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${TimerDot(timeLeft)}`} />
            <span className={`text-base font-bold tabular-nums ${TimerColor(timeLeft)}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-300"
          style={{ width: `${((current + 1) / 50) * 100}%` }}
        />
      </div>

      {/* Question meta */}
      <div className="flex gap-2 flex-wrap">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catStyles[q.category] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
          {q.category}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          {q.type}
        </span>
      </div>

      {/* Question text */}
      <p className="text-sm leading-relaxed whitespace-pre-line text-gray-900 dark:text-gray-100">
        {q.question}
      </p>

      {/* AI-generated spatial image (image-based spatial questions) */}
      {q.spatialImage && (
        <div className="my-3">
          <img
            src={q.spatialImage}
            alt="Spatial pattern"
            className="max-w-full rounded-lg border border-gray-200 dark:border-gray-600"
          />
        </div>
      )}

      {/* SVG descriptor-based spatial elements (pre-built questions) */}
      {!q.spatialImage && q.spatial === 'attention' && q.attentionLeft && q.attentionRight && (
        <CCATAttentionTable left={q.attentionLeft} right={q.attentionRight} />
      )}
      {!q.spatialImage && q.spatial === 'nextInSeries' && q.seriesDescriptors && q.optionDescriptors && (
        <div className="my-2">
          <CCATNextInSeries
            descriptors={q.seriesDescriptors}
            optionDescriptors={q.optionDescriptors}
          />
        </div>
      )}
      {!q.spatialImage && q.spatial === 'matrix' && q.matrixDescriptors && q.optionDescriptors && (
        <div className="my-2">
          <CCATMatrix
            descriptors={q.matrixDescriptors}
            optionDescriptors={q.optionDescriptors}
          />
        </div>
      )}
      {!q.spatialImage && q.spatial === 'oddOneOut' && q.oddDescriptors && (
        <div className="my-2">
          <CCATOddOneOut descriptors={q.oddDescriptors} />
        </div>
      )}

      {/* Answer options */}
      <div className="space-y-2 mt-2">
        {q.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => !reviewMode && onSelect(i)}
            disabled={reviewMode}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left text-sm transition-all ${optionStyle(i)} ${reviewMode ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${letterBubbleStyle(i)}`}>
              {String.fromCharCode(65 + i)}
            </span>
            <span className="flex-1">{opt}</span>
            {reviewMode && i === q.correct && (
              <span className="ml-auto text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                ✓ Correct
              </span>
            )}
            {reviewMode && userAnswer === i && i !== q.correct && (
              <span className="ml-auto text-[10px] font-bold text-rose-600 dark:text-rose-400 flex-shrink-0">
                ✗ Your answer
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Explanation (review mode) */}
      {reviewMode && (
        <div className="mt-2 p-4 bg-blue-50/60 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800/50 border-l-4 border-l-blue-500">
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1">Explanation</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
            {q.explanation}
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onPrevious}
          disabled={current === 0}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            current === 0
              ? 'text-gray-300 dark:text-gray-600 cursor-default'
              : 'text-indigo-600 dark:text-indigo-400 border border-indigo-500/40 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex gap-2">
          {!reviewMode && isLast && (
            <button
              onClick={onFinish}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
            >
              <Flag className="w-4 h-4" />
              Finish Exam
            </button>
          )}
          {reviewMode && (
            <button
              onClick={onBackToResults}
              className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
            >
              Back to Results
            </button>
          )}
        </div>

        <button
          onClick={onNext}
          disabled={isLast}
          className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isLast
              ? 'text-gray-300 dark:text-gray-600 cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Question mini-map */}
      <div className="pt-1">
        <div className="flex flex-wrap gap-1">
          {questions.map((_, i) => {
            const isCurrent = i === current;
            const answered = answers[i] !== null;
            let bg = '';
            if (isCurrent) {
              bg = 'bg-indigo-600 text-white border-transparent';
            } else if (answered && reviewMode) {
              bg = answers[i] === questions[i].correct
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700';
            } else if (answered) {
              bg = 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700';
            } else {
              bg = 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-600';
            }
            return (
              <button
                key={i}
                onClick={() => onJump(i)}
                className={`w-6 h-6 flex items-center justify-center rounded text-[9px] font-bold border transition-colors ${bg}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
