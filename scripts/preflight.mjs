#!/usr/bin/env node
// Preflight: one command to verify local env + live API access before dev/deploy.
// Replaces the old test-gemini-api.js (which imported @google/generative-ai,
// a package no longer installed — the app uses @google/genai).
//
// Usage:
//   npm run preflight              # env + live Gemini + live Blob checks
//   npm run preflight -- --offline # env checks only (no network)

import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local' });
dotenv.config(); // fall back to .env for anything not in .env.local

const offline = process.argv.includes('--offline');
let failures = 0;

function pass(label, detail = '') {
  console.log(`  ✅ ${label}${detail ? ` — ${detail}` : ''}`);
}
function failCheck(label, detail = '') {
  failures++;
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
}

// ── Env vars ────────────────────────────────────────────────────────────────

console.log('Environment:');
if (fs.existsSync('.env.local')) pass('.env.local exists');
else failCheck('.env.local missing', 'create it with GEMINI_API_KEY etc. (see CLAUDE.md)');

const REQUIRED = [
  ['GEMINI_API_KEY', 'AI generation/explanations — https://makersuite.google.com/app/apikey'],
  ['BLOB_READ_WRITE_TOKEN', 'cloud sync via Vercel Blob'],
  ['AUTH_SECRET', 'NextAuth session encryption — `npx auth secret`'],
  ['AUTH_GOOGLE_ID', 'Google sign-in (OAuth client id)'],
  ['AUTH_GOOGLE_SECRET', 'Google sign-in (OAuth client secret)'],
];

for (const [key, why] of REQUIRED) {
  if (process.env[key]) pass(key, `set (${process.env[key].length} chars)`);
  else failCheck(`${key} missing`, why);
}

// ── Live checks ─────────────────────────────────────────────────────────────

if (offline) {
  console.log('\nSkipping live API checks (--offline)');
} else {
  console.log('\nLive checks:');

  if (process.env.GEMINI_API_KEY) {
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: 'Reply with exactly: OK',
      });
      const text = result.text ?? '';
      if (text.includes('OK')) pass('Gemini API', 'gemini-2.5-flash responded');
      else failCheck('Gemini API', `unexpected response: ${text.slice(0, 80)}`);
    } catch (err) {
      failCheck('Gemini API', err.message?.slice(0, 200));
    }
  } else {
    failCheck('Gemini API', 'skipped (no GEMINI_API_KEY)');
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { list } = await import('@vercel/blob');
      const { blobs } = await list({ limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
      pass('Vercel Blob', `token valid (${blobs.length > 0 ? 'store has data' : 'store empty'})`);
    } catch (err) {
      failCheck('Vercel Blob', err.message?.slice(0, 200));
    }
  } else {
    failCheck('Vercel Blob', 'skipped (no BLOB_READ_WRITE_TOKEN)');
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────

if (failures > 0) {
  console.log(`\n❌ Preflight failed: ${failures} check(s)`);
  process.exit(1);
}
console.log('\n✅ Preflight passed');
