// Background Cognitive Companion Queue
// Processes diagnosis requests asynchronously without blocking the exam flow

import { saveDiagnosisRecord, generateDiagnosisId } from './diagnosisHistory';

export interface DiagnosisRequest {
  questionId: number;
  question: string;
  options: { id: string; text: string }[];
  selectedAnswer: string;
  correctAnswer: string;
  responseTimeMs: number;
  selectionChanges: number;
  consecutiveIncorrect: number;
  category: string;
  difficulty: string;
}

export interface Hypothesis {
  type: string;
  confidence: number;
  reasoning: string;
}

export interface DiagnosisResult {
  questionId: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  diagnosis: {
    hypotheses: Hypothesis[];
    primaryDiagnosis: string;
    emotionalTone: 'encouraging' | 'empathetic' | 'challenging' | 'supportive';
    diagnosticExplanation: string;
    remediation: {
      immediateAction: string;
      conceptToReview: string;
      practiceHint: string;
    };
  } | null;
  thinkingProcess: string[];
  error?: string;
  timestamp: number;
}

type QueueListener = (results: Map<number, DiagnosisResult>) => void;

class CognitiveQueue {
  private queue: DiagnosisRequest[] = [];
  private results: Map<number, DiagnosisResult> = new Map();
  private processing = false;
  private listeners: Set<QueueListener> = new Set();
  private retryCount: Map<number, number> = new Map();
  private static MAX_RETRIES = 2;
  private static BASE_DELAY = 3000; // 3s between requests to avoid rate limiting

  // Add a diagnosis request to the queue
  enqueue(request: DiagnosisRequest): void {
    // Skip if already queued or completed for this question
    if (this.results.has(request.questionId)) {
      const existing = this.results.get(request.questionId)!;
      if (existing.status !== 'error') return;
    }

    // Mark as pending
    this.results.set(request.questionId, {
      questionId: request.questionId,
      status: 'pending',
      diagnosis: null,
      thinkingProcess: [],
      timestamp: Date.now(),
    });

    this.queue.push(request);
    this.notifyListeners();
    this.processNext();
  }

  // Process the next item in the queue
  private async processNext(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const request = this.queue.shift()!;

    // Update status to processing
    this.results.set(request.questionId, {
      ...this.results.get(request.questionId)!,
      status: 'processing',
    });
    this.notifyListeners();

    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: request.question,
          options: request.options,
          correctAnswer: request.correctAnswer,
          userAnswer: request.selectedAnswer,
          responseTimeMs: request.responseTimeMs,
          selectionChanges: request.selectionChanges,
          consecutiveIncorrect: request.consecutiveIncorrect,
          category: request.category,
          difficulty: request.difficulty,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch diagnosis');

      const data = await response.json();

      if (!data.success) throw new Error(data.error || 'Diagnosis failed');

      // Save to diagnosis history for study guide
      try {
        saveDiagnosisRecord({
          id: generateDiagnosisId(),
          timestamp: Date.now(),
          questionId: request.questionId,
          category: request.category || 'General',
          primaryDiagnosis: data.diagnosis.primaryDiagnosis || 'unknown',
          diagnosticExplanation: data.diagnosis.diagnosticExplanation || '',
          conceptToReview: data.diagnosis.remediation?.conceptToReview || '',
          practiceHint: data.diagnosis.remediation?.practiceHint || '',
        });
      } catch {
        // Non-critical
      }

      this.results.set(request.questionId, {
        questionId: request.questionId,
        status: 'completed',
        diagnosis: data.diagnosis,
        thinkingProcess: data.thinkingProcess || [],
        timestamp: Date.now(),
      });
    } catch (err: any) {
      const retries = this.retryCount.get(request.questionId) || 0;

      if (retries < CognitiveQueue.MAX_RETRIES) {
        // Retry with exponential backoff
        this.retryCount.set(request.questionId, retries + 1);
        this.results.set(request.questionId, {
          ...this.results.get(request.questionId)!,
          status: 'pending',
        });
        this.queue.unshift(request); // Re-add to front of queue
        this.notifyListeners();
        this.processing = false;
        const backoffDelay = CognitiveQueue.BASE_DELAY * Math.pow(2, retries);
        setTimeout(() => this.processNext(), backoffDelay);
        return;
      }

      this.results.set(request.questionId, {
        questionId: request.questionId,
        status: 'error',
        diagnosis: null,
        thinkingProcess: [],
        error: err.message || 'Diagnosis failed',
        timestamp: Date.now(),
      });
    }

    this.processing = false;
    this.notifyListeners();

    // Process next in queue with delay to avoid rate limiting
    if (this.queue.length > 0) {
      setTimeout(() => this.processNext(), CognitiveQueue.BASE_DELAY);
    }
  }

  // Get result for a specific question
  getResult(questionId: number): DiagnosisResult | undefined {
    return this.results.get(questionId);
  }

  // Get all results
  getAllResults(): Map<number, DiagnosisResult> {
    return new Map(this.results);
  }

  // Get completed results only
  getCompletedResults(): DiagnosisResult[] {
    return Array.from(this.results.values()).filter(r => r.status === 'completed');
  }

  // Get summary stats
  getSummary(): {
    total: number;
    completed: number;
    processing: number;
    pending: number;
    errors: number;
  } {
    const values = Array.from(this.results.values());
    return {
      total: values.length,
      completed: values.filter(r => r.status === 'completed').length,
      processing: values.filter(r => r.status === 'processing').length,
      pending: values.filter(r => r.status === 'pending').length,
      errors: values.filter(r => r.status === 'error').length,
    };
  }

  // Subscribe to changes
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getAllResults();
    this.listeners.forEach(fn => fn(snapshot));
  }

  // Reset the queue (for new exam sessions)
  reset(): void {
    this.queue = [];
    this.results = new Map();
    this.retryCount = new Map();
    this.processing = false;
    this.notifyListeners();
  }
}

// Singleton instance
export const cognitiveQueue = new CognitiveQueue();
