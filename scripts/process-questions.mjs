#!/usr/bin/env npx tsx
// Unified question-dump pipeline: clean → validate → batch, for ANY dump
// (raw ExamTopics/Google dumps, scraper-schema files, CCAT files, or
// already-clean question arrays). Replaces the one-off, hardcoded
// process-aws-dump.js flow. Validation uses the exact importer rules
// (lib/validateQuestions.ts), so every emitted batch is import-safe.
//
// Usage:
//   npm run questions:process -- <input.json> [options]
//
// Options:
//   --prefix <name>       output file prefix          (default: input basename)
//   --out <dir>           output directory            (default: data/)
//   --batch-size <n>      questions per batch file    (default: 66; 0 = single file)
//   --category <text>     override category on every question
//   --keep-unanswered     keep questions with no correctAnswer/options instead of dropping
//
// Output: <out>/<prefix>-batch-N.json — plain question arrays, compatible with
// the app's JSON import dialog and "Upload File" tab.

import fs from 'node:fs';
import path from 'node:path';
import { validateQuestions, IMAGE_BASED_TYPES } from '../lib/validateQuestions.ts';

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const VALUE_FLAGS = new Set(['prefix', 'out', 'batch-size', 'category']);
function flag(name) { return args.includes(`--${name}`); }
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
let input;
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    if (VALUE_FLAGS.has(args[i].slice(2))) i++; // skip the flag's value
    continue;
  }
  input = args[i];
  break;
}

if (!input) {
  console.error('Usage: npm run questions:process -- <input.json> [--prefix name] [--out dir] [--batch-size 66] [--category "..."] [--keep-unanswered]');
  process.exit(2);
}

const outDir = opt('out', path.join(process.cwd(), 'data'));
const prefix = opt('prefix', path.basename(input, '.json').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
const batchSize = parseInt(opt('batch-size', '66'), 10);
const categoryOverride = opt('category', null);
const keepUnanswered = flag('keep-unanswered');

// ── Cleaners (ported from process-aws-dump.js) ──────────────────────────────

function cleanQuestionText(text) {
  // Remove "Hide Answer" section and everything after it
  text = text.replace(/\nHide Answer[\s\S]*$/i, '');
  // Remove embedded option lines  e.g.  "\nA. Some text\nB. ..."
  text = text.replace(/\n[A-E]\. [^\n]*/g, '');
  // Collapse multiple blank lines into one
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

function cleanOptionText(text) {
  // Remove " Most Voted" badge (with or without leading space)
  return text.replace(/\s*Most Voted\s*/gi, '').trim();
}

function detectType(options) {
  if (options.length === 2) {
    const texts = options.map(o => String(o.text ?? o).toLowerCase());
    if (texts.some(t => t === 'true' || t === 'false')) return 'true-false';
  }
  return 'multiple-choice';
}

// A question needs the raw-dump cleaners only if the dump artifacts are present
function isRawDumpQuestion(q) {
  return (
    (typeof q.question === 'string' && /\nHide Answer/i.test(q.question)) ||
    (Array.isArray(q.options) && q.options.some(o => typeof o?.text === 'string' && /Most Voted/i.test(o.text)))
  );
}

// ── Load ────────────────────────────────────────────────────────────────────

const rawFile = JSON.parse(fs.readFileSync(input, 'utf-8'));
const rawQuestions = Array.isArray(rawFile) ? rawFile : rawFile.questions;
if (!Array.isArray(rawQuestions)) {
  console.error('❌ Input must be a JSON array of questions or an object with a "questions" field');
  process.exit(1);
}
console.log(`Input: ${rawQuestions.length} questions from ${input}`);

// ── Clean ───────────────────────────────────────────────────────────────────

let cleanedCount = 0;
const cleaned = rawQuestions.map(q => {
  if (!isRawDumpQuestion(q)) return q;
  cleanedCount++;
  const options = (q.options || []).map(o => ({ ...o, text: cleanOptionText(String(o.text ?? '')) }));
  const isImageBased = IMAGE_BASED_TYPES.has(String(q.questionType ?? q.type ?? ''));
  return {
    ...q,
    question: cleanQuestionText(q.question),
    options,
    // Only infer a type when the dump didn't declare one
    ...(q.questionType || q.type || isImageBased ? {} : { type: detectType(options) }),
  };
});
if (cleanedCount > 0) {
  console.log(`Cleaned ${cleanedCount} raw-dump questions (Hide Answer / Most Voted / embedded options)`);
}

// Raw dumps contain unanswerable entries (empty options, no answer) that the
// old pipeline skipped. Drop them up front unless --keep-unanswered, so they
// show up as an explicit "skipped" count rather than validator errors.
let skippedUnanswerable = 0;
const answerable = cleaned.filter(q => {
  const isImageBased = IMAGE_BASED_TYPES.has(String(q.questionType ?? q.type ?? ''));
  const ok = isImageBased ||
    typeof q.correct === 'number' ||
    ((q.options?.length ?? 0) >= 2 && q.correctAnswer);
  if (!ok) skippedUnanswerable++;
  return keepUnanswered || ok;
});
if (skippedUnanswerable > 0 && !keepUnanswered) {
  console.log(`Skipped ${skippedUnanswerable} unanswerable questions (no options/answer; pass --keep-unanswered to keep)`);
}

// ── Validate with the importer's rules ──────────────────────────────────────

const { valid, errors } = validateQuestions(answerable);
if (errors.length > 0) {
  console.log(`Validator dropped ${errors.length} question(s):`);
  for (const err of errors.slice(0, 10)) console.log(`  - ${err}`);
  if (errors.length > 10) console.log(`  ... and ${errors.length - 10} more`);
}
if (valid.length === 0) {
  console.error('❌ No valid questions after cleaning + validation');
  process.exit(1);
}

// Renumber sequentially and apply category override
const finalQuestions = valid.map((q, idx) => ({
  ...q,
  id: idx + 1,
  ...(categoryOverride ? { category: categoryOverride } : {}),
}));

// ── Batch & write ───────────────────────────────────────────────────────────

fs.mkdirSync(outDir, { recursive: true });
const size = batchSize > 0 ? batchSize : finalQuestions.length;
const totalBatches = Math.ceil(finalQuestions.length / size);

for (let b = 0; b < totalBatches; b++) {
  const questions = finalQuestions.slice(b * size, (b + 1) * size);
  const outFile = totalBatches === 1
    ? path.join(outDir, `${prefix}.json`)
    : path.join(outDir, `${prefix}-batch-${b + 1}.json`);
  fs.writeFileSync(outFile, JSON.stringify(questions, null, 2));
  console.log(`Wrote ${questions.length} questions → ${path.relative(process.cwd(), outFile)}`);
}

// ── Summary ─────────────────────────────────────────────────────────────────

const byType = {};
const byDifficulty = {};
for (const q of finalQuestions) {
  byType[q.type] = (byType[q.type] || 0) + 1;
  byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
}
console.log(`\n✅ ${finalQuestions.length}/${rawQuestions.length} questions → ${totalBatches} file(s) in ${path.relative(process.cwd(), outDir) || '.'}/`);
console.log('Type distribution:', byType);
console.log('Difficulty distribution:', byDifficulty);
