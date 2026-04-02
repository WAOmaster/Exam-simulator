/**
 * JSON Cleaner Utility
 * Automatically cleans exam dump JSON files by removing metadata,
 * fixing formatting issues, and preparing questions for AI enhancement
 */

export interface RawQuestion {
  id?: number | string;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation?: string;
  category?: string;
  difficulty?: string;
  type?: string;
  [key: string]: any; // Allow extra fields
}

export interface CleanedQuestion {
  id: number;
  question: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type?: 'multiple-choice' | 'true-false' | 'scenario' | 'hotspot' | 'drag-and-drop';
  needsEnhancement?: boolean;
}

export interface CleaningResult {
  questions: CleanedQuestion[];
  needsEnhancement: boolean;
  metadata: {
    originalCount: number;
    cleanedCount: number;
    missingExplanations: number;
    missingDifficulty: number;
  };
}

/**
 * Patterns to detect and remove from question text
 */
const METADATA_PATTERNS = [
  /Hide Answer/gi,
  /Suggested Answer:?\s*[A-Z,.\s]+/gi,
  /Most Voted/gi,
  /Community vote distribution[\s\S]*?(?=\n\n|\n[A-Z]\.|$)/gi,
  /[A-Z]{2,3}\s*\(\d+%\)/g, // e.g., "ABC (72%)"
  /🗳️/g, // Ballot box emoji
  /Reveal Solution/gi,
  /Discussion\s*\d+/gi,
];

/**
 * Patterns to detect metadata in option text
 */
const OPTION_METADATA_PATTERNS = [
  /Most Voted/gi,
  /Highly Voted/gi,
  /Community Voted/gi,
];

/**
 * Clean question text by removing exam dump metadata
 */
function cleanQuestionText(text: string): string {
  let cleaned = text;

  // Remove all metadata patterns
  METADATA_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove multiple consecutive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Clean option text by removing metadata
 */
function cleanOptionText(text: string): string {
  let cleaned = text;

  OPTION_METADATA_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });

  return cleaned.trim();
}

/**
 * Normalize option ID format (A., A, etc. -> A)
 * Preserves numeric IDs for HOTSPOT and drag-and-drop questions
 */
function normalizeOptionId(id: string): string {
  // If it's a numeric ID (1, 2, 3, etc.), keep it as is
  if (/^\d+\.?$/.test(id.trim())) {
    return id.replace(/\./g, '').trim();
  }

  // Otherwise, remove periods, parentheses, brackets and uppercase
  return id.replace(/[.)\]]/g, '').trim().toUpperCase();
}

/**
 * Normalize correct answer format
 */
function normalizeCorrectAnswer(answer: string): string {
  // Split by common separators
  const answers = answer
    .split(/[,\s]+/)
    .map((a) => normalizeOptionId(a))
    .filter((a) => a.length > 0);

  // Join with commas (no spaces)
  return answers.join(',');
}

/**
 * Infer question type from question text and options
 */
function inferQuestionType(
  question: string,
  options: Array<{ id: string; text: string }>
): 'multiple-choice' | 'true-false' | 'scenario' | 'hotspot' | 'drag-and-drop' {
  const questionLower = question.toLowerCase();

  // HOTSPOT detection
  if (questionLower.includes('hotspot') || questionLower.includes('hot spot')) {
    return 'hotspot';
  }

  // Drag-and-drop detection
  if (
    questionLower.includes('drag') ||
    questionLower.includes('drop') ||
    questionLower.includes('drag and drop') ||
    questionLower.includes('drag-and-drop')
  ) {
    return 'drag-and-drop';
  }

  // Check if all option IDs are numeric (common for HOTSPOT/drag-and-drop)
  const allNumeric = options.every((opt) => /^\d+$/.test(opt.id));
  if (allNumeric && options.length > 2) {
    // Could be HOTSPOT or drag-and-drop, default to drag-and-drop
    return 'drag-and-drop';
  }

  // True/False detection
  if (options.length === 2) {
    const optionTexts = options.map((o) => o.text.toLowerCase());
    if (
      (optionTexts.includes('true') && optionTexts.includes('false')) ||
      (optionTexts.includes('yes') && optionTexts.includes('no'))
    ) {
      return 'true-false';
    }
  }

  // Scenario detection (long question text with context)
  if (question.length > 500 || question.includes('\n\n')) {
    return 'scenario';
  }

  return 'multiple-choice';
}

/**
 * Infer difficulty from question characteristics
 */
function inferDifficulty(question: string, options: Array<{ id: string; text: string }>): 'easy' | 'medium' | 'hard' {
  let score = 0;

  // Long questions are usually harder
  if (question.length > 500) score += 2;
  else if (question.length > 300) score += 1;

  // Many options suggest complexity
  if (options.length > 5) score += 2;
  else if (options.length > 4) score += 1;

  // Multiple correct answers (Choose X) are harder
  if (/choose\s+(two|three|four|2|3|4)/gi.test(question)) score += 2;

  // Technical terms suggest higher difficulty
  const technicalTerms = [
    'configure',
    'implement',
    'architect',
    'optimize',
    'integration',
    'compliance',
    'security',
    'scalability',
  ];
  const termCount = technicalTerms.filter((term) => question.toLowerCase().includes(term)).length;
  score += Math.min(termCount, 2);

  // Determine difficulty based on score
  if (score >= 5) return 'hard';
  if (score >= 3) return 'medium';
  return 'easy';
}

