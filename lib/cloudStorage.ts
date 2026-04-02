import { put, list, del } from '@vercel/blob';
import { QuestionSet } from './types';

// Blob path pattern: users/{userId}/question-sets/{setId}.json

const BLOB_PREFIX = 'users';

// ── Question Sets ──────────────────────────────────────────────────────────

export async function saveQuestionSetToCloud(
  userId: string,
  questionSet: QuestionSet
): Promise<void> {
  const path = `${BLOB_PREFIX}/${userId}/question-sets/${questionSet.id}.json`;
  await put(path, JSON.stringify(questionSet), {
    access: 'public',
    addRandomSuffix: false,
  });
}

export async function getAllQuestionSetsFromCloud(
  userId: string
): Promise<QuestionSet[]> {
  const prefix = `${BLOB_PREFIX}/${userId}/question-sets/`;
  const sets: QuestionSet[] = [];

  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor });
    for (const blob of result.blobs) {
      try {
        const response = await fetch(blob.url);
        const data = await response.json();
        sets.push(data as QuestionSet);
      } catch (err) {
        console.error(`Failed to fetch blob ${blob.pathname}:`, err);
      }
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);

  return sets;
}

export async function deleteQuestionSetFromCloud(
  userId: string,
  setId: string
): Promise<void> {
  const prefix = `${BLOB_PREFIX}/${userId}/question-sets/${setId}.json`;
  const { blobs } = await list({ prefix });
  for (const blob of blobs) {
    await del(blob.url);
  }
}

// ── Session History ────────────────────────────────────────────────────────

export async function saveSessionHistoryToCloud(
  userId: string,
  history: unknown[]
): Promise<void> {
  const path = `${BLOB_PREFIX}/${userId}/session-history.json`;
  await put(path, JSON.stringify(history), {
    access: 'public',
    addRandomSuffix: false,
  });
}

export async function getSessionHistoryFromCloud(
  userId: string
): Promise<unknown[]> {
  const prefix = `${BLOB_PREFIX}/${userId}/session-history.json`;
  const { blobs } = await list({ prefix });
  if (blobs.length === 0) return [];

  try {
    const response = await fetch(blobs[0].url);
    return await response.json();
  } catch {
    return [];
  }
}
