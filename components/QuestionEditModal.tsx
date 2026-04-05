'use client';

import { useState } from 'react';
import { Question } from '@/lib/types';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestionEditModalProps {
  question: Question;
  onSave: (updatedQuestion: Question) => void;
  onClose: () => void;
}

export default function QuestionEditModal({
  question,
  onSave,
  onClose,
}: QuestionEditModalProps) {
  const [editedQuestion, setEditedQuestion] = useState<Question>({ ...question });

  const handleOptionChange = (optionId: string, newText: string) => {
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.map((opt) =>
        opt.id === optionId ? { ...opt, text: newText } : opt
      ),
    });
  };

  const handleAddOption = () => {
    const newOptionId = String.fromCharCode(65 + editedQuestion.options.length); // A, B, C, D...
    setEditedQuestion({
      ...editedQuestion,
      options: [
        ...editedQuestion.options,
        { id: newOptionId, text: '' },
      ],
    });
  };

  const handleRemoveOption = (optionId: string) => {
    if (editedQuestion.options.length <= 2) return; // Keep at least 2 options
    setEditedQuestion({
      ...editedQuestion,
      options: editedQuestion.options.filter((opt) => opt.id !== optionId),
      correctAnswer: editedQuestion.correctAnswer === optionId
        ? editedQuestion.options[0].id
        : editedQuestion.correctAnswer,
    });
  };

  const handleSave = () => {
    // Validate that all options have text
    if (editedQuestion.options.some((opt) => !opt.text.trim())) {
      alert('All options must have text');
      return;
    }
    if (!editedQuestion.question.trim()) {
      alert('Question text cannot be empty');
      return;
    }
    onSave(editedQuestion);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Edit Question
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Text
              </label>
              <textarea
                value={editedQuestion.question}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, question: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Enter question text..."
              />
            </div>

            {/* Options */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Answer Options
                </label>
                <button
                  onClick={handleAddOption}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Option
                </button>
              </div>
              <div className="space-y-3">
                {editedQuestion.options.map((option) => (
                  <div key={option.id} className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={editedQuestion.correctAnswer === option.id}
                          onChange={() =>
                            setEditedQuestion({
                              ...editedQuestion,
                              correctAnswer: option.id,
                            })
                          }
                          className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Option {option.id}
                        </span>
                      </div>
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => handleOptionChange(option.id, e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Enter option ${option.id} text...`}
                      />
                    </div>
                    {editedQuestion.options.length > 2 && (
                      <button
                        onClick={() => handleRemoveOption(option.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        title="Remove option"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Explanation
              </label>
              <textarea
                value={editedQuestion.explanation}
                onChange={(e) =>
                  setEditedQuestion({ ...editedQuestion, explanation: e.target.value })
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Enter explanation..."
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Difficulty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={editedQuestion.difficulty}
                  onChange={(e) =>
                    setEditedQuestion({
                      ...editedQuestion,
                      difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={editedQuestion.category}
                  onChange={(e) =>
                    setEditedQuestion({ ...editedQuestion, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Mathematics, Science..."
                />
              </div>
            </div>

            {/* Question Type */}
            {editedQuestion.type && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Question Type
                </label>
                <select
                  value={editedQuestion.type}
                  onChange={(e) =>
                    setEditedQuestion({
                      ...editedQuestion,
                      type: e.target.value as 'multiple-choice' | 'true-false' | 'scenario',
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="multiple-choice">Multiple Choice</option>
                  <option value="true-false">True/False</option>
                  <option value="scenario">Scenario</option>
                </select>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Save className="w-5 h-5" />
              Save Changes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
