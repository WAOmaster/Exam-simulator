'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, BookOpen, Eye } from 'lucide-react';
import { Question } from '@/lib/types';
import { isOptionSelected, isCorrectOption, parseAnswers } from '@/lib/multiAnswer';
import { parseInlineImages } from '@/lib/parseInlineImages';
import ZoomableImage from './ZoomableImage';
import QuestionImages from './QuestionImages';

const IMAGE_BASED_TYPES = new Set<NonNullable<Question['type']>>(['hotspot', 'drag-and-drop']);

/** Build a deduped list of every image associated with a question, in display order. */
function collectQuestionGallery(question: Question): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (url?: string) => {
    if (!url) return;
    if (seen.has(url)) return;
    seen.add(url);
    out.push(url);
  };
  for (const p of parseInlineImages(question.question)) {
    if (p.kind === 'img') push(p.value);
  }
  question.images?.forEach(push);
  question.answerImages?.forEach(push);
  return out;
}

/** Render question text with inline `[IMAGE: <url>]` markers replaced by zoomable images. */
function renderQuestionBody(text: string, gallery: string[]) {
  const parts = parseInlineImages(text);
  if (parts.length === 0) return text;
  return parts.map((p, i) =>
    p.kind === 'text' ? (
      <span key={i} className="whitespace-pre-wrap">{p.value}</span>
    ) : (
      <span key={i} className="block my-3">
        <ZoomableImage src={p.value} alt="Question diagram" gallery={gallery} />
      </span>
    )
  );
}

interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  onAnswerSelect: (answerId: string) => void;
  onSubmit: () => void;
  isSubmitted: boolean;
  isLoading?: boolean;
  showFeedback?: boolean;
  multiAnswer?: boolean;
  requiredAnswerCount?: number;
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
  showFeedback = true,
  multiAnswer = false,
  requiredAnswerCount = 1,
}: QuestionCardProps) {

  const isImageBased = !!question.type && IMAGE_BASED_TYPES.has(question.type);
  const [revealed, setRevealed] = useState(false);
  const gallery = useMemo(() => collectQuestionGallery(question), [question]);

  const getOptionStyle = (optionId: string) => {
    const baseStyle = "w-full text-left p-4 rounded-xl transition-all duration-200";
    const selected = isOptionSelected(optionId, selectedAnswer);
    const correct = isCorrectOption(optionId, question.correctAnswer);

    if (!isSubmitted) {
      if (selected) {
        return `${baseStyle} option-selected shadow-sm`;
      }
      return `${baseStyle} option-default cursor-pointer hover:shadow-md`;
    }

    // After submission - only show feedback if showFeedback is true
    if (!showFeedback) {
      return selected
        ? `${baseStyle} bg-muted border-2 border-card-border`
        : `${baseStyle} bg-muted/50 border-2 border-transparent opacity-60`;
    }

    // Show color-coded feedback
    if (correct) {
      return `${baseStyle} option-correct shadow-sm`;
    }

    if (selected && !correct) {
      return `${baseStyle} option-incorrect shadow-sm`;
    }

    return `${baseStyle} bg-muted/30 border-2 border-transparent opacity-50`;
  };

  const getOptionIcon = (optionId: string) => {
    if (!isSubmitted || !showFeedback) return null;
    const correct = isCorrectOption(optionId, question.correctAnswer);
    const selected = isOptionSelected(optionId, selectedAnswer);

    if (correct) {
      return (
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <CheckCircle2 className="w-5 h-5 text-accent-green" />
        </motion.div>
      );
    }

    if (selected && !correct) {
      return (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <XCircle className="w-5 h-5 text-accent-red" />
        </motion.div>
      );
    }

    return null;
  };

  // Option labels styled like bubble sheet
  const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="card-paper p-4 sm:p-6 md:p-8"
    >
      {/* Question Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-5">
          {/* Question number badge */}
          <div className="flex items-center gap-3">
            <span className="question-badge">
              Q{questionNumber}
            </span>
            <span className="text-sm text-muted-foreground">
              of {totalQuestions}
            </span>
          </div>

          {/* Category tag */}
          <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted rounded-lg text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5" />
            {question.category}
          </span>
        </div>

        {/* Question text (parses inline [IMAGE: <url>] markers) */}
        <div className="text-sm sm:text-base md:text-lg font-medium leading-relaxed text-foreground">
          {renderQuestionBody(question.question, gallery)}
        </div>

        {/* Spatial image (AI-generated for spatial-* question types) */}
        {question.spatialImage && (
          <div className="mt-4">
            <img
              src={question.spatialImage}
              alt="Spatial pattern"
              className="max-w-full rounded-xl border border-card-border"
            />
          </div>
        )}

        {/* Question images (top-level, for diagrams not embedded as markers).
            Skip URLs already inline as [IMAGE:] markers. */}
        {question.images && question.images.length > 0 && (() => {
          const inlineUrls = new Set(
            parseInlineImages(question.question)
              .filter(p => p.kind === 'img')
              .map(p => p.value)
          );
          const extras = question.images.filter(u => !inlineUrls.has(u));
          if (extras.length === 0) return null;
          return (
            <div className="mt-4">
              <QuestionImages images={extras} gallery={gallery} altPrefix="Question image" />
            </div>
          );
        })()}
      </div>

      {/* Image-based question (hotspot / drag-and-drop): show "Reveal Answer"
          and self-grade buttons instead of option list. */}
      {isImageBased ? (
        <div className="space-y-4 mb-6 sm:mb-8">
          {!isSubmitted && !revealed && (
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-base sm:text-lg btn-primary flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5" />
              Reveal Answer
            </button>
          )}

          {(revealed || isSubmitted) && question.answerImages && question.answerImages.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Answer</p>
              <QuestionImages images={question.answerImages} gallery={gallery} altPrefix="Answer image" />
            </div>
          )}

          {(revealed || isSubmitted) && question.explanation && (
            <div className="p-4 rounded-xl bg-muted/40 border border-card-border whitespace-pre-wrap text-sm sm:text-base">
              {renderQuestionBody(question.explanation, gallery)}
            </div>
          )}

          {revealed && !isSubmitted && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => { onAnswerSelect('SELF:correct'); setTimeout(onSubmit, 0); }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-accent-green text-white hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                I got it right
              </button>
              <button
                type="button"
                onClick={() => { onAnswerSelect('SELF:incorrect'); setTimeout(onSubmit, 0); }}
                className="flex-1 py-3 px-4 rounded-xl font-semibold bg-accent-red text-white hover:opacity-90 transition flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                I got it wrong
              </button>
            </div>
          )}
        </div>
      ) : (
      <>
      {/* Multi-answer instruction */}
      {multiAnswer && !isSubmitted && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
            Select {requiredAnswerCount} answers
          </span>
        </div>
      )}

      {/* Options - Bubble sheet style */}
      <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
        {question.options.map((option, index) => (
          <motion.button
            key={option.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
            whileHover={!isSubmitted ? { scale: 1.01, x: 4 } : {}}
            whileTap={!isSubmitted ? { scale: 0.99 } : {}}
            onClick={() => !isSubmitted && onAnswerSelect(option.id)}
            disabled={isSubmitted}
            className={getOptionStyle(option.id)}
          >
            <div className="flex items-center gap-2.5 sm:gap-4">
              {/* Bubble-style option indicator */}
              <div className={`
                flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
                font-mono font-bold text-xs sm:text-sm transition-all duration-200
                ${isOptionSelected(option.id, selectedAnswer)
                  ? isSubmitted
                    ? showFeedback
                      ? isCorrectOption(option.id, question.correctAnswer)
                        ? 'bg-accent-green text-white'
                        : 'bg-accent-red text-white'
                      : 'bg-accent-blue text-white'
                    : 'bg-accent-blue text-white'
                  : 'bg-muted text-muted-foreground'
                }
              `}>
                {optionLabels[index] || option.id}
              </div>

              {/* Option text */}
              <span className="flex-1 text-sm leading-relaxed">
                {option.text}
              </span>

              {/* Feedback icon */}
              <div className="flex-shrink-0">
                {getOptionIcon(option.id)}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Submit Button */}
      {!isSubmitted && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={selectedAnswer ? { scale: 1.01 } : {}}
          whileTap={selectedAnswer ? { scale: 0.99 } : {}}
          onClick={onSubmit}
          disabled={!selectedAnswer || isLoading || (multiAnswer && parseAnswers(selectedAnswer).length < requiredAnswerCount)}
          className={`
            w-full py-3 sm:py-4 px-4 sm:px-6 rounded-xl font-semibold text-base sm:text-lg
            transition-all duration-300 flex items-center justify-center gap-3
            ${selectedAnswer && !isLoading && (!multiAnswer || parseAnswers(selectedAnswer).length >= requiredAnswerCount)
              ? 'btn-primary'
              : 'bg-muted text-muted-foreground cursor-not-allowed'
            }
          `}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Checking Answer...</span>
            </>
          ) : (
            <span>Submit Answer</span>
          )}
        </motion.button>
      )}

      {/* Post-submission indicator */}
      {isSubmitted && !showFeedback && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-3 text-sm text-muted-foreground"
        >
          Answer recorded • Continue to next question
        </motion.div>
      )}
      </>
      )}
    </motion.div>
  );
}
