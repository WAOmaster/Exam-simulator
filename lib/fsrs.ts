/**
 * FSRS (Free Spaced Repetition Scheduler) Algorithm
 *
 * Based on the FSRS-4.5 algorithm by Jarrett Ye
 * Paper: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * This implementation provides optimal spacing for review based on memory research.
 */

// Rating options: Again (forgot), Hard (difficult), Good (correct with effort), Easy (trivial)
export type Rating = 1 | 2 | 3 | 4;

export type CardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Card {
  stability: number; // How well learned (in days)
  difficulty: number; // 1-10 scale
  elapsedDays: number; // Days since last review
  scheduledDays: number; // Days until next review
  reps: number; // Total number of reviews
  lapses: number; // Times the card was forgotten
  state: CardState;
  lastReview: number; // Timestamp of last review
}

export interface ReviewLog {
  questionId: number;
  rating: Rating;
  timestamp: number;
  responseTimeMs: number;
  scheduledDays: number;
  elapsedDays: number;
  state: CardState;
}

// FSRS-4.5 default parameters
const FSRS_PARAMS = {
  w: [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
  requestRetention: 0.9, // Target retention rate (90%)
  maximumInterval: 36500, // Maximum interval in days (100 years)
};

/**
 * Initialize a new card for learning
 */
export function initializeCard(): Card {
  return {
    stability: 0,
    difficulty: 5, // Start at medium difficulty
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: 'new',
    lastReview: 0,
  };
}

/**
 * Calculate the initial stability based on rating
 */
function initStability(rating: Rating): number {
  const w = FSRS_PARAMS.w;
  return Math.max(0.1, w[rating - 1]);
}

/**
 * Calculate the initial difficulty based on rating
 */
function initDifficulty(rating: Rating): number {
  const w = FSRS_PARAMS.w;
  return Math.min(10, Math.max(1, w[4] - (rating - 3) * w[5]));
}

/**
 * Calculate the new difficulty after a review
 */
function nextDifficulty(d: number, rating: Rating): number {
  const w = FSRS_PARAMS.w;
  const nextD = d - w[6] * (rating - 3);
  return Math.min(10, Math.max(1, w[7] * initDifficulty(3) + (1 - w[7]) * nextD));
}

/**
 * Calculate the retrievability (probability of recall)
 */
export function getRetrievability(card: Card): number {
  if (card.state === 'new') return 0;
  if (card.stability <= 0) return 0;

  const elapsedDays = (Date.now() - card.lastReview) / (1000 * 60 * 60 * 24);
  const forgettingCurve = Math.pow(1 + elapsedDays / (9 * card.stability), -1);

  return Math.max(0, Math.min(1, forgettingCurve));
}

/**
 * Calculate the stability after a successful recall
 */
function nextRecallStability(d: number, s: number, r: number, rating: Rating): number {
  const w = FSRS_PARAMS.w;
  const hardPenalty = rating === 2 ? w[15] : 1;
  const easyBonus = rating === 4 ? w[16] : 1;

  return (
    s *
    (1 +
      Math.exp(w[8]) *
        (11 - d) *
        Math.pow(s, -w[9]) *
        (Math.exp((1 - r) * w[10]) - 1) *
        hardPenalty *
        easyBonus)
  );
}

/**
 * Calculate the stability after forgetting
 */
function nextForgetStability(d: number, s: number, r: number): number {
  const w = FSRS_PARAMS.w;
  return (
    w[11] *
    Math.pow(d, -w[12]) *
    (Math.pow(s + 1, w[13]) - 1) *
    Math.exp((1 - r) * w[14])
  );
}

/**
 * Calculate the next interval in days
 */
function nextInterval(s: number): number {
  const interval = (s / FSRS_PARAMS.w[0]) * (Math.pow(FSRS_PARAMS.requestRetention, 1 / -0.5) - 1);
  return Math.min(Math.max(1, Math.round(interval)), FSRS_PARAMS.maximumInterval);
}

/**
 * Calculate the next card state after a review
 */
export function calculateNextInterval(
  card: Card,
  rating: Rating
): { card: Card; interval: number } {
  const now = Date.now();
  const elapsedDays =
    card.lastReview > 0
      ? Math.max(0, (now - card.lastReview) / (1000 * 60 * 60 * 24))
      : 0;

  const newCard: Card = {
    ...card,
    elapsedDays,
    reps: card.reps + 1,
    lastReview: now,
  };

  let interval: number;

  if (card.state === 'new') {
    // First review
    newCard.difficulty = initDifficulty(rating);
    newCard.stability = initStability(rating);

    if (rating === 1) {
      // Again - stay in learning
      newCard.state = 'learning';
      interval = 0.00347; // ~5 minutes in days
    } else if (rating === 2) {
      // Hard - short interval
      newCard.state = 'learning';
      interval = 0.00694; // ~10 minutes
    } else {
      // Good or Easy - move to review
      newCard.state = 'review';
      interval = nextInterval(newCard.stability);
    }
  } else if (rating === 1) {
    // Forgot - lapse
    newCard.lapses++;
    newCard.state = 'relearning';
    const r = getRetrievability(card);
    newCard.stability = nextForgetStability(card.difficulty, card.stability, r);
    newCard.difficulty = nextDifficulty(card.difficulty, rating);
    interval = 0.00347; // ~5 minutes
  } else {
    // Remembered
    const r = getRetrievability(card);
    newCard.stability = nextRecallStability(card.difficulty, card.stability, r, rating);
    newCard.difficulty = nextDifficulty(card.difficulty, rating);

    if (card.state === 'learning' || card.state === 'relearning') {
      if (rating >= 3) {
        newCard.state = 'review';
        interval = nextInterval(newCard.stability);
      } else {
        interval = 0.00694; // ~10 minutes for hard in learning
      }
    } else {
      newCard.state = 'review';
      interval = nextInterval(newCard.stability);
    }
  }

  newCard.scheduledDays = interval;

  return { card: newCard, interval };
}

/**
 * Get cards due for review
 */
export function getDueCards(
  cards: Map<number, Card>,
  limit: number = 20
): number[] {
  const now = Date.now();
  const dueCards: { id: number; dueDate: number }[] = [];

  cards.forEach((card, id) => {
    if (card.state === 'new') {
      // New cards are always "due"
      dueCards.push({ id, dueDate: 0 });
    } else {
      const dueDate = card.lastReview + card.scheduledDays * 24 * 60 * 60 * 1000;
      if (dueDate <= now) {
        dueCards.push({ id, dueDate });
      }
    }
  });

  // Sort by due date (oldest first), then limit
  return dueCards
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, limit)
    .map((c) => c.id);
}

