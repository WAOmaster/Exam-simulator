#!/usr/bin/env npx tsx
// Validate a question JSON file with the SAME validator the app importer uses
// (lib/validateQuestions.ts) — no more hand-synced replica.
//
// Usage:
//   npm run questions:verify -- <file.json> [--strict]
//   npx tsx scripts/verify-import.mjs <file.json> [--strict]
//
// --strict  exit non-zero if ANY question is dropped (used in CI)

import fs from 'node:fs';
import { validateQuestions } from '../lib/validateQuestions.ts';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const file = args.find(a => !a.startsWith('--'));

if (!file) {
  console.error('Usage: npx tsx scripts/verify-import.mjs <file.json> [--strict]');
  process.exit(2);
}

const raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
// Accept both a bare array and the { questions: [...] } wrapper, like the importer
const questionsArray = Array.isArray(raw) ? raw : raw.questions;
if (!Array.isArray(questionsArray)) {
  console.error('❌ JSON must be an array of questions or an object with a "questions" field');
  process.exit(1);
}

const { valid, errors } = validateQuestions(questionsArray);

console.log(`Input:    ${questionsArray.length} questions`);
console.log(`Imported: ${valid.length} questions (${errors.length} dropped)`);
if (errors.length > 0) {
  console.log('Errors:');
  for (const err of errors) console.log(`  - ${err}`);
}

const byType = {};
for (const q of valid) byType[q.type] = (byType[q.type] || 0) + 1;
console.log('Type distribution:', byType);

const hotspot = valid.find(q => q.type === 'hotspot');
if (hotspot) {
  console.log('\nHOTSPOT sample:');
  console.log('  correctAnswer:', JSON.stringify(hotspot.correctAnswer));
  console.log('  options:', hotspot.options.length);
  console.log('  images:', hotspot.images?.length ?? 0);
}

const multi = valid.find(q => typeof q.correctAnswer === 'string' && q.correctAnswer.includes(','));
if (multi) {
  console.log('\nMulti-answer sample:');
  console.log('  correctAnswer:', JSON.stringify(multi.correctAnswer));
}

if (valid.length === 0) {
  console.error('\n❌ No valid questions found');
  process.exit(1);
}
if (strict && errors.length > 0) {
  console.error(`\n❌ --strict: ${errors.length} question(s) dropped`);
  process.exit(1);
}
console.log('\n✅ OK');
