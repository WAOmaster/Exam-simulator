'use client';

import { QuestionSet } from '@/lib/types';
import { Calendar, FileText, TrendingUp, Play, Trash2, Globe, Lock } from 'lucide-react';

interface QuestionSetCardProps {
  questionSet: QuestionSet;
  onStart: (questionSet: QuestionSet) => void;
  onDelete?: (questionSet: QuestionSet) => void;
}

export default function QuestionSetCard({ questionSet, onStart, onDelete }: QuestionSetCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getDifficultyColor = (count: number, total: number) => {
    if (count === 0) return 'bg-gray-200 dark:bg-gray-700';
    const percentage = (count / total) * 100;
    if (percentage >= 60) return 'bg-red-500';
    if (percentage >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all hover:border-blue-500 dark:hover:border-blue-400">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {questionSet.title}
            </h3>
            {questionSet.isPublic ? (
              <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400" />
            )}
          </div>
          {questionSet.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {questionSet.description}
            </p>
          )}
        </div>
      </div>

      {/* Subject Badge */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-full">
          {questionSet.subject}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Questions</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {questionSet.metadata.totalQuestions}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatDate(questionSet.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Difficulty Distribution */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Difficulty Distribution
          </p>
        </div>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
          <div
            className="bg-green-500"
            style={{
              width: `${(questionSet.metadata.difficultyDistribution.easy / questionSet.metadata.totalQuestions) * 100}%`,
            }}
            title={`Easy: ${questionSet.metadata.difficultyDistribution.easy}`}
          />
          <div
            className="bg-yellow-500"
            style={{
              width: `${(questionSet.metadata.difficultyDistribution.medium / questionSet.metadata.totalQuestions) * 100}%`,
            }}
            title={`Medium: ${questionSet.metadata.difficultyDistribution.medium}`}
          />
          <div
            className="bg-red-500"
            style={{
              width: `${(questionSet.metadata.difficultyDistribution.hard / questionSet.metadata.totalQuestions) * 100}%`,
            }}
            title={`Hard: ${questionSet.metadata.difficultyDistribution.hard}`}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
          <span>Easy: {questionSet.metadata.difficultyDistribution.easy}</span>
          <span>Medium: {questionSet.metadata.difficultyDistribution.medium}</span>
          <span>Hard: {questionSet.metadata.difficultyDistribution.hard}</span>
        </div>
      </div>

      {/* Topics */}
      {questionSet.metadata.topics && questionSet.metadata.topics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Topics</p>
          <div className="flex flex-wrap gap-1">
            {questionSet.metadata.topics.slice(0, 3).map((topic, index) => (
              <span
                key={index}
                className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {topic}
              </span>
            ))}
            {questionSet.metadata.topics.length > 3 && (
              <span className="text-xs px-2 py-1 text-gray-500 dark:text-gray-400">
                +{questionSet.metadata.topics.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onStart(questionSet)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <Play className="w-4 h-4" />
          Start Exam
        </button>

        {onDelete && (
          <button
            onClick={() => onDelete(questionSet)}
            className="px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
