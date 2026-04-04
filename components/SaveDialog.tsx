'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Globe, Lock, Loader2 } from 'lucide-react';
import { QuestionSet } from '@/lib/types';

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  questionSet: Partial<QuestionSet>;
  onSave: (questionSet: QuestionSet, makePublic: boolean) => Promise<void>;
}

export default function SaveDialog({ isOpen, onClose, questionSet, onSave }: SaveDialogProps) {
  const [title, setTitle] = useState(questionSet.title || '');
  const [description, setDescription] = useState(questionSet.description || '');
  const [isPublic, setIsPublic] = useState(false);
  const [consent, setConsent] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Please enter a title for your question set');
      return;
    }

    if (isPublic && !consent) {
      setError('Please provide consent to share publicly');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      const completeQuestionSet: QuestionSet = {
        ...questionSet,
        id: questionSet.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: title.trim(),
        description: description.trim(),
        isPublic,
        createdAt: questionSet.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as QuestionSet;

      await onSave(completeQuestionSet, isPublic);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save question set');
    } finally {
      setIsSaving(false);
    }
  };

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
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            {/* Dialog */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <Save className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Save Question Set
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., AWS Solutions Architect Practice Questions"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={isSaving}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description <span className="text-gray-400 text-xs">(Optional)</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description to help you remember what this question set covers..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={isSaving}
                  />
                </div>

                {/* Question Set Info */}
                {questionSet.metadata && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Question Set Details
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
                      <div>
                        <strong>Total Questions:</strong> {questionSet.metadata.totalQuestions}
                      </div>
                      <div>
                        <strong>Subject:</strong> {questionSet.subject}
                      </div>
                      <div>
                        <strong>Difficulty:</strong>{' '}
                        Easy: {questionSet.metadata.difficultyDistribution.easy},{' '}
                        Medium: {questionSet.metadata.difficultyDistribution.medium},{' '}
                        Hard: {questionSet.metadata.difficultyDistribution.hard}
                      </div>
                      <div>
                        <strong>Source:</strong> {questionSet.sourceType}
                      </div>
                    </div>
                  </div>
                )}

                {/* Visibility Options */}
                <div className="space-y-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Visibility
                  </p>

                  {/* Private Option */}
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      !isPublic
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Lock className={`w-5 h-5 mt-0.5 ${
                        !isPublic ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          !isPublic ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          Private
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Only you can access this question set
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Public Option */}
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isPublic
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Globe className={`w-5 h-5 mt-0.5 ${
                        isPublic ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          isPublic ? 'text-blue-900 dark:text-blue-100' : 'text-gray-800 dark:text-gray-200'
                        }`}>
                          Public - Share with Community
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Make this question set available to everyone
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Consent Checkbox */}
                  {isPublic && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-yellow-900 dark:text-yellow-100">
                          I consent to sharing this question set publicly. I understand that others will be able to view and use these questions for practice.
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  disabled={isSaving}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Question Set
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
