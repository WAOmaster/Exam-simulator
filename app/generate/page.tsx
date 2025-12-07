'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Upload, Link as LinkIcon, Search, FileText, Sparkles, Loader2, ArrowLeft, FileJson } from 'lucide-react';
import FileUploader from '@/components/FileUploader';
import URLInput from '@/components/URLInput';
import GenerationControls from '@/components/GenerationControls';
import QuestionPreview from '@/components/QuestionPreview';
import SaveDialog from '@/components/SaveDialog';
import ProgressTracker, { ProgressStage } from '@/components/ProgressTracker';
import { useExamStore } from '@/lib/store';
import { GenerationConfig, ContentSource, Question, QuestionSet } from '@/lib/types';

type InputTab = 'upload' | 'url' | 'search' | 'text' | 'json';

// Helper function to edit a question in the generated questions array
const editQuestionInArray = (questions: Question[], questionId: number, updatedQuestion: Question): Question[] => {
  return questions.map((q) => (q.id === questionId ? { ...updatedQuestion, id: questionId } : q));
};

// Helper function to convert InputTab to QuestionSet sourceType
const getSourceType = (tab: InputTab): 'upload' | 'url' | 'search' | 'manual' | 'pre-built' => {
  if (tab === 'text') return 'manual';
  if (tab === 'json') return 'upload';
  return tab;
};

// Helper function to generate smart title based on configuration
const generateTitle = (config: GenerationConfig, activeTab: InputTab, searchQuery?: string): string => {
  const subject = config.subject || 'General';

  if (activeTab === 'search' && searchQuery) {
    // For search, use the search query as the basis
    return `${searchQuery} - Practice Questions`;
  }

  if (config.topicFocus) {
    // If there's a topic focus, use it
    return `${config.topicFocus} - ${subject} Questions`;
  }

  // Default: subject-based title
  return `${subject} Practice Questions`;
};

