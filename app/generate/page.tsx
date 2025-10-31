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

// Helper function to convert InputTab to QuestionSet sourceType
const getSourceType = (tab: InputTab): 'upload' | 'url' | 'search' | 'manual' | 'pre-built' => {
  return tab === 'text' ? 'manual' : tab;
};

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
  const [processingMode, setProcessingMode] = useState<'extracted' | 'generated' | null>(null);
  const [contentAnalysis, setContentAnalysis] = useState<{
    hasQuestions: boolean;
    questionCount: number;
    preview: string;
  } | null>(null);
  const [progressMessage, setProgressMessage] = useState<string>('');

  const tabs = [
    { id: 'upload' as InputTab, label: 'Upload File', icon: Upload },
    { id: 'url' as InputTab, label: 'Fetch URL', icon: LinkIcon },
    { id: 'search' as InputTab, label: 'Search Knowledge', icon: Search },
    { id: 'text' as InputTab, label: 'Paste Text', icon: FileText },
  ];

  // Analyze content to detect if it contains questions
  const analyzeContent = (content: string) => {
    const questionPatterns = [
      /\d+\.\s*[A-Z]/gi,  // "1. What is..."
      /Question\s*\d+/gi,  // "Question 1"
      /Q\d+[\.:]/gi,       // "Q1:" or "Q1."
      /^\s*[A-D]\.\s/gm,   // "A. option" (answer options)
      /Answer:\s*[A-D]/gi, // "Answer: A"
      /Correct\s*Answer/gi, // "Correct Answer"
      /\?\s*$/gm,          // Lines ending with ?
    ];

    let patternMatches = 0;
    let estimatedQuestions = 0;

    for (const pattern of questionPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patternMatches++;
        if (pattern.source.includes('\\d+\\.\\s*') || pattern.source.includes('Question')) {
          estimatedQuestions = Math.max(estimatedQuestions, matches.length);
        }
      }
    }

    const hasQuestions = patternMatches >= 3;
    const preview = content.substring(0, 200) + (content.length > 200 ? '...' : '');

    // Try to extract subject from content if questions detected
    let detectedSubject = '';
    if (hasQuestions) {
      // Look for common subject indicators
      const subjectPatterns = [
        /(?:Topic|Subject|Course|Exam)[\s:]+([A-Z][A-Za-z\s\d\-]+)(?:\n|Question|\d)/i,
        /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*)\s+(?:Questions|Exam|Quiz|Test)/i,
        /^([A-Z][A-Za-z\s\d\-]+?)(?:Exam|Questions|Quiz)/im,
      ];

      for (const pattern of subjectPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          detectedSubject = match[1].trim();
          break;
        }
      }

      // Auto-fill subject if detected and current subject is empty
      if (detectedSubject && !config.subject.trim()) {
        setConfig(prev => ({ ...prev, subject: detectedSubject }));
      }
    }

    setContentAnalysis({
      hasQuestions,
      questionCount: hasQuestions ? estimatedQuestions : 0,
      preview,
    });
  };

  const handleFileProcessed = (content: string, fileName: string) => {
    setContentSource({
      type: 'file',
      content,
      metadata: { fileName },
    });
    analyzeContent(content);
    setError('');
  };

  const handleURLContentFetched = (content: string, urls: string[]) => {
    setContentSource({
      type: 'url',
      content,
      metadata: { url: urls.join(', ') },
    });
    analyzeContent(content);
    setError('');
  };

  const handleGenerateQuestions = async () => {
    // Validate inputs - subject required only for generation mode, not extraction
    const isExtractionMode = contentAnalysis?.hasQuestions;

    if (!isExtractionMode && !config.subject.trim()) {
      setError('Please enter a subject/topic');
      return;
    }

    // For extraction mode, use a generic subject if none detected
    if (isExtractionMode && !config.subject.trim()) {
      setConfig(prev => ({ ...prev, subject: 'General' }));
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
    setProgressMessage('');

    try {
      // Show initial progress message
      const isExtractionModeFinal = contentAnalysis?.hasQuestions;
      const estimatedQuestions = contentAnalysis?.questionCount || config.numberOfQuestions;

      if (isExtractionModeFinal && estimatedQuestions > 25) {
        const numBatches = Math.ceil(estimatedQuestions / 25);
        setProgressMessage(`Processing ${estimatedQuestions} questions in ${numBatches} batches...`);
      } else if (isExtractionModeFinal) {
        setProgressMessage(`Extracting ${estimatedQuestions} questions...`);
      } else {
        setProgressMessage(`Generating ${config.numberOfQuestions} questions...`);
      }

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
      setProcessingMode(data.metadata?.processingMode || 'generated');
      setProgressMessage(''); // Clear progress on success
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
      setProgressMessage(''); // Clear progress on error
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
      sourceType: getSourceType(activeTab),
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
                        onChange={(e) => {
                          setManualText(e.target.value);
                          if (e.target.value.trim().length > 100) {
                            analyzeContent(e.target.value);
                          }
                        }}
                        onBlur={(e) => {
                          if (e.target.value.trim().length > 0) {
                            analyzeContent(e.target.value);
                          }
                        }}
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

              {/* Content Analysis Display */}
              {contentAnalysis && (activeTab === 'upload' || activeTab === 'url' || activeTab === 'text') && (
                <div className={`mt-6 p-4 rounded-lg border-2 ${
                  contentAnalysis.hasQuestions
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                }`}>
                  <div className="flex items-start gap-3">
                    {contentAnalysis.hasQuestions ? (
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <FileText className="w-5 h-5 text-green-700 dark:text-green-300" />
                      </div>
                    ) : (
                      <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg">
                        <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className={`font-semibold mb-1 ${
                        contentAnalysis.hasQuestions
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-blue-900 dark:text-blue-100'
                      }`}>
                        {contentAnalysis.hasQuestions
                          ? `✨ Existing Questions Detected (~${contentAnalysis.questionCount} questions)`
                          : '🤖 No Questions Found - Will Generate New Ones'
                        }
                      </h3>
                      <p className={`text-sm mb-2 ${
                        contentAnalysis.hasQuestions
                          ? 'text-green-800 dark:text-green-200'
                          : 'text-blue-800 dark:text-blue-200'
                      }`}>
                        {contentAnalysis.hasQuestions
                          ? 'Your content contains existing questions. AI will extract them and fill in any missing details (options, explanations, etc.)'
                          : 'Your content will be analyzed and AI will create brand new questions based on the material.'
                        }
                      </p>
                      <details className="text-sm">
                        <summary className={`cursor-pointer font-medium ${
                          contentAnalysis.hasQuestions
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          Content Preview
                        </summary>
                        <p className={`mt-2 p-3 rounded border font-mono text-xs ${
                          contentAnalysis.hasQuestions
                            ? 'bg-white dark:bg-green-950 border-green-200 dark:border-green-800 text-gray-700 dark:text-gray-300'
                            : 'bg-white dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-gray-700 dark:text-gray-300'
                        }`}>
                          {contentAnalysis.preview}
                        </p>
                      </details>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Generation Controls */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                2. Configure Generation
              </h2>
              <GenerationControls
                onConfigChange={setConfig}
                isExtractionMode={contentAnalysis?.hasQuestions}
                estimatedQuestions={contentAnalysis?.questionCount || 0}
              />
            </div>

            {/* Generate Button */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-white text-lg font-bold rounded-lg shadow-xl transition-all disabled:opacity-50 ${
                  contentAnalysis?.hasQuestions
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 dark:from-green-700 dark:to-teal-700 dark:hover:from-green-600 dark:hover:to-teal-600'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {contentAnalysis?.hasQuestions ? 'Extracting & Enhancing...' : 'Generating Questions...'}
                  </>
                ) : (
                  <>
                    {contentAnalysis?.hasQuestions ? (
                      <>
                        <FileText className="w-6 h-6" />
                        Extract & Enhance Questions
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Generate Questions
                      </>
                    )}
                  </>
                )}
              </button>
            </div>

            {/* Progress Message */}
            {progressMessage && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">{progressMessage}</p>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                  {contentAnalysis?.questionCount && contentAnalysis.questionCount > 25
                    ? 'Large question sets are processed in batches to ensure quality. This may take 30-60 seconds.'
                    : 'Processing your request...'}
                </p>
              </div>
            )}

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
                  {/* Processing Mode Indicator */}
                  {processingMode && (
                    <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      processingMode === 'extracted'
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-700'
                        : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                    }`}>
                      {processingMode === 'extracted' ? (
                        <>✨ Questions Extracted & AI Enhanced</>
                      ) : (
                        <>🤖 Questions AI Generated</>
                      )}
                    </div>
                  )}

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
            sourceType: getSourceType(activeTab),
          }}
          onSave={handleSaveQuestionSet}
        />
      )}
    </div>
  );
}
