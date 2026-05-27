'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  Library as LibraryIcon, ArrowLeft, Search, Filter, Loader2,
  AlertCircle, Upload, RefreshCw, Share2, UserCircle2, Calendar, BookOpen, CheckCircle, X
} from 'lucide-react';
import QuestionSetCard from '@/components/QuestionSetCard';
import ExamSetupModal from '@/components/ExamSetupModal';
import JsonImportDialog from '@/components/JsonImportDialog';
import { useExamStore } from '@/lib/store';
import { QuestionSet, SharedQuestionSet } from '@/lib/types';
import { isCcatSet } from '@/lib/ccatConvert';
import { useSyncContext } from '@/components/SyncProvider';

export default function LibraryPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const {
    loadQuestionSets, setCurrentQuestionSet, startExam, resetExam,
    availableQuestionSets, addQuestionSet, removeQuestionSet,
    isExamStarted, isExamCompleted, currentQuestionSetId,
    mode: activeMode, userAnswers, questions: activeQuestions,
    sharedWithMeSets, setSharedWithMeSets, dismissSharedSet,
  } = useExamStore();
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

  // Shared-with-me state
  const [sharedLoading, setSharedLoading] = useState(false);
  const [savingShareId, setSavingShareId] = useState<string | null>(null);
  const [dismissingShareId, setDismissingShareId] = useState<string | null>(null);

  // Load question sets from store on mount
  useEffect(() => {
    fetchQuestionSets();
  }, [availableQuestionSets]);

  // Fetch shared-with-me sets when signed in
  useEffect(() => {
    if (session?.user?.email) {
      fetchSharedSets();
    }
  }, [session?.user?.email]);

  // Filter question sets when search or filter changes
  useEffect(() => {
    let filtered = questionSets;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (set) =>
          set.title.toLowerCase().includes(query) ||
          set.description.toLowerCase().includes(query) ||
          set.subject.toLowerCase().includes(query)
      );
    }

    if (filterSubject !== 'all') {
      filtered = filtered.filter((set) => set.subject === filterSubject);
    }

    setFilteredSets(filtered);
  }, [searchQuery, filterSubject, questionSets]);

  const fetchQuestionSets = async () => {
    setIsLoading(true);
    setError('');
    try {
      setQuestionSets(availableQuestionSets);
    } catch (err: any) {
      setError(err.message || 'Failed to load question sets');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSharedSets = async () => {
    setSharedLoading(true);
    try {
      const res = await fetch('/api/share');
      if (res.ok) {
        const data = await res.json();
        if (data.shares) {
          setSharedWithMeSets(data.shares);
        }
      }
    } catch {
      // silently ignore — shared sets may just not load
    } finally {
      setSharedLoading(false);
    }
  };

  const handleStartExam = (questionSet: QuestionSet) => {
    // CCAT-style sets (spatial / cognitive-aptitude questions) run through the
    // dedicated CCAT flow with shape rendering, mini-map, and category scoring.
    if (isCcatSet(questionSet)) {
      router.push(`/ccat?set=${encodeURIComponent(questionSet.id)}`);
      return;
    }
    if (isExamStarted && !isExamCompleted && currentQuestionSetId === questionSet.id && activeQuestions.length > 0) {
      if (confirm(`You have an active ${activeMode} session for "${questionSet.title}" (${userAnswers.size}/${activeQuestions.length} answered). Resume?`)) {
        router.push(activeMode === 'practice' ? '/practice' : '/exam');
        return;
      }
    }
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
    resetExam();
    loadQuestionSets(questionSets);
    setCurrentQuestionSet(selectedQuestionSet.id);
    startExam(config.examDuration, config.mode, config.useTimer, config.learnWithAI, config.reviewAnswers, config.cognitiveCompanion, config.socraticMode);
    setShowSetupModal(false);
    router.push(config.mode === 'practice' ? '/practice' : '/exam');
  };

  const handleDeleteSet = async (questionSet: QuestionSet) => {
    if (!confirm(`Are you sure you want to delete "${questionSet.title}"?`)) return;
    removeQuestionSet(questionSet.id);
    // Also remove from cloud backup if signed in
    if (session?.user?.id) {
      fetch(`/api/sync?setId=${questionSet.id}`, { method: 'DELETE' }).catch(() => {});
    }
  };

  const handleImportQuestionSet = (questionSet: QuestionSet) => {
    addQuestionSet(questionSet);
  };

  const handleSaveSharedSet = async (share: SharedQuestionSet) => {
    setSavingShareId(share.id);
    try {
      const newSet: QuestionSet = {
        ...share.questionSet,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        description: share.questionSet.description
          ? `${share.questionSet.description} (Shared by ${share.sharedByName})`
          : `Shared by ${share.sharedByName}`,
      };
      addQuestionSet(newSet);
      // Dismiss the share after saving
      await handleDismissShare(share, false);
    } finally {
      setSavingShareId(null);
    }
  };

  const handleDismissShare = async (share: SharedQuestionSet, confirm = true) => {
    if (confirm && !window.confirm('Remove this shared set from your inbox?')) return;
    setDismissingShareId(share.id);
    try {
      dismissSharedSet(share.id);
      await fetch(`/api/share?shareId=${share.id}`, { method: 'DELETE' }).catch(() => {});
    } finally {
      setDismissingShareId(null);
    }
  };

  const subjects = ['all', ...new Set(questionSets.map((set) => set.subject))];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

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
                    onShare={session?.user ? () => {} : undefined}
                    isActiveSession={isExamStarted && !isExamCompleted && currentQuestionSetId === questionSet.id && activeQuestions.length > 0 && userAnswers.size < activeQuestions.length}
                    activeProgress={isExamStarted && !isExamCompleted && currentQuestionSetId === questionSet.id ? { answered: userAnswers.size, total: activeQuestions.length, mode: activeMode } : undefined}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        )}

        {/* ── Shared with Me ───────────────────────────────────────────────── */}
        {session?.user?.email && (sharedWithMeSets.length > 0 || sharedLoading) && (
          <div className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shared with Me</h2>
              {sharedLoading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />}
              {!sharedLoading && sharedWithMeSets.length > 0 && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({sharedWithMeSets.length})
                </span>
              )}
            </div>

            {sharedWithMeSets.length === 0 && sharedLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading shared sets...
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {sharedWithMeSets.map((share, index) => (
                <motion.div
                  key={share.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4 sm:p-5 hover:shadow-lg transition-all"
                >
                  {/* Shared-by banner */}
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                    <UserCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Shared by <span className="font-medium">{share.sharedByName}</span></span>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1 line-clamp-2">
                    {share.questionSet.title}
                  </h3>
                  {share.questionSet.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                      {share.questionSet.description}
                    </p>
                  )}

                  {/* Subject */}
                  <div className="mb-3">
                    <span className="inline-block px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                      {share.questionSet.subject}
                    </span>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5" />
                      {share.questionSet.metadata.totalQuestions} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(share.sharedAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => handleSaveSharedSet(share)}
                      disabled={savingShareId === share.id || dismissingShareId === share.id}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      {savingShareId === share.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Save to My Library
                    </button>
                    <button
                      onClick={() => handleDismissShare(share)}
                      disabled={savingShareId === share.id || dismissingShareId === share.id}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
                      title="Dismiss"
                    >
                      {dismissingShareId === share.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
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
