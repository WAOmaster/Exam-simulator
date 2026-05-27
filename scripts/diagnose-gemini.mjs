import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Loads .env.local so this matches what the app reads in production.
dotenv.config({ path: '.env.local' });

const MODEL = process.argv[2] || 'gemini-2.5-flash';

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
}

async function main() {
  console.log('Gemini connectivity diagnostic');
  console.log('------------------------------');
  console.log('Model:', MODEL);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'missing') {
    fail('GEMINI_API_KEY is not set in .env.local (or is the literal "missing").');
    console.log('Add it to .env.local:  GEMINI_API_KEY=your_key_here');
    process.exit(1);
  }
  console.log('Key prefix:', apiKey.slice(0, 8) + '…  (len ' + apiKey.length + ')');

  const ai = new GoogleGenAI({ apiKey });

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: 'Reply with exactly: OK',
    });
    console.log('\n✅ Success. Model responded:');
    console.log('  ', (res.text || '').trim());
    console.log('\nThe key works and is billable. Set this same value as GEMINI_API_KEY in Vercel and redeploy.');
  } catch (err) {
    const msg = String(err?.message || err);
    const status = err?.status || err?.code;
    fail(`Request failed${status ? ` (status ${status})` : ''}: ${msg}`);

    if (/API_KEY_INVALID|API key not valid/i.test(msg)) {
      console.log('→ The key string itself is rejected. Re-copy it from GCP → APIs & Services → Credentials.');
    } else if (/SERVICE_DISABLED|has not been used|is disabled|PERMISSION_DENIED/i.test(msg)) {
      console.log('→ The "Generative Language API" is NOT enabled on the key\'s GCP project.');
      console.log('  Enable it: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com');
      console.log('  Make sure you select the NEW project (the one with credits) first.');
    } else if (/billing|FAILED_PRECONDITION|quota|RESOURCE_EXHAUSTED|prepay|free tier/i.test(msg)) {
      console.log('→ Looks like a billing/quota issue. Confirm the key\'s project is linked to the billing account that has your credits,');
      console.log('  and that Cloud Billing (not AI Studio prepaid) is the active payment path for that project.');
    } else if (/referer|referrer|API_KEY_HTTP_REFERRER_BLOCKED|requests-from-referer/i.test(msg)) {
      console.log('→ The key has an HTTP-referrer restriction. Server-side calls have no referrer.');
      console.log('  In the key\'s settings, set Application restrictions to "None" (or IP), not HTTP referrers.');
    } else if (/not found|NOT_FOUND|is not supported/i.test(msg)) {
      console.log(`→ Model "${MODEL}" may not be available on this project/region. Try: node scripts/diagnose-gemini.mjs gemini-1.5-flash`);
    }
    process.exit(1);
  }
}

main();
