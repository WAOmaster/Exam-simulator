'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, CheckCircle, AlertCircle, ArrowLeft, Library, Loader2 } from 'lucide-react';
import { useExamStore } from '@/lib/store';
import { Question, QuestionSet } from '@/lib/types';

interface BatchConfig {
  file: string;
  id: string;
  title: string;
  description: string;
  idRange: string;
}

const BATCH_CONFIGS: BatchConfig[] = [
  {
    file: '/aws-aif-c01-batch-2.json',
    id: 'aws-aif-c01-batch-2',
    title: 'AWS AIF-C01 - Batch 2 (Q67-Q132)',
    description: 'AWS Certified AI Practitioner questions 67-132. Covers prompt engineering risks, generative AI, ML model training, and AWS AI services.',
    idRange: '67-132',
  },
  {
    file: '/aws-aif-c01-batch-3.json',
    id: 'aws-aif-c01-batch-3',
    title: 'AWS AIF-C01 - Batch 3 (Q133-Q198)',
    description: 'AWS Certified AI Practitioner questions 133-198. Covers responsible AI, fairness, explainability, Amazon Bedrock, and SageMaker.',
    idRange: '133-198',
  },
  {
    file: '/aws-aif-c01-batch-4.json',
    id: 'aws-aif-c01-batch-4',
    title: 'AWS AIF-C01 - Batch 4 (Q199-Q264)',
    description: 'AWS Certified AI Practitioner questions 199-264. Covers ML classification, NLP, computer vision, and AI deployment patterns.',
    idRange: '199-264',
  },
];

function buildQuestionSet(questions: Question[], config: BatchConfig): QuestionSet {
  const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
  const questionTypes: Record<string, number> = { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 };

  for (const q of questions) {
    if (q.difficulty in difficultyDistribution) {
      difficultyDistribution[q.difficulty as keyof typeof difficultyDistribution]++;
    }
    const qType = q.type || 'multiple-choice';
    if (qType in questionTypes) {
      questionTypes[qType]++;
    }
  }

  // Collect unique categories/topics
  const topics = [...new Set(questions.map(q => q.category).filter(Boolean))];

  return {
    id: config.id,
    title: config.title,
    description: config.description,
    subject: 'AWS - AIF-C01',
    questions,
    metadata: {
      totalQuestions: questions.length,
      difficultyDistribution,
      questionTypes: questionTypes as any,
      topics: topics.length > 0 ? topics : ['AWS AI Services', 'Machine Learning', 'Generative AI'],
      processingMode: 'extracted',
      sourceInfo: {
        fileName: config.file.replace('/', ''),
      },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isPublic: false,
    sourceType: 'upload',
  };
}

export default function ImportPage() {
  const router = useRouter();
  const { addQuestionSet, availableQuestionSets } = useExamStore();

  const [importing, setImporting] = useState<Record<string, boolean>>({});
  const [imported, setImported] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Check which sets are already imported
  const isAlreadyImported = (id: string) => {
    return availableQuestionSets.some(s => s.id === id);
  };

  const handleImport = async (config: BatchConfig) => {
    if (isAlreadyImported(config.id) || importing[config.id]) return;

    setImporting(prev => ({ ...prev, [config.id]: true }));
    setErrors(prev => ({ ...prev, [config.id]: '' }));

    try {
      const res = await fetch(config.file);
      if (!res.ok) throw new Error(`Failed to fetch ${config.file}`);
      const questions: Question[] = await res.json();

      const questionSet = buildQuestionSet(questions, config);
      addQuestionSet(questionSet);

      setImported(prev => ({ ...prev, [config.id]: true }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [config.id]: err.message }));
    } finally {
      setImporting(prev => ({ ...prev, [config.id]: false }));
    }
  };

  const handleImportAll = async () => {
    for (const config of BATCH_CONFIGS) {
      if (!isAlreadyImported(config.id) && !importing[config.id]) {
        await handleImport(config);
      }
    }
  };

  const allImported = BATCH_CONFIGS.every(c => isAlreadyImported(c.id) || imported[c.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-white/60 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Question Sets</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">AWS AIF-C01 - AI Practitioner</p>
          </div>
        </div>

        {/* Import All Button */}
        {!allImported && (
          <motion.button
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleImportAll}
            className="w-full mb-6 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:from-blue-700 hover:to-purple-700 transition flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Import All 3 Batches
          </motion.button>
        )}

        {/* Success Banner */}
        {allImported && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 flex items-center gap-3"
          >
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">All sets imported!</p>
              <p className="text-sm text-green-600 dark:text-green-400">198 questions added to your library.</p>
            </div>
            <button
              onClick={() => router.push('/library')}
              className="ml-auto px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition flex items-center gap-2"
            >
              <Library className="w-4 h-4" />
              Go to Library
            </button>
          </motion.div>
        )}

        {/* Batch Cards */}
        <div className="space-y-4">
          {BATCH_CONFIGS.map((config, index) => {
            const alreadyExists = isAlreadyImported(config.id);
            const isImporting = importing[config.id];
            const justImported = imported[config.id];
            const error = errors[config.id];
            const done = alreadyExists || justImported;

            return (
              <motion.div
                key={config.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-5 rounded-xl border transition ${
                  done
                    ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                    : 'bg-white/70 dark:bg-white/5 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{config.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{config.description}</p>
                    <div className="flex gap-3 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        66 questions
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                        Questions {config.idRange}
                      </span>
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    {done ? (
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-5 h-5" />
                        <span className="text-sm font-medium">{alreadyExists && !justImported ? 'Already in library' : 'Imported'}</span>
                      </div>
                    ) : isImporting ? (
                      <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Importing...</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleImport(config)}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
                      >
                        Import
                      </button>
                    )}
                  </div>
                </div>

                {error && (
                  <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
