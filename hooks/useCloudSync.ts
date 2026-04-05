'use client';

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useExamStore } from '@/lib/store';
import {
  SyncStatus,
  pushQuestionSetToCloud,
  pullQuestionSetsFromCloud,
  pullSessionHistoryFromCloud,
  pushSessionHistoryToCloud,
  pullActiveSessionFromCloud,
  mergeQuestionSets,
} from '@/lib/syncManager';
import { ActiveSessionData } from '@/lib/types';

let syncInProgress = false;
let lastSyncTimestamp = 0;

export function useCloudSync() {
  const { data: session } = useSession();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [cloudActiveSession, setCloudActiveSession] = useState<ActiveSessionData | null>(null);

  const performSync = useCallback(async (options?: { force?: boolean }) => {
    if (!session?.user?.id) return;

    const now = Date.now();
    if (!options?.force && syncInProgress) return;
    if (!options?.force && now - lastSyncTimestamp < 30_000) {
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 5000);
      return;
    }

    syncInProgress = true;
    setSyncStatus('syncing');

    try {
      const store = useExamStore.getState();
      const localSets = store.availableQuestionSets || [];

      // Push local sets to cloud
      for (const set of localSets) {
        await pushQuestionSetToCloud(set);
      }

      // Push session history
      const sessionHistory = JSON.parse(
        localStorage.getItem('exam-session-history') || '[]'
      );
      if (sessionHistory.length > 0) {
        await pushSessionHistoryToCloud(sessionHistory);
      }

      // Pull cloud sets
      const cloudSets = await pullQuestionSetsFromCloud();

      // Merge using proper merge function and batch-update store
      if (cloudSets && cloudSets.length > 0) {
        const currentLocal = useExamStore.getState().availableQuestionSets || [];
        const merged = mergeQuestionSets(currentLocal, cloudSets);
        useExamStore.getState().loadQuestionSets(merged);
      }

      // Pull session history for new devices
      const cloudHistory = await pullSessionHistoryFromCloud();
      if (cloudHistory && cloudHistory.length > 0) {
        const localHistory = JSON.parse(
          localStorage.getItem('exam-session-history') || '[]'
        );
        if (localHistory.length === 0) {
          localStorage.setItem(
            'exam-session-history',
            JSON.stringify(cloudHistory)
          );
        }
      }

      // Pull active session for cross-device resume
      const store2 = useExamStore.getState();
      if (!store2.isExamStarted || store2.isExamCompleted) {
        const cloudSession = await pullActiveSessionFromCloud();
        if (cloudSession) {
          setCloudActiveSession(cloudSession);
        }
      }

      lastSyncTimestamp = Date.now();
      setSyncStatus('synced');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } catch {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    } finally {
      syncInProgress = false;
    }
  }, [session?.user?.id]);

  return { syncStatus, setSyncStatus, performSync, cloudActiveSession, setCloudActiveSession };
}
