'use client';

import { useState } from 'react';
import { Settings, HelpCircle } from 'lucide-react';
import { GenerationConfig } from '@/lib/types';

interface GenerationControlsProps {
  onConfigChange: (config: GenerationConfig) => void;
  isExtractionMode?: boolean;
  estimatedQuestions?: number;
}

const QUESTION_COUNTS = [10, 25, 50, 100];
const DIFFICULTIES = ['easy', 'medium', 'hard', 'mixed'] as const;
const QUESTION_TYPES = [
  { id: 'multiple-choice', label: 'Multiple Choice', description: '4 options (A, B, C, D)' },
  { id: 'true-false', label: 'True/False', description: '2 options (True/False)' },
  { id: 'scenario', label: 'Scenario-Based', description: 'Real-world situations' },
] as const;

export default function GenerationControls({ onConfigChange, isExtractionMode = false, estimatedQuestions = 0 }: GenerationControlsProps) {
  const [config, setConfig] = useState<GenerationConfig>({
    numberOfQuestions: 25,
    difficulty: 'mixed',
    questionTypes: ['multiple-choice'],
    subject: '',
    topicFocus: '',
  });

  const updateConfig = (updates: Partial<GenerationConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onConfigChange(newConfig);
  };

  const toggleQuestionType = (type: 'multiple-choice' | 'true-false' | 'scenario') => {
    let newTypes = [...config.questionTypes];
    if (newTypes.includes(type)) {
      newTypes = newTypes.filter(t => t !== type);
    } else {
      newTypes.push(type);
    }

    // Ensure at least one type is selected
    if (newTypes.length === 0) {
      newTypes = ['multiple-choice'];
    }

    updateConfig({ questionTypes: newTypes });
  };

  return (
    <div className="space-y-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
          Generation Settings
        </h3>
      </div>

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Subject / Topic {!isExtractionMode && <span className="text-red-500">*</span>}
          {isExtractionMode && <span className="text-sm text-gray-500 dark:text-gray-400">(optional - auto-detected)</span>}
        </label>
        <input
          type="text"
          value={config.subject}
          onChange={(e) => updateConfig({ subject: e.target.value })}
          placeholder={isExtractionMode ? "Auto-detected from content" : "e.g., Oracle Cloud Infrastructure, AWS, Programming, etc."}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required={!isExtractionMode}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {isExtractionMode
            ? 'Subject will be extracted from your questions or you can override it here'
            : 'Specify the main subject area for the questions'}
        </p>
      </div>

      {/* Number of Questions - Hide in extraction mode */}
      {!isExtractionMode && (
      <div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Number of Questions
        </label>
        <div className="grid grid-cols-4 gap-3">
          {QUESTION_COUNTS.map((count) => (
            <button
              key={count}
              onClick={() => updateConfig({ numberOfQuestions: count })}
              className={`px-4 py-3 rounded-lg font-medium transition-all ${
                config.numberOfQuestions === count
                  ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {count}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Difficulty Level
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty}
              onClick={() => updateConfig({ difficulty })}
              className={`px-4 py-3 rounded-lg font-medium capitalize transition-all ${
                config.difficulty === difficulty
                  ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {difficulty}
            </button>
          ))}
        </div>
      </div>

      {/* Question Types */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Question Types
          </label>
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400 cursor-help" />
            <div className="invisible group-hover:visible absolute left-0 top-6 w-64 bg-gray-800 text-white text-xs rounded-lg p-3 z-10 shadow-lg">
              Select one or more question types. Multiple types will be mixed in the generated set.
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {QUESTION_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => toggleQuestionType(type.id)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                config.questionTypes.includes(type.id)
                  ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className={`font-semibold ${
                    config.questionTypes.includes(type.id)
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-gray-800 dark:text-gray-200'
                  }`}>
                    {type.label}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {type.description}
                  </p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  config.questionTypes.includes(type.id)
                    ? 'border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {config.questionTypes.includes(type.id) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Topic Focus (Optional) - Hide in extraction mode */}
      {!isExtractionMode && (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Topic Focus <span className="text-gray-400 text-xs">(Optional)</span>
        </label>
        <textarea
          value={config.topicFocus}
          onChange={(e) => updateConfig({ topicFocus: e.target.value })}
          placeholder="e.g., Focus on networking concepts, compute services, or specific areas you want to emphasize..."
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Specify particular topics or areas to emphasize in the questions
        </p>
      </div>
      )}
      </div>
      )}

      {/* Extraction Mode Summary */}
      {isExtractionMode ? (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
            Extraction Summary
          </p>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
            <li>• ~{estimatedQuestions} questions detected</li>
            <li>• AI will extract and enhance</li>
            <li>• Missing options will be generated</li>
            <li>• Explanations will be added/enhanced</li>
            {config.subject && <li>• Subject: {config.subject}</li>}
          </ul>
        </div>
      ) : (
        /* Generation Summary */
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Generation Summary
          </p>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• {config.numberOfQuestions} questions</li>
            <li>• Difficulty: {config.difficulty}</li>
            <li>• Types: {config.questionTypes.join(', ')}</li>
            {config.subject && <li>• Subject: {config.subject}</li>}
            {config.topicFocus && <li>• Focus: {config.topicFocus.substring(0, 50)}{config.topicFocus.length > 50 ? '...' : ''}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
