// Standalone replica of validateQuestions() from JsonImportDialog.tsx,
// run against the real scraper output to confirm 0 questions are dropped
// and HOTSPOT is preserved with the SELF:correct sentinel.

import fs from 'node:fs';

const IMAGE_BASED_TYPES = new Set(['hotspot', 'drag-drop', 'drag-and-drop']);

function normalizeQuestionType(raw) {
  if (typeof raw !== 'string' || !raw) return 'multiple-choice';
  if (raw === 'drag-drop') return 'drag-and-drop';
  return raw;
}

function validateQuestions(data) {
  const errors = [];
  const valid = [];
  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const idx = i + 1;
    if (!q.question || typeof q.question !== 'string') {
      errors.push(`Q${idx}: Missing or invalid "question" field`);
      continue;
    }
    const resolvedType = normalizeQuestionType(q.questionType ?? q.type);
    const isImageBased = IMAGE_BASED_TYPES.has(String(q.questionType ?? q.type ?? '')) ||
      resolvedType === 'hotspot' || resolvedType === 'drag-and-drop';
    if (!Array.isArray(q.options)) { errors.push(`Q${idx}: missing options`); continue; }
    if (q.options.length < 2 && !isImageBased) { errors.push(`Q${idx}: options < 2`); continue; }
    if (!isImageBased && (!q.correctAnswer || typeof q.correctAnswer !== 'string')) {
      errors.push(`Q${idx}: missing correctAnswer`); continue;
    }
    const rawCorrect = typeof q.correctAnswer === 'string' ? q.correctAnswer : '';
    const correctAnswer = isImageBased && !rawCorrect ? 'SELF:correct' : rawCorrect;
    valid.push({
      id: q.id ?? i + 1,
      question: q.question,
      options: q.options.map((opt, oi) => ({ id: opt.id || String.fromCharCode(65 + oi), text: opt.text || String(opt) })),
      correctAnswer,
      explanation: q.explanation || '',
      category: q.category || 'Imported',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      type: resolvedType,
      ...(Array.isArray(q.images) && q.images.length > 0 ? { images: q.images } : {}),
      ...(Array.isArray(q.answerImages) && q.answerImages.length > 0 ? { answerImages: q.answerImages } : {}),
      ...(typeof q.explanationSource === 'string' && q.explanationSource ? { explanationSource: q.explanationSource } : {}),
      ...(typeof q.explanationVotes === 'number' ? { explanationVotes: q.explanationVotes } : {}),
      ...(typeof q.sourceUrl === 'string' && q.sourceUrl ? { sourceUrl: q.sourceUrl } : {}),
    });
  }
  return { valid, errors };
}

const path = 'F:/Dev/Examtopics_scraper/output/examtopics/CompTIA_sy0-701_google_20260508_080314.json';
const raw = JSON.parse(fs.readFileSync(path, 'utf-8'));
const { valid, errors } = validateQuestions(raw);

console.log(`Input: ${raw.length} questions`);
console.log(`Imported: ${valid.length} questions (${errors.length} dropped)`);
console.log('Errors:', errors);
const byType = {};
for (const q of valid) byType[q.type] = (byType[q.type] || 0) + 1;
console.log('Type distribution:', byType);

const hotspot = valid.find(q => q.type === 'hotspot');
console.log('\nHOTSPOT present?', !!hotspot);
if (hotspot) {
  console.log('  correctAnswer:', JSON.stringify(hotspot.correctAnswer));
  console.log('  options:', hotspot.options.length);
  console.log('  images:', hotspot.images?.length);
  console.log('  sourceUrl:', hotspot.sourceUrl);
}

const ms = valid.find(q => q.type === 'multi-select');
console.log('\nMulti-select sample:');
if (ms) {
  console.log('  correctAnswer:', JSON.stringify(ms.correctAnswer));
  console.log('  options:', ms.options.length);
  console.log('  explanationSource:', ms.explanationSource, 'votes:', ms.explanationVotes);
}

// Sanity check: answersMatch for SELF:correct sentinel
import('../lib/multiAnswer.ts').catch(() => {
  // can't import TS in pure node; replicate
  function parseAnswers(a) { return a.split(',').map(s => s.trim()).filter(Boolean).sort(); }
  function answersMatch(a, b) { const pa = parseAnswers(a); const pb = parseAnswers(b); return pa.length === pb.length && pa.every((v, i) => v === pb[i]); }
  console.log('\nSelf-grade sentinel test:');
  console.log('  SELF:correct vs SELF:correct ->', answersMatch('SELF:correct', 'SELF:correct'));
  console.log('  SELF:incorrect vs SELF:correct ->', answersMatch('SELF:incorrect', 'SELF:correct'));
});
