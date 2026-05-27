'use client';

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CCATQuestion, CCATScreen } from '@/lib/ccatTypes';
import { useExamStore, useHasHydrated } from '@/lib/store';
import { questionsToCcat } from '@/lib/ccatConvert';
import CCATStartScreen from '@/components/ccat/CCATStartScreen';
import CCATExamScreen from '@/components/ccat/CCATExamScreen';
import CCATResultsScreen from '@/components/ccat/CCATResultsScreen';
import defaultQuestionsData from '@/data/ccat/questions.json';

const defaultQuestions = defaultQuestionsData as CCATQuestion[];
const SECONDS_PER_QUESTION = 18; // mirrors the real CCAT pace (50 Q / 15 min)

const DIST_STYLE: Record<string, { color: string; textColor: string }> = {
  'Verbal Ability': { color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  'Verbal': { color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400' },
  'Math & Logic': { color: 'bg-emerald-500', textColor: 'text-emerald-600 dark:text-emerald-400' },
  'Spatial Reasoning': { color: 'bg-violet-500', textColor: 'text-violet-600 dark:text-violet-400' },
};

function buildDistribution(questions: CCATQuestion[]) {
  const order = ['Verbal', 'Math & Logic', 'Spatial Reasoning'];
  const counts = new Map<string, number>();
  for (const q of questions) counts.set(q.category, (counts.get(q.category) || 0) + 1);
  const items = order
    .filter((c) => counts.has(c))
    .map((c) => ({
      name: c === 'Verbal' ? 'Verbal Ability' : c,
      count: counts.get(c)!,
      ...(DIST_STYLE[c] ?? DIST_STYLE['Verbal']),
    }));
  // Include any non-standard categories so totals always add up
  for (const [c, n] of counts) {
    if (!order.includes(c)) {
      items.push({ name: c, count: n, color: 'bg-gray-400', textColor: 'text-gray-600 dark:text-gray-400' });
    }
  }
  return items;
}

function formatMinutes(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  return `${m} Minute${m === 1 ? '' : 's'}`;
}

function CCATRunner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydrated = useHasHydrated();
  const setId = searchParams.get('set');
  const { availableQuestionSets } = useExamStore();

  // Resolve the question set: an imported library set (?set=id) or the bundled default.
  const set = useMemo(
    () => (setId ? availableQuestionSets.find((s) => s.id === setId) : undefined),
    [setId, availableQuestionSets]
  );

  const questions = useMemo<CCATQuestion[]>(() => {
    if (setId && set) return questionsToCcat(set.questions);
    if (setId) return []; // waiting on hydration / not found
    return defaultQuestions;
  }, [setId, set]);

  const totalTime = useMemo(
    () => (questions.length > 0 ? questions.length * SECONDS_PER_QUESTION : 0),
    [questions.length]
  );

  const [screen, setScreen] = useState<CCATScreen>('start');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
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
    setAnswers(Array(questions.length).fill(null));
    setCurrent(0);
    setTimeLeft(totalTime);
    setReviewMode(false);
    setScreen('exam');
  }, [questions.length, totalTime]);

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
    (s: number, a, i) => (a !== null && questions[i] && a === questions[i].correct ? s + 1 : s),
    0
  );

  const distribution = useMemo(() => buildDistribution(questions), [questions]);

  // Loading / not-found states for imported sets
  const loadingSet = setId && !hasHydrated;
  const setNotFound = setId && hasHydrated && !set;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Top bar with back button */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between">
          <button
            onClick={() => router.push(setId ? '/library' : '/')}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors py-1"
          >
            <ArrowLeft className="w-4 h-4" />
            {setId ? 'Back to Library' : 'Back to Home'}
          </button>
          {screen === 'exam' && !reviewMode && (
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              {set ? set.title : 'CCAT Practice'}
            </span>
          )}
        </div>
      </div>

      {/* Screen content */}
      <div>
        {loadingSet && (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
          </div>
        )}

        {setNotFound && (
          <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
            <p className="text-gray-700 dark:text-gray-200 font-medium">Question set not found.</p>
            <button
              onClick={() => router.push('/library')}
              className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm"
            >
              Back to Library
            </button>
          </div>
        )}

        {!loadingSet && !setNotFound && questions.length > 0 && (
          <>
            {screen === 'start' && (
              <CCATStartScreen
                onStart={startExam}
                title={set ? set.title : undefined}
                subtitle={set ? set.description || set.subject : undefined}
                total={questions.length}
                timeLabel={formatMinutes(totalTime)}
                avgLabel={`${SECONDS_PER_QUESTION} Seconds`}
                distribution={distribution}
              />
            )}

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
                  if (current < questions.length - 1) setCurrent((c) => c + 1);
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
                totalTime={totalTime}
                onReview={handleReview}
                onRetake={handleRetake}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CCATPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      }
    >
      <CCATRunner />
    </Suspense>
  );
}
