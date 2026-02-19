'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { CCATQuestion, CCATScreen } from '@/lib/ccatTypes';
import CCATStartScreen from '@/components/ccat/CCATStartScreen';
import CCATExamScreen from '@/components/ccat/CCATExamScreen';
import CCATResultsScreen from '@/components/ccat/CCATResultsScreen';
import questionsData from '@/data/ccat/questions.json';

const TOTAL_TIME = 15 * 60; // 15 minutes in seconds

const questions = questionsData as CCATQuestion[];

export default function CCATPage() {
  const router = useRouter();

  const [screen, setScreen] = useState<CCATScreen>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(50).fill(null));
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
  const [reviewMode, setReviewMode] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect — runs only during active exam (not review mode)
  useEffect(() => {
    if (screen === 'exam' && !reviewMode) {
      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setScreen('results');
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [screen, reviewMode]);

  const startExam = useCallback(() => {
    setAnswers(Array(50).fill(null));
    setCurrent(0);
    setTimeLeft(TOTAL_TIME);
    setReviewMode(false);
    setScreen('exam');
  }, []);

  const finishExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setScreen('results');
  }, []);

  const selectAnswer = useCallback(
    (optionIndex: number) => {
      if (reviewMode) return;
      setAnswers((prev) => {
        const next = [...prev];
        next[current] = optionIndex;
        return next;
      });
    },
    [current, reviewMode]
  );

  const handleReview = useCallback((index?: number) => {
    setReviewMode(true);
    setCurrent(index ?? 0);
    setScreen('exam');
  }, []);

  const handleRetake = useCallback(() => {
    startExam();
  }, [startExam]);

  const score = answers.reduce(
    (s: number, a, i) => (a !== null && a === questions[i].correct ? s + 1 : s),
    0
  );

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top bar with back button */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          {screen === 'exam' && !reviewMode && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              CCAT Practice
            </span>
          )}
        </div>
      </div>

      {/* Screen content */}
      <div>
        {screen === 'start' && <CCATStartScreen onStart={startExam} />}

        {screen === 'exam' && (
          <CCATExamScreen
            questions={questions}
            current={current}
            answers={answers}
            timeLeft={timeLeft}
            reviewMode={reviewMode}
            onSelect={selectAnswer}
            onPrevious={() => {
              if (current > 0) setCurrent((c) => c - 1);
            }}
            onNext={() => {
              if (current < 49) setCurrent((c) => c + 1);
            }}
            onFinish={finishExam}
            onBackToResults={() => setScreen('results')}
            onJump={(i) => setCurrent(i)}
          />
        )}

        {screen === 'results' && (
          <CCATResultsScreen
            score={score}
            answers={answers}
            questions={questions}
            timeLeft={timeLeft}
            onReview={handleReview}
            onRetake={handleRetake}
          />
        )}
      </div>
    </div>
  );
}
