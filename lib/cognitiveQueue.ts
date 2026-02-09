// Background Cognitive Companion Queue
// Batches diagnosis requests and sends them together to minimize API calls
// Uses Gemini 3 with deep thinking - batching avoids rate limiting

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

// Max questions per batch to keep prompt size reasonable
const MAX_BATCH_SIZE = 5;
// How long to wait after last enqueue before sending batch (ms)
const BATCH_DEBOUNCE = 4000;
// Delay between batch API calls to avoid rate limiting
const INTER_BATCH_DELAY = 5000;
// Max retries per batch
const MAX_RETRIES = 2;

class CognitiveQueue {
  private pendingRequests: DiagnosisRequest[] = [];
  private results: Map<number, DiagnosisResult> = new Map();
  private listeners: Set<QueueListener> = new Set();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private processing = false;
  private batchQueue: DiagnosisRequest[][] = []; // Queue of batches waiting to be processed

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

    this.pendingRequests.push(request);
    this.notifyListeners();

    // Reset debounce timer - wait for more questions before sending
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = setTimeout(() => this.flushPending(), BATCH_DEBOUNCE);
  }

  // Flush pending requests: split into batches and start processing
  private flushPending(): void {
    if (this.pendingRequests.length === 0) return;

    // Split into batches of MAX_BATCH_SIZE
    while (this.pendingRequests.length > 0) {
      const batch = this.pendingRequests.splice(0, MAX_BATCH_SIZE);
      this.batchQueue.push(batch);
    }

    this.processNextBatch();
  }

  // Force flush - send everything now (called on exam completion)
  flush(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.flushPending();
  }

  private async processNextBatch(): Promise<void> {
    if (this.processing || this.batchQueue.length === 0) return;

    this.processing = true;
    const batch = this.batchQueue.shift()!;

    // Mark all as processing
    batch.forEach((req) => {
      this.results.set(req.questionId, {
        ...this.results.get(req.questionId)!,
        status: 'processing',
      });
    });
    this.notifyListeners();

    await this.processBatchWithRetry(batch, 0);

    this.processing = false;
    this.notifyListeners();

    // Process next batch with delay
    if (this.batchQueue.length > 0) {
      setTimeout(() => this.processNextBatch(), INTER_BATCH_DELAY);
    }
  }

  private async processBatchWithRetry(batch: DiagnosisRequest[], attempt: number): Promise<void> {
    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: batch.map((req) => ({
            questionId: req.questionId,
            question: req.question,
            options: req.options,
            correctAnswer: req.correctAnswer,
            userAnswer: req.selectedAnswer,
            responseTimeMs: req.responseTimeMs,
            selectionChanges: req.selectionChanges,
            consecutiveIncorrect: req.consecutiveIncorrect,
            category: req.category,
            difficulty: req.difficulty,
          })),
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Diagnosis failed');

      const diagnoses: any[] = data.diagnoses || [];

      // Map results back
      batch.forEach((req, i) => {
        const diag = diagnoses.find((d: any) => d.questionId === req.questionId) || diagnoses[i];

        if (diag && diag.hypotheses && diag.remediation) {
          this.results.set(req.questionId, {
            questionId: req.questionId,
            status: 'completed',
            diagnosis: diag,
            thinkingProcess: data.thinkingProcess || [],
            timestamp: Date.now(),
          });

          // Save to diagnosis history for study guide
          try {
            saveDiagnosisRecord({
              id: generateDiagnosisId(),
              timestamp: Date.now(),
              questionId: req.questionId,
              category: req.category || 'General',
              primaryDiagnosis: diag.primaryDiagnosis || 'unknown',
              diagnosticExplanation: diag.diagnosticExplanation || '',
              conceptToReview: diag.remediation?.conceptToReview || '',
              practiceHint: diag.remediation?.practiceHint || '',
            });
          } catch {
            // Non-critical
          }
        } else {
          this.results.set(req.questionId, {
            questionId: req.questionId,
            status: 'error',
            diagnosis: null,
            thinkingProcess: [],
            error: 'No diagnosis returned for this question',
            timestamp: Date.now(),
          });
        }
      });
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        // Exponential backoff retry
        const delay = INTER_BATCH_DELAY * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.processBatchWithRetry(batch, attempt + 1);
      }

      // Mark all in batch as error
      batch.forEach((req) => {
        this.results.set(req.questionId, {
          questionId: req.questionId,
          status: 'error',
          diagnosis: null,
          thinkingProcess: [],
          error: err.message || 'Diagnosis failed',
          timestamp: Date.now(),
        });
      });
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
    return Array.from(this.results.values()).filter((r) => r.status === 'completed');
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
      completed: values.filter((r) => r.status === 'completed').length,
      processing: values.filter((r) => r.status === 'processing').length,
      pending: values.filter((r) => r.status === 'pending').length,
      errors: values.filter((r) => r.status === 'error').length,
    };
  }

  // Subscribe to changes
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const snapshot = this.getAllResults();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  // Reset the queue (for new exam sessions)
  reset(): void {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = null;
    this.pendingRequests = [];
    this.batchQueue = [];
    this.results = new Map();
    this.processing = false;
    this.notifyListeners();
  }
}

// Singleton instance
export const cognitiveQueue = new CognitiveQueue();
