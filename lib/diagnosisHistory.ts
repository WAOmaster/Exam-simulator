// Diagnosis history persistence for Study Guide

const STORAGE_KEY = 'exam-diagnosis-history';
const MAX_RECORDS = 100;

export interface DiagnosisRecord {
  id: string;
  timestamp: number;
  questionId: number;
  category: string;
  primaryDiagnosis: string;
  diagnosticExplanation: string;
  conceptToReview: string;
  practiceHint: string;
}

export function generateDiagnosisId(): string {
  return `diag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function saveDiagnosisRecord(record: DiagnosisRecord): void {
  if (typeof window === 'undefined') return;

  try {
    const history = getDiagnosisHistory();
    history.unshift(record);

    if (history.length > MAX_RECORDS) {
      history.splice(MAX_RECORDS);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save diagnosis record:', error);
  }
}

export function getDiagnosisHistory(): DiagnosisRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to get diagnosis history:', error);
    return [];
  }
}

export function clearDiagnosisHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear diagnosis history:', error);
  }
}

export interface WeakConcept {
  category: string;
  conceptToReview: string;
  frequency: number;
  primaryDiagnoses: string[];
  latestExplanation: string;
  latestHint: string;
}

export function getWeakConceptsFromDiagnoses(): WeakConcept[] {
  const history = getDiagnosisHistory();

  const conceptMap: Record<string, {
    category: string;
    conceptToReview: string;
    frequency: number;
    diagnoses: Set<string>;
    latestExplanation: string;
    latestHint: string;
    latestTimestamp: number;
  }> = {};

  history.forEach((record) => {
    const key = `${record.category}::${record.conceptToReview}`;
    if (!conceptMap[key]) {
      conceptMap[key] = {
        category: record.category,
        conceptToReview: record.conceptToReview,
        frequency: 0,
        diagnoses: new Set(),
        latestExplanation: record.diagnosticExplanation,
        latestHint: record.practiceHint,
        latestTimestamp: record.timestamp,
      };
    }

    conceptMap[key].frequency++;
    conceptMap[key].diagnoses.add(record.primaryDiagnosis);

    if (record.timestamp > conceptMap[key].latestTimestamp) {
      conceptMap[key].latestExplanation = record.diagnosticExplanation;
      conceptMap[key].latestHint = record.practiceHint;
      conceptMap[key].latestTimestamp = record.timestamp;
    }
  });

  return Object.values(conceptMap)
    .map((c) => ({
      category: c.category,
      conceptToReview: c.conceptToReview,
      frequency: c.frequency,
      primaryDiagnoses: Array.from(c.diagnoses),
      latestExplanation: c.latestExplanation,
      latestHint: c.latestHint,
    }))
    .sort((a, b) => b.frequency - a.frequency);
}

export function getDiagnosisSummary(): {
  totalDiagnoses: number;
  categoriesAffected: string[];
  topErrorTypes: { type: string; count: number }[];
} {
  const history = getDiagnosisHistory();

  if (history.length === 0) {
    return { totalDiagnoses: 0, categoriesAffected: [], topErrorTypes: [] };
  }

  const categories = new Set<string>();
  const errorTypeCounts: Record<string, number> = {};

  history.forEach((record) => {
    categories.add(record.category);
    errorTypeCounts[record.primaryDiagnosis] = (errorTypeCounts[record.primaryDiagnosis] || 0) + 1;
  });

  const topErrorTypes = Object.entries(errorTypeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDiagnoses: history.length,
    categoriesAffected: Array.from(categories),
    topErrorTypes,
  };
}
