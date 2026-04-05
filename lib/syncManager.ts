'use client';

import { QuestionSet, ActiveSessionData } from './types';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

// ── Push Operations (fire-and-forget with error capture) ──────────────────

export async function pushQuestionSetToCloud(
  questionSet: QuestionSet
): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'question-set', data: questionSet }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function deleteQuestionSetFromCloudClient(
  setId: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/sync?setId=${encodeURIComponent(setId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pushSessionHistoryToCloud(
  history: unknown[]
): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'session-history', data: history }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Pull Operations ───────────────────────────────────────────────────────

export async function pullQuestionSetsFromCloud(): Promise<QuestionSet[] | null> {
  try {
    const res = await fetch('/api/sync?type=question-sets');
    if (!res.ok) return null;
    const data = await res.json();
    return data.questionSets || [];
  } catch {
    return null;
  }
}

export async function pullSessionHistoryFromCloud(): Promise<unknown[] | null> {
  try {
    const res = await fetch('/api/sync?type=session-history');
    if (!res.ok) return null;
    const data = await res.json();
    return data.sessionHistory || [];
  } catch {
    return null;
  }
}

// ── Active Session Operations ─────────────────────────────────────────────

export async function pushActiveSessionToCloud(
  sessionData: ActiveSessionData
): Promise<boolean> {
  try {
    const res = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'active-session', data: sessionData }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullActiveSessionFromCloud(): Promise<ActiveSessionData | null> {
  try {
    const res = await fetch('/api/sync?type=active-session');
    if (!res.ok) return null;
    const data = await res.json();
    return data.activeSession || null;
  } catch {
    return null;
  }
}

export async function clearActiveSessionFromCloud(): Promise<boolean> {
  try {
    const res = await fetch('/api/sync?type=active-session', {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Merge Logic ───────────────────────────────────────────────────────────

export function mergeQuestionSets(
  local: QuestionSet[],
  cloud: QuestionSet[]
): QuestionSet[] {
  const merged = new Map<string, QuestionSet>();

  // Add all cloud sets first
  for (const set of cloud) {
    merged.set(set.id, set);
  }

  // Merge local sets: keep whichever is newer
  for (const set of local) {
    const existing = merged.get(set.id);
    if (!existing) {
      merged.set(set.id, set);
    } else {
      const localDate = new Date(set.updatedAt).getTime();
      const cloudDate = new Date(existing.updatedAt).getTime();
      if (localDate > cloudDate) {
        merged.set(set.id, set);
      }
    }
  }

  return Array.from(merged.values());
}
