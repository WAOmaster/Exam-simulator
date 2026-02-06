'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Camera,
  Sparkles,
  Home,
  Lightbulb,
  BookOpen,
  Wand2,
  Search,
  Play,
} from 'lucide-react';
import ImageUploader from '@/components/ImageUploader';
import SolutionDisplay from '@/components/SolutionDisplay';
import { useExamStore } from '@/lib/store';

type SolutionMode = 'hints' | 'step_by_step' | 'full_solution' | 'analysis';

interface SolutionData {
  problemIdentification: string;
  subject: string;
  difficulty: 'easy' | 'medium' | 'hard';
  content: string;
  steps?: string[];
  hints?: string[];
  keyConcepts: string[];
  commonMistakes?: string[];
}

interface GeneratedQuestion {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type: 'multiple-choice' | 'true-false' | 'scenario';
}

export default function VisualSolverPage() {
  const router = useRouter();
  const { setQuestions, startExam } = useExamStore();

  const [imageData, setImageData] = useState<{ base64: string; mimeType: string } | null>(null);
  const [mode, setMode] = useState<SolutionMode>('step_by_step');
  const [subject, setSubject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [solution, setSolution] = useState<SolutionData | null>(null);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [error, setError] = useState('');

  const modes: { id: SolutionMode; label: string; icon: any; description: string }[] = [
    {
      id: 'hints',
      label: 'Hints Only',
      icon: Lightbulb,
      description: 'Get hints to solve it yourself',
    },
    {
      id: 'step_by_step',
      label: 'Step by Step',
      icon: BookOpen,
      description: 'Guided walkthrough',
    },
    {
      id: 'full_solution',
      label: 'Full Solution',
      icon: Wand2,
      description: 'Complete answer with explanation',
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: Search,
      description: 'Understand without solving',
    },
  ];

  const handleImageSelect = (base64: string, mimeType: string) => {
    setImageData({ base64, mimeType });
    setSolution(null);
    setGeneratedQuestions([]);
    setError('');
  };

  const handleAnalyze = async (generateQuestions = false) => {
    if (!imageData) return;

    setIsLoading(true);
    setError('');
    setSolution(null);

    try {
      const response = await fetch('/api/ai/visual-solver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageData.base64,
          mimeType: imageData.mimeType,
          mode,
          subject: subject || undefined,
          generateQuestions,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setSolution(data.solution);
      if (data.generatedQuestions) {
        setGeneratedQuestions(data.generatedQuestions);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to analyze image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPractice = () => {
    if (generatedQuestions.length === 0) return;

    setQuestions(generatedQuestions);
    startExam(30, 'practice', false, false, false);
    router.push('/practice');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-md border-b dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Visual Problem Solver
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Upload an image • Get AI-powered solutions
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Upload and Settings */}
          <div className="space-y-6">
            {/* Image Upload */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Camera className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Upload Problem Image
              </h2>
              <ImageUploader onImageSelect={handleImageSelect} isLoading={isLoading} />
            </motion.div>

            {/* Mode Selection */}
            {imageData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  Solution Mode
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  {modes.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setMode(m.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${
                          mode === m.id
                            ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-cyan-300 dark:hover:border-cyan-600'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className={`w-4 h-4 ${
                              mode === m.id
                                ? 'text-cyan-600 dark:text-cyan-400'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          />
                          <span
                            className={`font-medium ${
                              mode === m.id
                                ? 'text-cyan-700 dark:text-cyan-300'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {m.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Optional Subject Hint */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject (optional)
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g., Calculus, Physics, Chemistry..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleAnalyze(false)}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-5 h-5" />
                    Analyze Problem
                  </button>
                  <button
                    onClick={() => handleAnalyze(true)}
                    disabled={isLoading}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Wand2 className="w-5 h-5" />
                    Solve + Generate Questions
                  </button>
                </div>
              </motion.div>
            )}

            {/* Generated Questions */}
            {generatedQuestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6"
              >
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Practice Questions Generated
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {generatedQuestions.length} practice questions created based on this problem.
                </p>
                <div className="space-y-2 mb-4">
                  {generatedQuestions.map((q, index) => (
                    <div
                      key={q.id}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                    >
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        Q{index + 1}:
                      </span>{' '}
                      {q.question.length > 100 ? q.question.substring(0, 100) + '...' : q.question}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleStartPractice}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-medium rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Start Practice Session
                </button>
              </motion.div>
            )}
          </div>

          {/* Right Column - Solution Display */}
          <div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg"
              >
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </motion.div>
            )}

            <SolutionDisplay solution={solution} isLoading={isLoading} mode={mode} />

            {!solution && !isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center"
              >
                <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-full w-fit mx-auto mb-4">
                  <Camera className="w-12 h-12 text-cyan-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                  Upload a Problem to Solve
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                  Take a photo of any math, physics, chemistry, or other academic problem and let AI
                  help you understand and solve it.
                </p>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
