import { Question, QuestionSet } from './types';
import { CCATQuestion } from './ccatTypes';

export const CCAT_CATEGORIES = new Set(['Verbal', 'Math & Logic', 'Spatial Reasoning']);

const CCAT_TYPES = new Set<NonNullable<Question['type']>>([
  'verbal-analogy', 'sentence-completion', 'antonym', 'syllogism',
  'number-series', 'word-problem', 'attention-to-detail',
  'spatial-next-in-series', 'spatial-matrix', 'spatial-odd-one-out',
]);

// Reverse of the import mapping: enum value → human-readable badge label.
const TYPE_LABEL: Record<string, string> = {
  'sentence-completion': 'Sentence Completion',
  'verbal-analogy': 'Analogy',
  'antonym': 'Antonym',
  'syllogism': 'Syllogism',
  'number-series': 'Number Series',
  'word-problem': 'Word Problem',
  'attention-to-detail': 'Attention to Detail',
  'spatial-next-in-series': 'Next in Series',
  'spatial-matrix': 'Matrix',
  'spatial-odd-one-out': 'Odd One Out',
  'multiple-choice': 'Multiple Choice',
  'true-false': 'True / False',
  'scenario': 'Scenario',
};

function hasSpatial(q: Question): boolean {
  return (
    !!q.spatial ||
    !!q.seriesDescriptors ||
    !!q.matrixDescriptors ||
    !!q.oddDescriptors ||
    (!!q.attentionLeft && !!q.attentionRight)
  );
}

export function isCcatQuestion(q: Question): boolean {
  return hasSpatial(q) || (q.type ? CCAT_TYPES.has(q.type) : false) || CCAT_CATEGORIES.has(q.category);
}

/**
 * A set is treated as CCAT-style (and routed through the CCAT flow) when it
 * contains spatial questions, or the majority of its questions use CCAT
 * categories / question types. Ordinary MCQ sets (multiple-choice, true-false,
 * scenario) stay on the standard exam/practice flow.
 */
export function isCcatSet(set: QuestionSet): boolean {
  const qs = set.questions;
  if (!qs || qs.length === 0) return false;
  if (qs.some(hasSpatial)) return true;
  const ccatCount = qs.filter(isCcatQuestion).length;
  return ccatCount / qs.length >= 0.6;
}

function ccatCategory(q: Question): CCATQuestion['category'] {
  if (q.category === 'Verbal' || q.category === 'Math & Logic' || q.category === 'Spatial Reasoning') {
    return q.category;
  }
  if (hasSpatial(q)) return 'Spatial Reasoning';
  return 'Verbal';
}

export function questionToCcat(q: Question): CCATQuestion {
  const idx = q.options.findIndex((o) => o.id === q.correctAnswer);
  return {
    id: q.id,
    category: ccatCategory(q),
    type: (q.type && TYPE_LABEL[q.type]) || 'Question',
    question: q.question,
    options: q.options.map((o) => o.text),
    correct: idx >= 0 ? idx : 0,
    explanation: q.explanation || '',
    ...(q.spatial ? { spatial: q.spatial } : {}),
    ...(q.seriesDescriptors ? { seriesDescriptors: q.seriesDescriptors } : {}),
    ...(q.optionDescriptors ? { optionDescriptors: q.optionDescriptors } : {}),
    ...(q.matrixDescriptors ? { matrixDescriptors: q.matrixDescriptors } : {}),
    ...(q.oddDescriptors ? { oddDescriptors: q.oddDescriptors } : {}),
    ...(q.attentionLeft ? { attentionLeft: q.attentionLeft } : {}),
    ...(q.attentionRight ? { attentionRight: q.attentionRight } : {}),
    ...(q.spatialImage ? { spatialImage: q.spatialImage } : {}),
  };
}

export function questionsToCcat(qs: Question[]): CCATQuestion[] {
  return qs.map(questionToCcat);
}
