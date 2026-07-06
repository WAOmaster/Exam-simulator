#!/usr/bin/env node
// Deploy-and-verify: kills the commit → push → wait → curl-the-endpoint loop.
//
// Modes:
//   Watch (default)  Find the Vercel deployment for the current git commit
//                    (Git-integration deploys), wait until READY, smoke-test it.
//   --deploy         Run `npx vercel deploy` directly and smoke-test the
//                    returned URL — iterate on env/config WITHOUT empty commits.
//   --url <url>      Skip discovery and just smoke-test an existing deployment.
//
// Usage:
//   npm run deploy:verify                    # watch latest deploy for HEAD
//   npm run deploy:now                      # CLI deploy + verify
//   node scripts/deploy-verify.mjs --url https://my-app.vercel.app --check /api/sync
//
// Options:
//   --project <name>   Vercel project name   (default: $VERCEL_PROJECT or package.json name)
//   --check <path>     extra endpoint to smoke-test, repeatable
//   --timeout <sec>    max wait for deployment to go READY (default: 600)
//   --prod             with --deploy, deploy to production
//
// Env: VERCEL_TOKEN (required), VERCEL_TEAM_ID (optional)

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.vercel.com';
const args = process.argv.slice(2);
function flag(name) { return args.includes(`--${name}`); }
function opt(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
}
function optAll(name) {
  const out = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === `--${name}` && args[i + 1] !== undefined) out.push(args[i + 1]);
  }
  return out;
}

const token = process.env.VERCEL_TOKEN;
const teamId = process.env.VERCEL_TEAM_ID;
const timeoutMs = parseInt(opt('timeout', '600'), 10) * 1000;
const extraChecks = optAll('check');
const directUrl = opt('url', null);

function pkgName() {
  try {
    return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf-8')).name;
  } catch { return null; }
}
const project = opt('project', process.env.VERCEL_PROJECT || pkgName());

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

async function vercelApi(pathname, params = {}) {
  const url = new URL(API + pathname);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  if (teamId) url.searchParams.set('teamId', teamId);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`Vercel API ${pathname} → ${res.status}: ${body?.error?.message || JSON.stringify(body).slice(0, 200)}`);
  }
  return body;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Find or create the deployment ───────────────────────────────────────────

async function findDeploymentForHead() {
  const sha = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  console.log(`Watching for deployment of commit ${sha.slice(0, 7)} (project: ${project})...`);
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const { deployments = [] } = await vercelApi('/v6/deployments', { app: project, limit: '20' });
    const match = deployments.find(d => d.meta?.githubCommitSha === sha);
    if (match) return match;
    console.log('  no deployment for this commit yet, retrying in 10s...');
    await sleep(10_000);
  }
  fail(`No deployment found for commit ${sha.slice(0, 7)} within ${timeoutMs / 1000}s. Did the push trigger a build?`);
}

async function waitUntilReady(deployment) {
  const deadline = Date.now() + timeoutMs;
  let state = deployment.readyState || deployment.state;
  let current = deployment;

  while (Date.now() < deadline) {
    if (state === 'READY') return current;
    if (state === 'ERROR' || state === 'CANCELED') {
      await printBuildLogs(current.uid || current.id);
      fail(`Deployment ${current.url} ended in state ${state}`);
    }
    console.log(`  state: ${state} — waiting 10s...`);
    await sleep(10_000);
    current = await vercelApi(`/v13/deployments/${current.uid || current.id}`);
    state = current.readyState || current.state;
  }
  fail(`Deployment did not become READY within ${timeoutMs / 1000}s (last state: ${state})`);
}

async function printBuildLogs(deploymentId) {
  try {
    const events = await vercelApi(`/v3/deployments/${deploymentId}/events`, { limit: '40' });
    console.error('\n--- last build log lines ---');
    for (const e of (Array.isArray(events) ? events : []).slice(-40)) {
      const text = e?.payload?.text || e?.text;
      if (text) console.error(text);
    }
    console.error('--- end build log ---');
  } catch {
    console.error('(could not fetch build logs)');
  }
}

function cliDeploy() {
  if (!token) fail('VERCEL_TOKEN is required for --deploy');
  const prodFlag = flag('prod') ? ' --prod' : '';
  console.log(`Deploying via Vercel CLI${prodFlag ? ' (production)' : ' (preview)'}...`);
  const out = execSync(`npx vercel deploy --yes${prodFlag} --token ${token}${teamId ? ` --scope ${teamId}` : ''}`, {
    encoding: 'utf-8',
    stdio: ['inherit', 'pipe', 'inherit'],
  });
  const url = out.trim().split('\n').reverse().find(l => l.startsWith('https://'));
  if (!url) fail('Could not parse deployment URL from vercel CLI output');
  return url;
}

// ── Smoke tests ─────────────────────────────────────────────────────────────

async function smokeTest(baseUrl) {
  const checks = ['/', '/api/blob-test', ...extraChecks];
  let failed = 0;

  console.log(`\nSmoke-testing ${baseUrl}`);
  for (const p of checks) {
    const url = baseUrl.replace(/\/$/, '') + p;
    try {
      const res = await fetch(url, { redirect: 'follow' });
      const bodyText = await res.text();
      let problem = null;
      if (!res.ok) {
        problem = `HTTP ${res.status}`;
      } else if (p.startsWith('/api/')) {
        try {
          const json = JSON.parse(bodyText);
          if (json && typeof json === 'object' && json.error) problem = `error field: ${JSON.stringify(json.error).slice(0, 120)}`;
        } catch { /* non-JSON API response is fine (some routes return text) */ }
      }
      if (problem) {
        failed++;
        console.log(`  ❌ ${p} — ${problem}`);
        console.log(`     ${bodyText.slice(0, 300).replace(/\n/g, ' ')}`);
      } else {
        console.log(`  ✅ ${p} — ${res.status}`);
      }
    } catch (err) {
      failed++;
      console.log(`  ❌ ${p} — ${err.message}`);
    }
  }
  return failed;
}

// ── Main ────────────────────────────────────────────────────────────────────

let baseUrl;
if (directUrl) {
  baseUrl = directUrl.startsWith('http') ? directUrl : `https://${directUrl}`;
} else if (flag('deploy')) {
  baseUrl = cliDeploy();
  console.log(`Deployed: ${baseUrl}`);
} else {
  if (!token) fail('VERCEL_TOKEN env var is required (create one at https://vercel.com/account/tokens)');
  if (!project) fail('Could not determine project name — pass --project or set VERCEL_PROJECT');
  const deployment = await findDeploymentForHead();
  console.log(`Found deployment: https://${deployment.url} (state: ${deployment.readyState || deployment.state})`);
  const ready = await waitUntilReady(deployment);
  baseUrl = `https://${ready.url}`;
}

const failures = await smokeTest(baseUrl);
if (failures > 0) fail(`${failures} smoke check(s) failed on ${baseUrl}`);
console.log(`\n✅ Deployment verified: ${baseUrl}`);
