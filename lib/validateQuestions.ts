// Single source of truth for import-time question validation/normalization.
// Used by components/JsonImportDialog.tsx (UI import), scripts/verify-import.mjs
// (CLI + CI check), and scripts/process-questions.mjs (dump pipeline), so the
// importer and the offline tooling can never drift apart.

// Relative import (not '@/lib/types') so Node scripts can run this via tsx
import { Question } from './types';

export const IMAGE_BASED_TYPES = new Set(['hotspot', 'drag-drop', 'drag-and-drop']);

export function normalizeQuestionType(raw: any): Question['type'] {
  if (typeof raw !== 'string' || !raw) return 'multiple-choice';
  // Scraper emits 'drag-drop'; the simulator's enum uses 'drag-and-drop'
  if (raw === 'drag-drop') return 'drag-and-drop';
  return raw as Question['type'];
}

// CCAT files use human-readable type labels + a `spatial` discriminator.
// Map them onto the simulator's question-type enum.
const CCAT_TYPE_MAP: Record<string, Question['type']> = {
  'sentence completion': 'sentence-completion',
  'analogy': 'verbal-analogy',
  'verbal analogy': 'verbal-analogy',
  'antonym': 'antonym',
  'syllogism': 'syllogism',
  'number series': 'number-series',
  'word problem': 'word-problem',
  'basic math': 'word-problem',
  'tables and graphs': 'word-problem',
  'seating arrangement': 'word-problem',
  'attention to detail': 'attention-to-detail',
  'next in series': 'spatial-next-in-series',
  'matrix': 'spatial-matrix',
  'odd one out': 'spatial-odd-one-out',
};

export function ccatQuestionType(typeLabel: any, spatial: any): Question['type'] {
  if (spatial === 'nextInSeries') return 'spatial-next-in-series';
  if (spatial === 'matrix') return 'spatial-matrix';
  if (spatial === 'oddOneOut') return 'spatial-odd-one-out';
  if (spatial === 'attention') return 'attention-to-detail';
  if (typeof typeLabel === 'string') {
    const mapped = CCAT_TYPE_MAP[typeLabel.trim().toLowerCase()];
    if (mapped) return mapped;
  }
  return 'multiple-choice';
}

/**
 * Detect the CCAT question shape: a numeric `correct` index, a `spatial`
 * discriminator, or plain-string options (rather than { id, text }).
 */
export function isCcatShape(q: any): boolean {
  return (
    typeof q.correct === 'number' ||
    typeof q.spatial === 'string' ||
    (Array.isArray(q.options) && q.options.length > 0 && typeof q.options[0] === 'string')
  );
}

export function validateQuestions(data: any[]): { valid: Question[]; errors: string[] } {
  const errors: string[] = [];
  const valid: Question[] = [];

  if (!Array.isArray(data)) {
    return { valid: [], errors: ['File does not contain a JSON array'] };
  }

  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const idx = i + 1;

    if (!q.question || typeof q.question !== 'string') {
      errors.push(`Q${idx}: Missing or invalid "question" field`);
      continue;
    }

    const ccat = isCcatShape(q);

    // Scraper writes `questionType`; older fixtures use `type`. Prefer the new field.
    const resolvedType = ccat
      ? ccatQuestionType(q.type, q.spatial)
      : normalizeQuestionType(q.questionType ?? q.type);
    const isImageBased = IMAGE_BASED_TYPES.has(String(q.questionType ?? q.type ?? '')) ||
      resolvedType === 'hotspot' || resolvedType === 'drag-and-drop';

    if (!Array.isArray(q.options)) {
      errors.push(`Q${idx}: Missing "options" field`);
      continue;
    }
    if (q.options.length < 2 && !isImageBased) {
      errors.push(`Q${idx}: "options" must have at least 2 items (or set questionType to hotspot/drag-drop)`);
      continue;
    }

    // Resolve the correct answer to an option-id string ("A", "B", ...).
    // Standard files store it directly; CCAT files store a numeric index.
    let correctAnswer: string;
    if (typeof q.correctAnswer === 'string' && q.correctAnswer) {
      correctAnswer = q.correctAnswer;
    } else if (typeof q.correct === 'number') {
      correctAnswer = String.fromCharCode(65 + q.correct);
    } else if (isImageBased) {
      // Sentinel so the runtime score path treats the user's self-grade
      // ("SELF:correct" vs "SELF:incorrect") consistently.
      correctAnswer = 'SELF:correct';
    } else {
      errors.push(`Q${idx}: Missing or invalid "correctAnswer"/"correct" field`);
      continue;
    }

    // Normalize the question
    valid.push({
      id: q.id ?? i + 1,
      question: q.question,
      options: q.options.map((opt: any, oi: number) => ({
        id: (opt && typeof opt === 'object' && opt.id) || String.fromCharCode(65 + oi),
        text: (opt && typeof opt === 'object' ? opt.text : undefined) ?? String(opt),
      })),
      correctAnswer,
      explanation: q.explanation || '',
      category: q.category || 'Imported',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      type: resolvedType,
      // CCAT vector-spatial fields (carried through untouched for rendering)
      ...(typeof q.spatial === 'string' ? { spatial: q.spatial } : {}),
      ...(Array.isArray(q.seriesDescriptors) ? { seriesDescriptors: q.seriesDescriptors } : {}),
      ...(Array.isArray(q.optionDescriptors) ? { optionDescriptors: q.optionDescriptors } : {}),
      ...(Array.isArray(q.matrixDescriptors) ? { matrixDescriptors: q.matrixDescriptors } : {}),
      ...(Array.isArray(q.oddDescriptors) ? { oddDescriptors: q.oddDescriptors } : {}),
      ...(Array.isArray(q.attentionLeft) ? { attentionLeft: q.attentionLeft } : {}),
      ...(Array.isArray(q.attentionRight) ? { attentionRight: q.attentionRight } : {}),
      ...(typeof q.spatialImage === 'string' && q.spatialImage ? { spatialImage: q.spatialImage } : {}),
      ...(Array.isArray(q.images) && q.images.length > 0 ? { images: q.images.filter((s: any) => typeof s === 'string') } : {}),
      ...(Array.isArray(q.answerImages) && q.answerImages.length > 0 ? { answerImages: q.answerImages.filter((s: any) => typeof s === 'string') } : {}),
      ...(typeof q.explanationSource === 'string' && q.explanationSource ? { explanationSource: q.explanationSource } : {}),
      ...(typeof q.explanationVotes === 'number' ? { explanationVotes: q.explanationVotes } : {}),
      ...(typeof q.caseStudyId === 'string' && q.caseStudyId ? { caseStudyId: q.caseStudyId } : {}),
      ...(typeof q.caseStudySize === 'number' && q.caseStudySize > 1 ? { caseStudySize: q.caseStudySize } : {}),
      ...(typeof q.sourceUrl === 'string' && q.sourceUrl ? { sourceUrl: q.sourceUrl } : {}),
    });
  }

  return { valid, errors };
}
