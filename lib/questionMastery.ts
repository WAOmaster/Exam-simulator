/**
 * Question Mastery Tracking
 * Persists spaced repetition data to localStorage
 */

import {
  Card,
  ReviewLog,
  Rating,
  initializeCard,
  calculateNextInterval,
  getDueCards,
} from './fsrs';

const STORAGE_KEY = 'exam-question-mastery';
const REVIEW_LOG_KEY = 'exam-review-logs';

export interface QuestionMastery {
  questionId: number;
  questionSetId: string;
  cardState: Card;
  created: number;
  lastModified: number;
}

// ============ Mastery Data Storage ============

export function saveMastery(mastery: QuestionMastery): void {
  if (typeof window === 'undefined') return;

  try {
    const allMastery = getAllMastery();
    allMastery.set(mastery.questionId, mastery);
    saveMasteryMap(allMastery);
  } catch (error) {
    console.error('Failed to save mastery:', error);
  }
}

export function getMastery(questionId: number): QuestionMastery | null {
  if (typeof window === 'undefined') return null;

  try {
    const allMastery = getAllMastery();
    return allMastery.get(questionId) || null;
  } catch (error) {
    console.error('Failed to get mastery:', error);
    return null;
  }
}

export function getAllMastery(): Map<number, QuestionMastery> {
  if (typeof window === 'undefined') return new Map();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return new Map();

    const arr: [number, QuestionMastery][] = JSON.parse(stored);
    return new Map(arr);
  } catch (error) {
    console.error('Failed to get all mastery:', error);
    return new Map();
  }
}

function saveMasteryMap(mastery: Map<number, QuestionMastery>): void {
  if (typeof window === 'undefined') return;

  try {
    const arr = Array.from(mastery.entries());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch (error) {
    console.error('Failed to save mastery map:', error);
  }
}

// ============ Review Log Storage ============

export function saveReviewLog(log: ReviewLog): void {
  if (typeof window === 'undefined') return;

  try {
    const logs = getReviewLogs();
    logs.push(log);

    // Keep only last 1000 logs
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }

    localStorage.setItem(REVIEW_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Failed to save review log:', error);
  }
}

export function getReviewLogs(): ReviewLog[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(REVIEW_LOG_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get review logs:', error);
    return [];
  }
}

// ============ Review Queue ============

export function getReviewQueue(limit: number = 20): QuestionMastery[] {
  const allMastery = getAllMastery();

  // Get card states map
  const cardMap = new Map<number, Card>();
  allMastery.forEach((mastery) => {
    cardMap.set(mastery.questionId, mastery.cardState);
  });

  // Get due card IDs
  const dueIds = getDueCards(cardMap, limit);

  // Return mastery objects for due cards
  return dueIds
    .map((id) => allMastery.get(id))
    .filter((m): m is QuestionMastery => m !== undefined);
}

// ============ Record Review ============

export function recordReview(
  questionId: number,
  questionSetId: string,
  rating: Rating,
  responseTimeMs: number
): QuestionMastery {
  const now = Date.now();

  // Get existing mastery or create new
  let mastery = getMastery(questionId);
  let card: Card;

  if (mastery) {
    card = mastery.cardState;
  } else {
    card = initializeCard();
    mastery = {
      questionId,
      questionSetId,
      cardState: card,
      created: now,
      lastModified: now,
    };
  }

  // Calculate next interval
  const { card: nextCard, interval } = calculateNextInterval(card, rating);

  // Save review log
  const log: ReviewLog = {
    questionId,
    rating,
    timestamp: now,
    responseTimeMs,
    scheduledDays: interval,
    elapsedDays: card.elapsedDays,
    state: card.state,
  };
  saveReviewLog(log);

  // Update mastery
  mastery.cardState = nextCard;
  mastery.lastModified = now;
  saveMastery(mastery);

  return mastery;
}

// ============ Initialize Question ============

export function initializeQuestionMastery(
  questionId: number,
  questionSetId: string
): QuestionMastery {
  const existing = getMastery(questionId);
  if (existing) return existing;

  const now = Date.now();
  const mastery: QuestionMastery = {
    questionId,
    questionSetId,
    cardState: initializeCard(),
    created: now,
    lastModified: now,
  };

  saveMastery(mastery);
  return mastery;
}

// ============ Statistics ============

export function getMasteryStats(): {
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  dueToday: number;
  dueTomorrow: number;
  dueThisWeek: number;
} {
  const allMastery = getAllMastery();
  const now = Date.now();
  const tomorrow = now + 24 * 60 * 60 * 1000;
  const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

  let newCards = 0;
  let learningCards = 0;
  let reviewCards = 0;
  let dueToday = 0;
  let dueTomorrow = 0;
  let dueThisWeek = 0;

  allMastery.forEach((mastery) => {
    const card = mastery.cardState;

    switch (card.state) {
      case 'new':
        newCards++;
        dueToday++;
        break;
      case 'learning':
      case 'relearning':
        learningCards++;
        dueToday++;
        break;
      case 'review':
        reviewCards++;
        const dueDate = card.lastReview + card.scheduledDays * 24 * 60 * 60 * 1000;
        if (dueDate <= now) dueToday++;
        else if (dueDate <= tomorrow) dueTomorrow++;
        else if (dueDate <= nextWeek) dueThisWeek++;
        break;
    }
  });

  return {
    totalCards: allMastery.size,
    newCards,
    learningCards,
    reviewCards,
    dueToday,
    dueTomorrow,
    dueThisWeek,
  };
}

// ============ Clear Data ============

export function clearMasteryData(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REVIEW_LOG_KEY);
  } catch (error) {
    console.error('Failed to clear mastery data:', error);
  }
}
