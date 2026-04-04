'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileJson, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Question, QuestionSet } from '@/lib/types';

interface JsonImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (questionSet: QuestionSet) => void;
  existingIds: string[];
}

function validateQuestions(data: any[]): { valid: Question[]; errors: string[] } {
  const errors: string[] = [];
  const valid: Question[] = [];

  if (!Array.isArray(data)) {
    return { valid: [], errors: ['File does not contain a JSON array'] };
  }

  for (let i = 0; i < data.length; i++) {
    const q = data[i];
    const idx = i + 1;

    if (!q.question || typeof q.question !== 'string') {
      errors.push(`Q${idx}: Missing or invalid "question" field`);
      continue;
    }
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push(`Q${idx}: Missing or invalid "options" (need at least 2)`);
      continue;
    }
    if (!q.correctAnswer || typeof q.correctAnswer !== 'string') {
      errors.push(`Q${idx}: Missing or invalid "correctAnswer" field`);
      continue;
    }

    // Normalize the question
    valid.push({
      id: q.id ?? i + 1,
      question: q.question,
      options: q.options.map((opt: any, oi: number) => ({
        id: opt.id || String.fromCharCode(65 + oi),
        text: opt.text || String(opt),
      })),
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
      category: q.category || 'Imported',
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
      type: q.type || 'multiple-choice',
    });
  }

  return { valid, errors: errors.slice(0, 5) }; // Show first 5 errors max
}

function buildQuestionSet(
  questions: Question[],
  title: string,
  subject: string,
  description: string,
  fileName: string
): QuestionSet {
  const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
  const questionTypes: Record<string, number> = { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 };

  for (const q of questions) {
    if (q.difficulty in difficultyDistribution) {
      difficultyDistribution[q.difficulty as keyof typeof difficultyDistribution]++;
    }
    const qType = q.type || 'multiple-choice';
    if (qType in questionTypes) {
      questionTypes[qType]++;
    } else {
      questionTypes['multiple-choice']++;
    }
  }

  const topics = [...new Set(questions.map(q => q.category).filter(Boolean))];

  return {
    id: `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    description,
    subject,
    questions,
    metadata: {
      totalQuestions: questions.length,
      difficultyDistribution,
      questionTypes: questionTypes as any,
      topics: topics.length > 0 ? topics : [subject],
      processingMode: 'extracted',
      sourceInfo: { fileName },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    sourceType: 'upload',
  };
}

export default function JsonImportDialog({ isOpen, onClose, onImport, existingIds }: JsonImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [step, setStep] = useState<'upload' | 'configure'>('upload');

  // File state
  const [fileName, setFileName] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  // Config state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const reset = () => {
    setStep('upload');
    setFileName('');
    setParsedQuestions([]);
    setParseErrors([]);
    setTitle('');
    setSubject('');
    setDescription('');
    setDragOver(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setParseErrors(['Only .json files are supported']);
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target?.result as string);

        // Handle both array format and { questions: [...] } format
        const questionsArray = Array.isArray(raw) ? raw : raw.questions;
        if (!questionsArray) {
          setParseErrors(['JSON must be an array of questions or an object with a "questions" field']);
          return;
        }

        const { valid, errors } = validateQuestions(questionsArray);

        if (valid.length === 0) {
          setParseErrors(['No valid questions found', ...errors]);
          return;
        }

        setParsedQuestions(valid);
        setParseErrors(errors);

        // Auto-fill title from filename
        const baseName = file.name.replace(/\.json$/i, '').replace(/[-_]/g, ' ');
        setTitle(baseName.charAt(0).toUpperCase() + baseName.slice(1));

        // Auto-detect subject from categories
        const categories = [...new Set(valid.map(q => q.category).filter(Boolean))];
        if (categories.length > 0) {
          setSubject(categories[0]);
        }

        setDescription(`${valid.length} questions imported from ${file.name}`);
        setStep('configure');
      } catch (err) {
        setParseErrors(['Invalid JSON format: ' + (err as Error).message]);
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = () => {
    if (!title.trim() || parsedQuestions.length === 0) return;

    const questionSet = buildQuestionSet(
      parsedQuestions,
      title.trim(),
      subject.trim() || 'General',
      description.trim(),
      fileName
    );

    onImport(questionSet);
    handleClose();
  };

  // Difficulty stats
  const diffStats = parsedQuestions.reduce(
    (acc, q) => {
      acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <FileJson className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {step === 'upload' ? 'Import JSON' : 'Configure Import'}
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5">
              {step === 'upload' && (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition ${
                      dragOver
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Upload className={`w-10 h-10 mx-auto mb-3 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <p className="text-gray-700 dark:text-gray-300 font-medium">
                      {dragOver ? 'Drop JSON file here' : 'Drag & drop a JSON file here'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      or click to browse
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Format Info */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expected format:</p>
                    <pre className="text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
{`[
  {
    "question": "...",
    "options": [{"id":"A","text":"..."}],
    "correctAnswer": "A",
    "explanation": "...",
    "difficulty": "medium"
  }
]`}
                    </pre>
                  </div>

                  {/* Parse Errors */}
                  {parseErrors.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-medium text-red-700 dark:text-red-300">Import Error</span>
                      </div>
                      {parseErrors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                </>
              )}

              {step === 'configure' && (
                <>
                  {/* File Summary */}
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-5 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        {parsedQuestions.length} questions parsed from {fileName}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {diffStats.easy && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-800/40 text-green-700 dark:text-green-300">
                            {diffStats.easy} easy
                          </span>
                        )}
                        {diffStats.medium && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-800/40 text-yellow-700 dark:text-yellow-300">
                            {diffStats.medium} medium
                          </span>
                        )}
                        {diffStats.hard && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-800/40 text-red-700 dark:text-red-300">
                            {diffStats.hard} hard
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Validation Warnings */}
                  {parseErrors.length > 0 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg mb-5">
                      <p className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
                        {parseErrors.length} question(s) skipped:
                      </p>
                      {parseErrors.map((err, i) => (
                        <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400">{err}</p>
                      ))}
                    </div>
                  )}

                  {/* Title */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g., AWS AIF-C01 Batch 2"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Subject */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., AWS - AIF-C01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="Brief description of this question set..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            {step === 'configure' && (
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-b-2xl">
                <button
                  onClick={() => { setStep('upload'); setParseErrors([]); setParsedQuestions([]); }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  disabled={!title.trim()}
                  className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import {parsedQuestions.length} Questions
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