// Helper function to generate smart description
const generateDescription = (config: GenerationConfig, activeTab: InputTab, questionCount: number, searchQuery?: string): string => {
  const parts: string[] = [];

  // Add question count
  parts.push(`${questionCount} ${config.difficulty === 'mixed' ? 'mixed difficulty' : config.difficulty} questions`);

  // Add subject
  if (config.subject) {
    parts.push(`covering ${config.subject}`);
  }

  // Add source-specific details
  if (activeTab === 'search' && searchQuery) {
    parts.push(`generated from search: "${searchQuery}"`);
  } else if (activeTab === 'upload') {
    parts.push('extracted from uploaded file');
  } else if (activeTab === 'url') {
    parts.push('generated from web content');
  } else if (activeTab === 'text') {
    parts.push('generated from provided text');
  } else if (activeTab === 'json') {
    parts.push('enhanced from bulk JSON upload');
  }

  // Add topic focus if present
  if (config.topicFocus) {
    parts.push(`with focus on ${config.topicFocus}`);
  }

  // Add question types
  if (config.questionTypes.length > 0) {
    const types = config.questionTypes.join(', ').replace('multiple-choice', 'multiple choice').replace('true-false', 'true/false');
    parts.push(`(${types})`);
  }

  return parts.join(' ');
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
  const [showProgress, setShowProgress] = useState(false);
  const [progressStages, setProgressStages] = useState<ProgressStage[]>([]);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const [jsonQuestions, setJsonQuestions] = useState<Question[]>([]);
  const [jsonFileName, setJsonFileName] = useState<string>('');

  const tabs = [
    { id: 'upload' as InputTab, label: 'Upload File', icon: Upload },
    { id: 'url' as InputTab, label: 'Fetch URL', icon: LinkIcon },
    { id: 'search' as InputTab, label: 'Search Knowledge', icon: Search },
    { id: 'text' as InputTab, label: 'Paste Text', icon: FileText },
    { id: 'json' as InputTab, label: 'Upload JSON', icon: FileJson },
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

  // Initialize progress stages based on generation type
  const initializeProgressStages = (isExtraction: boolean, estimatedQuestions: number, isBatch: boolean): ProgressStage[] => {
    if (isExtraction && isBatch) {
      const numBatches = Math.ceil(estimatedQuestions / 15);
      return [
        { label: 'Analyzing content structure', status: 'pending' },
        { label: `Splitting into ${numBatches} batches`, status: 'pending' },
        { label: `Processing batch operations (${numBatches} batches)`, status: 'pending' },
        { label: 'Combining results', status: 'pending' },
        { label: 'Validating questions', status: 'pending' },
        { label: 'Finalizing', status: 'pending' },
      ];
    } else if (isExtraction) {
      return [
        { label: 'Analyzing content structure', status: 'pending' },
        { label: 'Detecting question patterns', status: 'pending' },
        { label: 'Extracting questions', status: 'pending' },
        { label: 'Completing missing information', status: 'pending' },
        { label: 'Generating explanations', status: 'pending' },
        { label: 'Finalizing', status: 'pending' },
      ];
    } else {
      return [
        { label: 'Analyzing content', status: 'pending' },
        { label: 'Identifying key concepts', status: 'pending' },
        { label: 'Generating questions', status: 'pending' },
        { label: 'Creating answer options', status: 'pending' },
        { label: 'Writing explanations', status: 'pending' },
        { label: 'Finalizing', status: 'pending' },
      ];
    }
  };

  // Simulate progress through stages
  const simulateProgress = async (stages: ProgressStage[], totalDuration: number) => {
    const stageDelay = totalDuration / stages.length;

    for (let i = 0; i < stages.length; i++) {
      setCurrentStageIndex(i);
      setProgressStages(prev => prev.map((stage, idx) => ({
        ...stage,
        status: idx === i ? 'in_progress' : idx < i ? 'completed' : 'pending',
      })));

      await new Promise(resolve => setTimeout(resolve, stageDelay));
    }
  };

  const handleFileProcessed = (content: string, fileName: string, metadata?: any) => {
    // Check if this is a JSON file with pre-parsed questions
    if (metadata?.questions && metadata?.cleaningMetadata) {
      // JSON file with questions - directly set as generated questions
      setGeneratedQuestions(metadata.questions);
      setContentSource({
        type: 'file',
        content,
        metadata: {
          fileName,
          isJSON: true,
          cleaningMetadata: metadata.cleaningMetadata,
        },
      });
      setActiveTab('json');
      setIsGenerating(false);
      setError('');

      // Auto-detect subject from questions if not set
      if (metadata.questions.length > 0) {
        const firstCategory = metadata.questions[0].category || '';
        if (firstCategory && !config.subject) {
          setConfig({ ...config, subject: firstCategory });
        }
      }
    } else {
      // Regular file upload (DOCX, TXT, etc.)
      setContentSource({
        type: 'file',
        content,
        metadata: { fileName },
      });
      analyzeContent(content);
      setError('');
    }
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

  const handleJSONFile = async (file: File) => {
    try {
      setError('');
      setJsonQuestions([]);

      const text = await file.text();
      let parsed: any;

      try {
        parsed = JSON.parse(text);
      } catch (parseError) {
        throw new Error('Invalid JSON file. Please ensure the file contains valid JSON.');
      }

      // Validate structure - expect array of questions
      let questions: Question[];

      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else {
        throw new Error('Invalid format. Expected an array of questions or an object with a "questions" array.');
      }

      if (questions.length === 0) {
        throw new Error('No questions found in JSON file.');
      }

      if (questions.length > 500) {
        throw new Error('Maximum 500 questions allowed. Please split into smaller files.');
      }

      // Validate each question has required fields
      const invalidQuestions: number[] = [];
      questions.forEach((q, idx) => {
        // Skip correctAnswer validation for HOTSPOT and drag-and-drop questions
        const isSpecialType = q.type === 'hotspot' || q.type === 'drag-and-drop';
        const hasCorrectAnswer = isSpecialType || q.correctAnswer;

        if (!q.question || !q.options || !Array.isArray(q.options) || !hasCorrectAnswer) {
          invalidQuestions.push(idx + 1);
        }
      });

      if (invalidQuestions.length > 0) {
        throw new Error(
          `Invalid question format at positions: ${invalidQuestions.slice(0, 5).join(', ')}${
            invalidQuestions.length > 5 ? ` and ${invalidQuestions.length - 5} more` : ''
          }. Each question must have: question, options (array), and correctAnswer.`
        );
      }

      // Auto-detect subject from first question's category or set a default
      const detectedSubject = questions[0]?.category || 'General';
      if (!config.subject.trim()) {
        setConfig(prev => ({ ...prev, subject: detectedSubject }));
      }

      setJsonQuestions(questions);
      setJsonFileName(file.name);

    } catch (err: any) {
      setError(err.message || 'Failed to process JSON file');
      setJsonQuestions([]);
    }
  };

  const handleEnhanceJSONQuestions = async () => {
    if (jsonQuestions.length === 0) {
      setError('Please upload a JSON file first');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedQuestions([]);
    setShowProgress(true);
    setProgressComplete(false);
    setProgressError(false);

    try {
      // Initialize progress tracking for enhancement
      const totalQuestions = jsonQuestions.length;
      const numBatches = Math.ceil(totalQuestions / 10); // 10 questions per batch

      const stages: ProgressStage[] = [
        { label: 'Validating question structure', status: 'pending' },
        { label: `Splitting into ${numBatches} batches`, status: 'pending' },
        { label: `Enhancing questions (${numBatches} batches)`, status: 'pending' },
        { label: 'Improving explanations', status: 'pending' },
        { label: 'Assigning difficulty levels', status: 'pending' },
        { label: 'Finalizing enhancements', status: 'pending' },
      ];

      setProgressStages(stages);
      setCurrentStageIndex(0);

      // Calculate expected duration (3 seconds per batch)
      const expectedDuration = numBatches * 3000;

      // Start progress simulation
      const progressPromise = simulateProgress(stages, expectedDuration);

      // Call enhancement API
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: jsonQuestions }),
      });

      const data = await response.json();

      // Wait for progress simulation to complete
      await progressPromise;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to enhance questions');
      }

      // Mark all stages as completed
      setProgressStages(prev => prev.map(stage => ({ ...stage, status: 'completed' })));
      setCurrentStageIndex(stages.length);
      setProgressComplete(true);

      // Set enhanced questions
      setGeneratedQuestions(data.questions);
      setProcessingMode('generated');

      // Hide progress after a short delay
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Failed to enhance questions');
      setProgressError(true);
      setProgressStages(prev => prev.map((stage, idx) => ({
        ...stage,
        status: idx === currentStageIndex ? 'error' : stage.status,
        message: idx === currentStageIndex ? err.message : stage.message,
      })));

      // Hide progress after showing error
      setTimeout(() => {
        setShowProgress(false);
      }, 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEnhanceQuestions = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) {
      setError('No questions to enhance');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: generatedQuestions }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to enhance questions');
      }

      // Update generated questions with enhanced versions
      setGeneratedQuestions(data.questions);

      // Update content source metadata to remove enhancement flag
      if (contentSource?.metadata?.cleaningMetadata) {
        setContentSource({
          ...contentSource,
          metadata: {
            ...contentSource.metadata,
            cleaningMetadata: {
              ...contentSource.metadata.cleaningMetadata,
              needsEnhancement: false,
              missingExplanations: 0,
            },
          },
        });
      }
    } catch (error: any) {
      console.error('Enhancement error:', error);
      setError(error.message || 'Failed to enhance questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
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
    setShowProgress(true);
    setProgressComplete(false);
    setProgressError(false);

    try {
      // Initialize progress tracking
      const isExtractionModeFinal = contentAnalysis?.hasQuestions ?? false;
      const estimatedQuestions = contentAnalysis?.questionCount || config.numberOfQuestions;
      const isBatchMode = isExtractionModeFinal && estimatedQuestions > 25;

      // Create progress stages
      const stages = initializeProgressStages(isExtractionModeFinal, estimatedQuestions, isBatchMode);
      setProgressStages(stages);
      setCurrentStageIndex(0);

      // Calculate expected duration (rough estimates)
      const expectedDuration = isBatchMode
        ? Math.ceil(estimatedQuestions / 15) * 3000 // 3 seconds per batch
        : estimatedQuestions > 10
        ? 8000 // 8 seconds for medium sets
        : 5000; // 5 seconds for small sets

      // Start progress simulation
      const progressPromise = simulateProgress(stages, expectedDuration);

      // Pass estimated count to backend to override its detection
      const enhancedConfig = {
        ...config,
        estimatedQuestionCount: isExtractionModeFinal ? estimatedQuestions : undefined
      };

      // Make API call
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, config: enhancedConfig }),
      });

      const data = await response.json();

      // Wait for progress simulation to complete
      await progressPromise;

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate questions');
      }

      // Mark all stages as completed
      setProgressStages(prev => prev.map(stage => ({ ...stage, status: 'completed' })));
      setCurrentStageIndex(stages.length);
      setProgressComplete(true);

      // Set results
      setGeneratedQuestions(data.questions);
      setProcessingMode(data.metadata?.processingMode || 'generated');

      // Hide progress after a short delay
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate questions');
      setProgressError(true);
      setProgressStages(prev => prev.map((stage, idx) => ({
        ...stage,
        status: idx === currentStageIndex ? 'error' : stage.status,
        message: idx === currentStageIndex ? err.message : stage.message,
      })));

      // Hide progress after showing error
      setTimeout(() => {
        setShowProgress(false);
      }, 3000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveQuestionSet = async (questionSet: QuestionSet, makePublic: boolean) => {
    try {
      // Save directly to Zustand store (persists to localStorage)
      // No server API needed - works on Vercel's read-only filesystem
      addQuestionSet(questionSet);

      // Navigate to library
      router.push('/library');
    } catch (err: any) {
      throw new Error(err.message || 'Failed to save question set');
    }
  };

  const handleEditQuestion = (questionId: number, updatedQuestion: Question) => {
    // Update the generated questions array
    setGeneratedQuestions(prev => editQuestionInArray(prev, questionId, updatedQuestion));
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
                        placeholder="e.g., Machine Learning algorithms for classification"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        AI searches academic sources, textbooks, and research papers to generate accurate questions
                      </p>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        🎓 STEM-Enhanced Search
                      </p>
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        Questions are generated from curated academic sources including MIT OpenCourseWare, arXiv, IEEE, ACM, textbooks, and peer-reviewed journals. For best results, include specific topics or concepts in your search.
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                        <strong>Examples:</strong> "Quantum entanglement in physics" • "Binary search tree algorithms" • "Organic chemistry reaction mechanisms"
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

                {activeTab === 'json' && (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                      <input
                        type="file"
                        id="json-upload"
                        accept=".json"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleJSONFile(file);
                          }
                        }}
                        className="hidden"
                      />
                      <label
                        htmlFor="json-upload"
                        className="cursor-pointer flex flex-col items-center gap-4"
                      >
                        <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full">
                          <FileJson className="w-12 h-12 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            Click to upload JSON file
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Upload 200-500 questions in JSON format
                          </p>
                        </div>
                        <div className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                          Browse Files
                        </div>
                      </label>
                    </div>

                    {jsonQuestions.length > 0 && (
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                            <FileJson className="w-5 h-5 text-green-700 dark:text-green-300" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                              ✓ JSON Loaded Successfully
                            </h3>
                            <div className="text-sm text-green-800 dark:text-green-200 space-y-1">
                              <p><strong>File:</strong> {jsonFileName}</p>
                              <p><strong>Questions:</strong> {jsonQuestions.length}</p>
                              <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                                Click "Enhance with AI" to improve explanations and assign difficulty levels
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                      <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                        📋 JSON Format Requirements
                      </p>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                        <p>Upload a JSON file with an array of questions. Each question must include:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs ml-2">
                          <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">question</code> - The question text</li>
                          <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">options</code> - Array of answer options with id and text</li>
                          <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">correctAnswer</code> - The correct option id</li>
                          <li><code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">category</code> - Subject/topic (optional)</li>
                        </ul>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-3">
                          <strong>Note:</strong> AI will automatically enhance missing explanations and assign difficulty levels
                        </p>
                      </div>
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

            {/* Generation Controls - Hide for JSON mode */}
            {activeTab !== 'json' && (
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
            )}

            {/* Generate/Enhance Button */}
            <div className="flex gap-4">
              <button
                onClick={activeTab === 'json' ? handleEnhanceJSONQuestions : handleGenerateQuestions}
                disabled={isGenerating || (activeTab === 'json' && jsonQuestions.length === 0)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-white text-lg font-bold rounded-lg shadow-xl transition-all disabled:opacity-50 ${
                  activeTab === 'json'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 dark:from-purple-700 dark:to-pink-700 dark:hover:from-purple-600 dark:hover:to-pink-600'
                    : contentAnalysis?.hasQuestions
                    ? 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 dark:from-green-700 dark:to-teal-700 dark:hover:from-green-600 dark:hover:to-teal-600'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-700 dark:to-purple-700 dark:hover:from-blue-600 dark:hover:to-purple-600'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    {activeTab === 'json' ? 'Enhancing Questions...' : contentAnalysis?.hasQuestions ? 'Extracting & Enhancing...' : 'Generating Questions...'}
                  </>
                ) : (
                  <>
                    {activeTab === 'json' ? (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Enhance with AI ({jsonQuestions.length} questions)
                      </>
                    ) : contentAnalysis?.hasQuestions ? (
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

            {/* Progress Tracker */}
            {showProgress && (
              <ProgressTracker
                stages={progressStages}
                currentStageIndex={currentStageIndex}
                isComplete={progressComplete}
                hasError={progressError}
              />
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

                  {/* JSON Cleaning Metadata */}
                  {contentSource?.metadata?.isJSON && contentSource?.metadata?.cleaningMetadata && (
                    <div className="space-y-3">
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <FileJson className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 space-y-2">
                            <h4 className="font-semibold text-green-900 dark:text-green-100">
                              {contentSource.metadata.cleaningMetadata.isExamDump
                                ? '🧹 Exam Dump Cleaned'
                                : '📥 JSON Loaded'}
                            </h4>
                            <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
                              {contentSource.metadata.cleaningMetadata.isExamDump && (
                                <p>✓ Removed metadata and formatting issues</p>
                              )}
                              <p>✓ Loaded {contentSource.metadata.cleaningMetadata.cleanedCount} questions</p>
                              {contentSource.metadata.cleaningMetadata.missingExplanations > 0 && (
                                <p className="text-amber-700 dark:text-amber-300">
                                  ⚠ {contentSource.metadata.cleaningMetadata.missingExplanations} questions need explanations
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Enhancement Option */}
                      {contentSource.metadata.cleaningMetadata.needsEnhancement && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                AI Enhancement Available
                              </h4>
                              <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                                Generate detailed explanations for {contentSource.metadata.cleaningMetadata.missingExplanations} questions
                              </p>
                              <button
                                onClick={handleEnhanceQuestions}
                                disabled={isGenerating}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isGenerating ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Enhancing...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-4 h-4" />
                                    Enhance with AI
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <QuestionPreview
                    questions={generatedQuestions}
                    onEditQuestion={handleEditQuestion}
                  />

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
            title: generateTitle(config, activeTab, searchQuery),
            description: generateDescription(config, activeTab, generatedQuestions.length, searchQuery),
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
