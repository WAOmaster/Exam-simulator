'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Search, FileText, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import URLInput from '@/components/URLInput';
import GenerationControls from '@/components/GenerationControls';
import QuestionPreview from '@/components/QuestionPreview';
import SaveDialog from '@/components/SaveDialog';
import { useExamStore } from '@/lib/store';
import { GenerationConfig, ContentSource, Question, QuestionSet } from '@/lib/types';

type InputTab = 'upload' | 'url' | 'search' | 'text';

export default function GeneratePage() {
  const router = useRouter();
  const { addQuestionSet, resetExam, setCurrentQuestionSet, startExam } = useExamStore();

  const [activeTab, setActiveTab] = useState<InputTab>('upload');
  const [contentSource, setContentSource] = useState<ContentSource | null>(null);
  const [config, setConfig] = useState<GenerationConfig>({
    numberOfQuestions: 25,
    difficulty: 'mixed',
    questionTypes: ['multiple-choice'],
    subject: '',
    topicFocus: '',
  });
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [manualText, setManualText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const tabs = [
    { id: 'upload' as InputTab, label: 'Upload File', icon: Upload },
    { id: 'url' as InputTab, label: 'Fetch URL', icon: LinkIcon },
    { id: 'search' as InputTab, label: 'Search Knowledge', icon: Search },
    { id: 'text' as InputTab, label: 'Paste Text', icon: FileText },
  ];

  const handleFileProcessed = (content: string, fileName: string) => {
    setContentSource({
      type: 'file',
      content,
      metadata: { fileName },
    });
    setError('');
  };

  const handleURLContentFetched = (content: string, urls: string[]) => {
    setContentSource({
      type: 'url',
      content,
      metadata: { url: urls.join(', ') },
    });
    setError('');
  };

  const handleGenerateQuestions = async () => {
    // Validate inputs
    if (!config.subject.trim()) {
      setError('Please enter a subject/topic');
      return;
    }

    let source: ContentSource;

    if (activeTab === 'search') {
      if (!searchQuery.trim()) {
        setError('Please enter a search query');
        return;
      }
      source = {
        type: 'search',
        content: searchQuery,
        metadata: { searchQuery },
      };
    } else if (activeTab === 'text') {
      if (!manualText.trim()) {
        setError('Please enter some text content');
        return;
      }
      source = {
        type: 'text',
        content: manualText,
      };
    } else {
      if (!contentSource) {
        setError(activeTab === 'upload' ? 'Please upload a file first' : 'Please fetch URL content first');
        return;
      }
      source = contentSource;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedQuestions([]);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, config }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      setGeneratedQuestions(data.questions);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuestionSet = async (questionSet: QuestionSet, makePublic: boolean) => {
    try {
      // Save to library via API
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionSet),
      });

      if (!response.ok) {
        throw new Error('Failed to save question set');
      }

      // Add to store
      addQuestionSet(questionSet);

      // Navigate to library
      router.push('/library');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save question set');
    }
  };

  const handleStartExam = () => {
    if (generatedQuestions.length === 0) return;

    // Create temporary question set in store
    const tempSet: QuestionSet = {
      id: `temp-${Date.now()}`,
      title: 'Quick Practice',
      description: 'Generated questions for quick practice',
      subject: config.subject,
      questions: generatedQuestions,
      metadata: {
        totalQuestions: generatedQuestions.length,
        difficultyDistribution: {
          easy: generatedQuestions.filter(q => q.difficulty === 'easy').length,
          medium: generatedQuestions.filter(q => q.difficulty === 'medium').length,
          hard: generatedQuestions.filter(q => q.difficulty === 'hard').length,
        },
        questionTypes: {
          'multiple-choice': generatedQuestions.filter(q => q.type === 'multiple-choice').length,
          'true-false': generatedQuestions.filter(q => q.type === 'true-false').length,
          'scenario': generatedQuestions.filter(q => q.type === 'scenario').length,
        },
        topics: [config.subject],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
      sourceType: activeTab === 'text' ? 'manual' : activeTab,
    };

    // Add the question set to the store
    addQuestionSet(tempSet);

    // Reset any previous exam state
    resetExam();

    // Set this as the current question set
    setCurrentQuestionSet(tempSet.id);

    // Start the exam in practice mode
    startExam(60, 'practice', false);

    // Navigate to practice page
    router.push('/practice');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Generate Questions
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Create custom exam questions from your content using AI
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Input & Controls */}
          <div className="lg:col-span-2 space-y-6">
            {/* Input Method Tabs */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                1. Choose Input Method
              </h2>

              {/* Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                        activeTab === tab.id
                          ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div>
                {activeTab === 'upload' && (
                  <FileUploader onFileProcessed={handleFileProcessed} />
                )}

                {activeTab === 'url' && (
                  <URLInput onContentFetched={handleURLContentFetched} />
                )}

                {activeTab === 'search' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Search Query
                      </label>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="e.g., AWS Lambda functions and best practices"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        The AI will search for information and generate questions based on the latest knowledge
                      </p>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>Tip:</strong> Be specific in your search query. Include key topics, concepts, or areas you want the questions to focus on.
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === 'text' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Paste Your Content
                      </label>
                      <textarea
                        value={manualText}
                        onChange={(e) => setManualText(e.target.value)}
                        placeholder="Paste your study material, documentation, or any text content here..."
                        rows={12}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        Character count: {manualText.length}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generation Controls */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Configure Generation
              </h2>
              <GenerationControls onConfigChange={setConfig} />
            </div>

            {/* Generate Button */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white text-lg font-bold rounded-lg shadow-xl transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    Generating Questions...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Generate Questions
                  </>
                )}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                3. Review & Save
              </h2>

              {generatedQuestions.length > 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                  <QuestionPreview questions={generatedQuestions} />

                  <div className="flex flex-col gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setShowSaveDialog(true)}
                      className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                    >
                      Save to Library
                    </button>

                    <button
                      onClick={handleStartExam}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium rounded-lg transition-colors"
                    >
                      Start Practice Now
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                  <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Generated questions will appear here
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Dialog */}
      {showSaveDialog && generatedQuestions.length > 0 && (
        <SaveDialog
          isOpen={showSaveDialog}
          onClose={() => setShowSaveDialog(false)}
          questionSet={{
            id: '',
            title: '',
            description: '',
            subject: config.subject,
            questions: generatedQuestions,
            metadata: {
              totalQuestions: generatedQuestions.length,
              difficultyDistribution: {
                easy: generatedQuestions.filter(q => q.difficulty === 'easy').length,
                medium: generatedQuestions.filter(q => q.difficulty === 'medium').length,
                hard: generatedQuestions.filter(q => q.difficulty === 'hard').length,
              },
              questionTypes: {
                'multiple-choice': generatedQuestions.filter(q => q.type === 'multiple-choice').length,
                'true-false': generatedQuestions.filter(q => q.type === 'true-false').length,
                'scenario': generatedQuestions.filter(q => q.type === 'scenario').length,
              },
              topics: [config.subject],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isPublic: false,
            sourceType: activeTab === 'text' ? 'manual' : activeTab,
          }}
          onSave={handleSaveQuestionSet}
        />
      )}
    </div>
  );
}
