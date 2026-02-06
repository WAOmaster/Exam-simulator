// Session history persistence for Study Coach

const STORAGE_KEY = 'exam-session-history';
const MAX_SESSIONS = 50;

export interface SessionRecord {
  id: string;
  timestamp: number;
  subject: string;
  questionSetId: string;
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  duration: number; // in milliseconds
  categoryPerformance: Record<string, { correct: number; total: number }>;
  averageResponseTime: number;
  streaks: {
    max: number;
    final: number;
  };
}

export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveSessionRecord(record: SessionRecord): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getSessionHistory();

    // Add new record at the beginning
    history.unshift(record);

    // Keep only the most recent sessions
    if (history.length > MAX_SESSIONS) {
      history.splice(MAX_SESSIONS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save session record:', error);
  }
}

export function getSessionHistory(): SessionRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get session history:', error);
    return [];
  }
}

export function clearSessionHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session history:', error);
  }
}

export function getWeakCategories(minSessions = 2): { category: string; accuracy: number; total: number }[] {
  const history = getSessionHistory();

  // Aggregate performance across all sessions
  const categoryStats: Record<string, { correct: number; total: number }> = {};

  history.forEach((session) => {
    Object.entries(session.categoryPerformance).forEach(([category, stats]) => {
      if (!categoryStats[category]) {
        categoryStats[category] = { correct: 0, total: 0 };
      }
      categoryStats[category].correct += stats.correct;
      categoryStats[category].total += stats.total;
    });
  });

  // Calculate accuracy and filter weak categories (< 70%)
  const weakCategories = Object.entries(categoryStats)
    .filter(([_, stats]) => stats.total >= minSessions)
    .map(([category, stats]) => ({
      category,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
    }))
    .filter((cat) => cat.accuracy < 70)
    .sort((a, b) => a.accuracy - b.accuracy);

  return weakCategories;
}

export function getStrongCategories(minSessions = 2): { category: string; accuracy: number; total: number }[] {
  const history = getSessionHistory();

  const categoryStats: Record<string, { correct: number; total: number }> = {};

  history.forEach((session) => {
    Object.entries(session.categoryPerformance).forEach(([category, stats]) => {
      if (!categoryStats[category]) {
        categoryStats[category] = { correct: 0, total: 0 };
      }
      categoryStats[category].correct += stats.correct;
      categoryStats[category].total += stats.total;
    });
  });

  const strongCategories = Object.entries(categoryStats)
    .filter(([_, stats]) => stats.total >= minSessions)
    .map(([category, stats]) => ({
      category,
      accuracy: Math.round((stats.correct / stats.total) * 100),
      total: stats.total,
    }))
    .filter((cat) => cat.accuracy >= 80)
    .sort((a, b) => b.accuracy - a.accuracy);

  return strongCategories;
}

export function getOverallStats(): {
  totalSessions: number;
  averageScore: number;
  totalQuestions: number;
  averageResponseTime: number;
  bestStreak: number;
} {
  const history = getSessionHistory();

  if (history.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      totalQuestions: 0,
      averageResponseTime: 0,
      bestStreak: 0,
    };
  }

  let totalScore = 0;
  let totalQuestions = 0;
  let totalResponseTime = 0;
  let bestStreak = 0;

  history.forEach((session) => {
    totalScore += session.score.percentage;
    totalQuestions += session.score.total;
    totalResponseTime += session.averageResponseTime;
    bestStreak = Math.max(bestStreak, session.streaks.max);
  });

  return {
    totalSessions: history.length,
    averageScore: Math.round(totalScore / history.length),
    totalQuestions,
    averageResponseTime: Math.round(totalResponseTime / history.length),
    bestStreak,
  };
}

export function getRecentTrend(numSessions = 5): 'improving' | 'declining' | 'stable' {
  const history = getSessionHistory().slice(0, numSessions);

  if (history.length < 2) return 'stable';

  const recentAvg = history.slice(0, Math.floor(history.length / 2)).reduce((sum, s) => sum + s.score.percentage, 0) / Math.floor(history.length / 2);
  const olderAvg = history.slice(Math.floor(history.length / 2)).reduce((sum, s) => sum + s.score.percentage, 0) / (history.length - Math.floor(history.length / 2));

  const diff = recentAvg - olderAvg;

  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}