/**
 * Main cleaning function
 */
export function cleanExamDumpJSON(rawQuestions: RawQuestion[]): CleaningResult {
  const cleaned: CleanedQuestion[] = [];
  let missingExplanations = 0;
  let missingDifficulty = 0;

  rawQuestions.forEach((raw, index) => {
    try {
      // Clean question text
      const cleanedQuestion = cleanQuestionText(raw.question);

      // Clean and normalize options
      const cleanedOptions = raw.options.map((option) => ({
        id: normalizeOptionId(option.id),
        text: cleanOptionText(option.text),
      }));

      // Normalize correct answer
      const normalizedAnswer = normalizeCorrectAnswer(raw.correctAnswer);

      // Check if explanation is missing or empty
      const hasExplanation = raw.explanation && raw.explanation.trim().length > 0;
      if (!hasExplanation) missingExplanations++;

      // Check if difficulty is missing or empty
      const hasDifficulty = raw.difficulty && raw.difficulty.trim().length > 0;
      if (!hasDifficulty) missingDifficulty++;

      // Infer difficulty if missing
      const difficulty = hasDifficulty
        ? (raw.difficulty as 'easy' | 'medium' | 'hard')
        : inferDifficulty(cleanedQuestion, cleanedOptions);

      // Infer question type
      const type = raw.type || inferQuestionType(cleanedQuestion, cleanedOptions);

      cleaned.push({
        id: raw.id ? Number(raw.id) : index + 1,
        question: cleanedQuestion,
        options: cleanedOptions,
        correctAnswer: normalizedAnswer,
        explanation: hasExplanation ? raw.explanation!.trim() : '',
        category: raw.category || 'General',
        difficulty,
        type: type as 'multiple-choice' | 'true-false' | 'scenario' | 'hotspot' | 'drag-and-drop',
        needsEnhancement: !hasExplanation,
      });
    } catch (error) {
      console.error(`Error cleaning question ${index + 1}:`, error);
    }
  });

  return {
    questions: cleaned,
    needsEnhancement: missingExplanations > 0,
    metadata: {
      originalCount: rawQuestions.length,
      cleanedCount: cleaned.length,
      missingExplanations,
      missingDifficulty,
    },
  };
}

/**
 * Detect if JSON appears to be from an exam dump
 */
export function isExamDumpFormat(questions: RawQuestion[]): boolean {
  if (!questions || questions.length === 0) return false;

  // Check first few questions for exam dump indicators
  const sampleSize = Math.min(3, questions.length);
  let indicators = 0;

  for (let i = 0; i < sampleSize; i++) {
    const q = questions[i];

    // Check for metadata patterns in question text
    if (
      /Hide Answer/i.test(q.question) ||
      /Suggested Answer/i.test(q.question) ||
      /Most Voted/i.test(q.question) ||
      /Community vote/i.test(q.question)
    ) {
      indicators++;
    }

    // Check for metadata in option text
    if (q.options?.some((opt) => /Most Voted/i.test(opt.text))) {
      indicators++;
    }

    // Check for period in option IDs (A., B., etc.)
    if (q.options?.some((opt) => /^[A-Z]\./.test(opt.id))) {
      indicators++;
    }

    // Check for period in correctAnswer (A., B., C.)
    if (q.correctAnswer?.includes('.')) {
      indicators++;
    }
  }

  // If we found 2+ indicators, it's likely an exam dump
  return indicators >= 2;
}

/**
 * Validate cleaned questions
 */
export function validateQuestions(questions: CleanedQuestion[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  questions.forEach((q, index) => {
    // Skip option/answer validation for HOTSPOT and drag-and-drop questions
    // These use numeric IDs and different answer formats
    const skipValidation = q.type === 'hotspot' || q.type === 'drag-and-drop';

    // Check required fields
    if (!q.question || q.question.trim().length === 0) {
      errors.push(`Question ${index + 1}: Missing question text`);
    }

    if (!q.options || q.options.length < 2) {
      errors.push(`Question ${index + 1}: Must have at least 2 options`);
    }

    // Only validate correctAnswer for non-HOTSPOT/drag-and-drop questions
    if (!skipValidation && (!q.correctAnswer || q.correctAnswer.trim().length === 0)) {
      errors.push(`Question ${index + 1}: Missing correct answer`);
    }

    if (!skipValidation) {
      // Validate correct answer references existing options
      const optionIds = q.options.map((o) => o.id);
      const correctAnswers = q.correctAnswer.split(',');
      correctAnswers.forEach((answer) => {
        if (!optionIds.includes(answer)) {
          errors.push(`Question ${index + 1}: Correct answer '${answer}' not found in options`);
        }
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
