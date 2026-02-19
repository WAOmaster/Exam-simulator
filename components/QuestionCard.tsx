'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, BookOpen } from 'lucide-react';
import { Question } from '@/lib/types';

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
}: QuestionCardProps) {

  const getOptionStyle = (optionId: string) => {
    const baseStyle = "w-full text-left p-4 rounded-xl transition-all duration-200";

    if (!isSubmitted) {
      if (selectedAnswer === optionId) {
        return `${baseStyle} option-selected shadow-sm`;
      }
      return `${baseStyle} option-default cursor-pointer hover:shadow-md`;
    }

    // After submission - only show feedback if showFeedback is true
    if (!showFeedback) {
      return selectedAnswer === optionId
        ? `${baseStyle} bg-muted border-2 border-card-border`
        : `${baseStyle} bg-muted/50 border-2 border-transparent opacity-60`;
    }

    // Show color-coded feedback
    if (optionId === question.correctAnswer) {
      return `${baseStyle} option-correct shadow-sm`;
    }

    if (optionId === selectedAnswer && optionId !== question.correctAnswer) {
      return `${baseStyle} option-incorrect shadow-sm`;
    }

    return `${baseStyle} bg-muted/30 border-2 border-transparent opacity-50`;
  };

  const getOptionIcon = (optionId: string) => {
    if (!isSubmitted || !showFeedback) return null;

    if (optionId === question.correctAnswer) {
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

    if (optionId === selectedAnswer && optionId !== question.correctAnswer) {
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
      className="card-paper p-6 md:p-8"
    >
      {/* Question Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-5">
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

        {/* Question text */}
        <h2 className="text-xl md:text-2xl font-display leading-relaxed text-foreground">
          {question.question}
        </h2>

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
      </div>

      {/* Options - Bubble sheet style */}
      <div className="space-y-3 mb-8">
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
            <div className="flex items-center gap-4">
              {/* Bubble-style option indicator */}
              <div className={`
                flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center
                font-mono font-bold text-sm transition-all duration-200
                ${selectedAnswer === option.id
                  ? isSubmitted
                    ? showFeedback
                      ? option.id === question.correctAnswer
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
              <span className="flex-1 text-base leading-relaxed">
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
          disabled={!selectedAnswer || isLoading}
          className={`
            w-full py-4 px-6 rounded-xl font-semibold text-lg
            transition-all duration-300 flex items-center justify-center gap-3
            ${selectedAnswer && !isLoading
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
    </motion.div>
  );
}