/**
 * Get review forecast for the next N days
 */
export function getReviewForecast(
  cards: Map<number, Card>,
  days: number = 7
): { date: string; count: number }[] {
  const forecast: Map<string, number> = new Map();
  const now = Date.now();

  // Initialize days
  for (let i = 0; i < days; i++) {
    const date = new Date(now + i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    forecast.set(dateStr, 0);
  }

  cards.forEach((card) => {
    if (card.state === 'new' || card.lastReview === 0) {
      // New cards due today
      const today = new Date(now).toISOString().split('T')[0];
      forecast.set(today, (forecast.get(today) || 0) + 1);
    } else {
      const dueDate = new Date(
        card.lastReview + card.scheduledDays * 24 * 60 * 60 * 1000
      );
      const dateStr = dueDate.toISOString().split('T')[0];
      if (forecast.has(dateStr)) {
        forecast.set(dateStr, (forecast.get(dateStr) || 0) + 1);
      }
    }
  });

  return Array.from(forecast.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Calculate retention rate from review history
 */
export function calculateRetentionRate(logs: ReviewLog[]): number {
  if (logs.length === 0) return 0;

  const reviews = logs.filter((log) => log.state === 'review');
  if (reviews.length === 0) return 0;

  const remembered = reviews.filter((log) => log.rating >= 2).length;
  return Math.round((remembered / reviews.length) * 100);
}

/**
 * Get rating label
 */
export function getRatingLabel(rating: Rating): string {
  switch (rating) {
    case 1:
      return 'Again';
    case 2:
      return 'Hard';
    case 3:
      return 'Good';
    case 4:
      return 'Easy';
  }
}

/**
 * Get estimated next review time as human-readable string
 */
export function formatInterval(days: number): string {
  if (days < 1 / 24) {
    return 'a few minutes';
  } else if (days < 1) {
    const hours = Math.round(days * 24);
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  } else if (days < 7) {
    const d = Math.round(days);
    return `${d} day${d === 1 ? '' : 's'}`;
  } else if (days < 30) {
    const weeks = Math.round(days / 7);
    return `${weeks} week${weeks === 1 ? '' : 's'}`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months === 1 ? '' : 's'}`;
  } else {
    const years = Math.round(days / 365);
    return `${years} year${years === 1 ? '' : 's'}`;
  }
}
