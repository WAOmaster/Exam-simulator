'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Clock, Brain, Trophy, Sparkles, FileText, MessageCircle } from 'lucide-react';

interface ExamSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (config: {
    mode: 'practice' | 'exam';
    useTimer: boolean;
    learnWithAI: boolean;
    reviewAnswers: boolean;
    cognitiveCompanion: boolean;
    socraticMode: boolean;
    examDuration: number;
  }) => void;
  questionSetTitle: string;
  questionCount: number;
}

export default function ExamSetupModal({
  isOpen,
  onClose,
  onStart,
  questionSetTitle,
  questionCount,
}: ExamSetupModalProps) {
  const [mode, setMode] = useState<'practice' | 'exam'>('exam');
  const [useTimer, setUseTimer] = useState(true);
  const [learnWithAI, setLearnWithAI] = useState(false);
  const [reviewAnswers, setReviewAnswers] = useState(false);
  const [cognitiveCompanion, setCognitiveCompanion] = useState(false);
  const [socraticMode, setSocraticMode] = useState(false);
  const [examDuration, setExamDuration] = useState(90);

  const handleStart = () => {
    onStart({ mode, useTimer, learnWithAI, reviewAnswers, cognitiveCompanion, socraticMode, examDuration });
  };

  const durations = [30, 60, 90, 120];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-2xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex items-start justify-between">
                <div className="min-w-0 flex-1 mr-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    Setup Your Session
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                    {questionSetTitle} • {questionCount} questions
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">
                    Select Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <button
                      onClick={() => setMode('practice')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        mode === 'practice'
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Brain className={`w-6 h-6 ${mode === 'practice' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="text-left">
                          <h3 className={`font-semibold ${mode === 'practice' ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                            Practice Mode
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Instant AI feedback for each answer
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setMode('exam')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        mode === 'exam'
                          ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-6 h-6 ${mode === 'exam' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        <div className="text-left">
                          <h3 className={`font-semibold ${mode === 'exam' ? 'text-gray-900 dark:text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                            Exam Mode
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Simulate real exam conditions
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Timer Toggle */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Use Timer
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {useTimer ? `${examDuration} minutes countdown` : 'No time limit'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setUseTimer(!useTimer)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        useTimer ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                          useTimer ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Learn with AI Toggle (Practice Mode Only) */}
                {mode === 'practice' && (
                  <div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            Learn with AI
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Get AI-guided learning for each question
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLearnWithAI(!learnWithAI)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${
                          learnWithAI ? 'bg-purple-600 dark:bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                            learnWithAI ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Review Answers Toggle (Exam Mode Only) */}
                {mode === 'exam' && (
                  <div>
                    <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
                        <div>
                          <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                            Review Answers
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Review answers during exam (optional)
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setReviewAnswers(!reviewAnswers)}
                        className={`relative w-14 h-8 rounded-full transition-colors ${
                          reviewAnswers ? 'bg-green-600 dark:bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <div
                          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                            reviewAnswers ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* Cognitive Companion Toggle (Both Modes) */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Brain className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Cognitive Companion
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          AI diagnoses why you got it wrong
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setCognitiveCompanion(!cognitiveCompanion)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        cognitiveCompanion ? 'bg-amber-600 dark:bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                          cognitiveCompanion ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Socratic Dialogue Toggle (Both Modes) */}
                <div>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <MessageCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                      <div>
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                          Socratic Dialogue
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          AI guides you to discover answers
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSocraticMode(!socraticMode)}
                      className={`relative w-14 h-8 rounded-full transition-colors ${
                        socraticMode ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <div
                        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
                          socraticMode ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Exam Duration Selector (only if timer is enabled) */}
                {useTimer && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Duration
                    </label>
                    <div className="grid grid-cols-4 gap-2 sm:gap-3">
                      {durations.map((duration) => (
                        <button
                          key={duration}
                          onClick={() => setExamDuration(duration)}
                          className={`p-2.5 sm:p-4 rounded-lg border-2 transition-all ${
                            examDuration === duration
                              ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500'
                          }`}
                        >
                          <div className="text-center">
                            <div className={`text-lg sm:text-2xl font-bold ${
                              examDuration === duration
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {duration}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              minutes
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6 flex gap-2 sm:gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm sm:text-base font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white text-sm sm:text-base font-bold rounded-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  Start {mode === 'practice' ? 'Practice' : 'Exam'}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
