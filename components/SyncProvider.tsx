'use client';

import { useEffect, useRef, createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { SyncStatus } from '@/lib/syncManager';
import { ActiveSessionData } from '@/lib/types';
import { useExamStore } from '@/lib/store';
import {
  pushActiveSessionToCloud,
  clearActiveSessionFromCloud,
} from '@/lib/syncManager';

interface SyncContextValue {
  syncStatus: SyncStatus;
  performSync: (options?: { force?: boolean }) => Promise<void>;
  cloudActiveSession: ActiveSessionData | null;
  clearCloudActiveSession: () => void;
}

const SyncContext = createContext<SyncContextValue>({
  syncStatus: 'idle',
  performSync: async () => {},
  cloudActiveSession: null,
  clearCloudActiveSession: () => {},
});

export function useSyncContext() {
  return useContext(SyncContext);
}

export default function SyncProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const { syncStatus, performSync, cloudActiveSession, setCloudActiveSession } = useCloudSync();

  const clearCloudActiveSession = () => {
    setCloudActiveSession(null);
    clearActiveSessionFromCloud();
  };
  const autoSaveInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-sync when user signs in
  useEffect(() => {
    if (session?.user?.id) {
      performSync();
    }
  }, [session?.user?.id, performSync]);

  // Auto-save active session to cloud every 60 seconds
  useEffect(() => {
    if (!session?.user?.id) return;

    const saveActiveSession = () => {
      const state = useExamStore.getState();
      if (state.isExamStarted && !state.isExamCompleted && state.questions.length > 0) {
        pushActiveSessionToCloud({
          questions: state.questions,
          userAnswers: Array.from(state.userAnswers.entries()),
          currentQuestionIndex: state.currentQuestionIndex,
          currentQuestionSetId: state.currentQuestionSetId,
          examStartTime: state.examStartTime,
          examDuration: state.examDuration,
          mode: state.mode,
          useTimer: state.useTimer,
          learnWithAI: state.learnWithAI,
          reviewAnswers: state.reviewAnswers,
          cognitiveCompanion: state.cognitiveCompanion,
          socraticMode: state.socraticMode,
          sessionMetrics: state.sessionMetrics,
          questionViewTimes: Array.from(state.questionViewTimes.entries()),
          selectionChanges: Array.from(state.selectionChanges.entries()),
          savedAt: Date.now(),
        });
      }
    };

    autoSaveInterval.current = setInterval(saveActiveSession, 60_000);
    return () => {
      if (autoSaveInterval.current) clearInterval(autoSaveInterval.current);
    };
  }, [session?.user?.id]);

  // Clear cloud session when exam completes or resets
  useEffect(() => {
    if (!session?.user?.id) return;

    const unsub = useExamStore.subscribe((state, prev) => {
      // Exam just completed or reset
      if (
        (state.isExamCompleted && !prev.isExamCompleted) ||
        (!state.isExamStarted && prev.isExamStarted)
      ) {
        clearActiveSessionFromCloud();
      }
    });

    return unsub;
  }, [session?.user?.id]);

  return (
    <SyncContext.Provider value={{ syncStatus, performSync, cloudActiveSession, clearCloudActiveSession }}>
      {children}
    </SyncContext.Provider>
  );
}
