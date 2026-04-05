import { put, list, del, get } from '@vercel/blob';
import { QuestionSet, ActiveSessionData } from './types';

// Blob path pattern: users/{userId}/question-sets/{setId}.json

const BLOB_PREFIX = 'users';

function getBlobToken(): string | undefined {
  return process.env.BLOB_READ_WRITE_TOKEN;
}

async function readBlobJson<T>(blobUrl: string): Promise<T> {
  const token = getBlobToken();
  const result = await get(blobUrl, { access: 'private', token });
  if (!result) throw new Error(`Blob not found: ${blobUrl}`);
  const text = await new Response(result.stream).text();
  return JSON.parse(text) as T;
}

// ── Question Sets ──────────────────────────────────────────────────────────

export async function saveQuestionSetToCloud(
  userId: string,
  questionSet: QuestionSet
): Promise<void> {
  const path = `${BLOB_PREFIX}/${userId}/question-sets/${questionSet.id}.json`;
  await put(path, JSON.stringify(questionSet), {
    access: 'private',
    addRandomSuffix: false,
    token: getBlobToken(),
  });
}

export async function getAllQuestionSetsFromCloud(
  userId: string
): Promise<QuestionSet[]> {
  const prefix = `${BLOB_PREFIX}/${userId}/question-sets/`;
  const sets: QuestionSet[] = [];
  const token = getBlobToken();

  let cursor: string | undefined;
  do {
    const result = await list({ prefix, cursor, token });
    for (const blob of result.blobs) {
      try {
        const data = await readBlobJson<QuestionSet>(blob.url);
        sets.push(data);
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
  const { blobs } = await list({ prefix, token: getBlobToken() });
  for (const blob of blobs) {
    await del(blob.url, { token: getBlobToken() });
  }
}

// ── Session History ────────────────────────────────────────────────────────

export async function saveSessionHistoryToCloud(
  userId: string,
  history: unknown[]
): Promise<void> {
  const path = `${BLOB_PREFIX}/${userId}/session-history.json`;
  await put(path, JSON.stringify(history), {
    access: 'private',
    addRandomSuffix: false,
    token: getBlobToken(),
  });
}

// ── Active Session ────────────────────────────────────────────────────────

export async function saveActiveSessionToCloud(
  userId: string,
  sessionData: ActiveSessionData
): Promise<void> {
  const path = `${BLOB_PREFIX}/${userId}/active-session.json`;
  await put(path, JSON.stringify(sessionData), {
    access: 'private',
    addRandomSuffix: false,
    token: getBlobToken(),
  });
}

export async function getActiveSessionFromCloud(
  userId: string
): Promise<ActiveSessionData | null> {
  const prefix = `${BLOB_PREFIX}/${userId}/active-session.json`;
  const token = getBlobToken();
  const { blobs } = await list({ prefix, token });
  if (blobs.length === 0) return null;

  try {
    const data = await readBlobJson<ActiveSessionData>(blobs[0].url);
    // Ignore stale sessions older than 7 days
    if (data.savedAt && Date.now() - data.savedAt > 7 * 24 * 60 * 60 * 1000) {
      await deleteActiveSessionFromCloud(userId);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function deleteActiveSessionFromCloud(
  userId: string
): Promise<void> {
  const prefix = `${BLOB_PREFIX}/${userId}/active-session.json`;
  const { blobs } = await list({ prefix, token: getBlobToken() });
  for (const blob of blobs) {
    await del(blob.url, { token: getBlobToken() });
  }
}

export async function getSessionHistoryFromCloud(
  userId: string
): Promise<unknown[]> {
  const prefix = `${BLOB_PREFIX}/${userId}/session-history.json`;
  const token = getBlobToken();
  const { blobs } = await list({ prefix, token });
  if (blobs.length === 0) return [];

  try {
    return await readBlobJson<unknown[]>(blobs[0].url);
  } catch {
    return [];
  }
}
