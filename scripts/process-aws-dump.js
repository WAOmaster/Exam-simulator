#!/usr/bin/env node
/**
 * Process AWS AIF-C01 Google dump into clean QuestionSet batches
 * Output: data/aws-aif-c01-batch-{1..4}.json
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INPUT  = path.join(__dirname, '../data/AWS_AIF-C01_google_20260312_224641.json');
const OUTDIR = path.join(__dirname, '../data');
const BATCH_SIZE = 66;

const raw = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));

// ── Cleaners ────────────────────────────────────────────────────────────────

function cleanQuestionText(text) {
  // 1. Remove "Hide Answer" section and everything after it
  text = text.replace(/\nHide Answer[\s\S]*$/i, '');

  // 2. Remove embedded option lines  e.g.  "\nA. Some text\nB. ..."
  //    These always appear as a block of lines starting with a capital letter + dot + space
  text = text.replace(/\n[A-E]\. [^\n]*/g, '');

  // 3. Collapse multiple blank lines into one
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

function cleanOptionText(text) {
  // Remove " Most Voted" badge (with or without leading space)
  return text.replace(/\s*Most Voted\s*/gi, '').trim();
}

function detectType(options) {
  if (options.length === 2) {
    const texts = options.map(o => o.text.toLowerCase());
    if (texts.some(t => t === 'true' || t === 'false')) return 'true-false';
  }
  return 'multiple-choice';
}

// ── Filter & transform ───────────────────────────────────────────────────────

const valid = raw
  .filter(q => q.options && q.options.length > 0 && q.correctAnswer)
  .map((q, idx) => ({
    id: idx + 1,
    question: cleanQuestionText(q.question),
    options: q.options.map(o => ({
      id: o.id,
      text: cleanOptionText(o.text),
    })),
    correctAnswer: q.correctAnswer,   // keeps "A.", "A.,E." etc.
    explanation: '',
    category: q.category || 'AWS - AIF-C01',
    difficulty: 'medium',
    type: detectType(q.options),
  }));

console.log(`Valid questions: ${valid.length} (skipped ${raw.length - valid.length} HOTSPOT/empty)`);

// ── Batch into QuestionSets ─────────────────────────────────────────────────

const now = new Date().toISOString();
const totalBatches = Math.ceil(valid.length / BATCH_SIZE);

for (let b = 0; b < totalBatches; b++) {
  const start = b * BATCH_SIZE;
  const questions = valid.slice(start, start + BATCH_SIZE);

  // Output as a plain questions array — compatible with the app's
  // "Upload File" tab which parses JSON arrays directly and skips AI enhancement.
  // Title / subject are set in the Save dialog after upload.
  const outFile = path.join(OUTDIR, `aws-aif-c01-batch-${b + 1}.json`);
  fs.writeFileSync(outFile, JSON.stringify(questions, null, 2));
  console.log(`Wrote batch ${b + 1}: ${questions.length} questions → ${path.basename(outFile)}`);
}

console.log(`\nDone. ${totalBatches} batch files ready in data/`);
