'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Library as LibraryIcon, ArrowLeft, Search, Filter, Loader2, AlertCircle, Upload, RefreshCw } from 'lucide-react';
import QuestionSetCard from '@/components/QuestionSetCard';
import ExamSetupModal from '@/components/ExamSetupModal';
import JsonImportDialog from '@/components/JsonImportDialog';
import { useExamStore } from '@/lib/store';
import { QuestionSet } from '@/lib/types';
import { useSyncContext } from '@/components/SyncProvider';

export default function LibraryPage() {
  const router = useRouter();
  const { loadQuestionSets, setCurrentQuestionSet, startExam, resetExam, availableQuestionSets, addQuestionSet, isExamStarted, isExamCompleted, currentQuestionSetId, mode: activeMode, userAnswers, questions: activeQuestions } = useExamStore();
  const { syncStatus } = useSyncContext();

  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([]);
  const [filteredSets, setFilteredSets] = useState<QuestionSet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<QuestionSet | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Load question sets from store on mount
  useEffect(() => {
    fetchQuestionSets();
  }, [availableQuestionSets]);

  // Filter question sets when search or filter changes
  useEffect(() => {
    let filtered = questionSets;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (set) =>
          set.title.toLowerCase().includes(query) ||
          set.description.toLowerCase().includes(query) ||
          set.subject.toLowerCase().includes(query)
      );
    }

    // Apply subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter((set) => set.subject === filterSubject);
    }

    setFilteredSets(filtered);
  }, [searchQuery, filterSubject, questionSets]);

  const fetchQuestionSets = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Load from Zustand store (localStorage) instead of server API
      // This works on Vercel's read-only filesystem
      setQuestionSets(availableQuestionSets);
    } catch (err: any) {
      setError(err.message || 'Failed to load question sets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExam = (questionSet: QuestionSet) => {
    // If there's an active session for this question set, offer to resume
    if (isExamStarted && !isExamCompleted && currentQuestionSetId === questionSet.id && activeQuestions.length > 0) {
      if (confirm(`You have an active ${activeMode} session for "${questionSet.title}" (${userAnswers.size}/${activeQuestions.length} answered). Resume?`)) {
        router.push(activeMode === 'practice' ? '/practice' : '/exam');
        return;
      }
    }
    // Open setup modal for new session
    setSelectedQuestionSet(questionSet);
    setShowSetupModal(true);
  };

  const handleStartWithConfig = (config: {
    mode: 'practice' | 'exam';
    useTimer: boolean;
    learnWithAI: boolean;
    reviewAnswers: boolean;
    cognitiveCompanion: boolean;
    socraticMode: boolean;
    examDuration: number;
  }) => {
    if (!selectedQuestionSet) return;

    // First reset the exam
    resetExam();

    // Then load the questions from the selected question set
    loadQuestionSets(questionSets); // Ensure question sets are in store
    setCurrentQuestionSet(selectedQuestionSet.id); // Set questions from the set

    // Now start the exam with the configured settings
    startExam(config.examDuration, config.mode, config.useTimer, config.learnWithAI, config.reviewAnswers, config.cognitiveCompanion, config.socraticMode);

    // Close modal
    setShowSetupModal(false);

    // Navigate to appropriate page
    router.push(config.mode === 'practice' ? '/practice' : '/exam');
  };

  const handleDeleteSet = async (questionSet: QuestionSet) => {
    if (!confirm(`Are you sure you want to delete "${questionSet.title}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/library?id=${questionSet.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete question set');
      }

      // Refresh the list
      await fetchQuestionSets();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question set');
    }
  };

  const handleImportQuestionSet = (questionSet: QuestionSet) => {
    addQuestionSet(questionSet);
  };

  // Get unique subjects for filter
  const subjects = ['all', ...new Set(questionSets.map((set) => set.subject))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-3 sm:mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <LibraryIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 dark:text-blue-400" />
              <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                My Library
              </h1>
            </div>
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-md text-xs sm:text-sm"
            >
              <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Import JSON</span>
              <span className="sm:hidden">Import</span>
            </button>
          </div>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Browse and manage your saved question sets
          </p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, description, or subject..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Subject Filter */}
            <div className="md:w-64 relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none cursor-pointer"
              >
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject === 'all' ? 'All Subjects' : subject}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Syncing Indicator */}
        {syncStatus === 'syncing' && (
          <div className="flex items-center gap-2 px-4 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Syncing your library from cloud...
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredSets.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <LibraryIcon className="w-20 h-20 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
              {searchQuery || filterSubject !== 'all' ? 'No results found' : 'No question sets yet'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {searchQuery || filterSubject !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Generate your first question set to get started'}
            </p>
            {!searchQuery && filterSubject === 'all' && (
              <button
                onClick={() => router.push('/generate')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors shadow-md"
              >
                Generate Questions
              </button>
            )}
          </motion.div>
        )}

        {/* Question Sets Grid */}
        {!isLoading && !error && filteredSets.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {filteredSets.length} of {questionSets.length} question set
                {questionSets.length !== 1 ? 's' : ''}
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
            >
              {filteredSets.map((questionSet, index) => (
                <motion.div
                  key={questionSet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <QuestionSetCard
                    questionSet={questionSet}
                    onStart={handleStartExam}
                    onDelete={handleDeleteSet}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}
      </div>

      {/* Exam Setup Modal */}
      {selectedQuestionSet && (
        <ExamSetupModal
          isOpen={showSetupModal}
          onClose={() => setShowSetupModal(false)}
          onStart={handleStartWithConfig}
          questionSetTitle={selectedQuestionSet.title}
          questionCount={selectedQuestionSet.questions.length}
        />
      )}

      {/* JSON Import Dialog */}
      <JsonImportDialog
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onImport={handleImportQuestionSet}
        existingIds={availableQuestionSets.map(s => s.id)}
      />
    </div>
  );
}
