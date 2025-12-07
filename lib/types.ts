// Core question types
export interface Question {
  id: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  explanation: string;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  type?: 'multiple-choice' | 'true-false' | 'scenario';
}

// Question set types
export interface QuestionSet {
  id: string;
  title: string;
  description: string;
  subject: string;
  questions: Question[];
  metadata: QuestionSetMetadata;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  userId?: string;
  sourceType: 'upload' | 'url' | 'search' | 'manual' | 'pre-built';
}

export interface QuestionSetMetadata {
  totalQuestions: number;
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  questionTypes: {
    'multiple-choice': number;
    'true-false': number;
    'scenario': number;
  };
  topics: string[];
  processingMode?: 'extracted' | 'generated'; // How questions were created
  sourceInfo?: {
    fileName?: string;
    urls?: string[];
    searchQuery?: string;
  };
}

// Knowledge area types
export interface KnowledgeArea {
  id: string;
  name: string;
  description: string;
  subject: string;
  questionCount: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  tags: string[];
  isPreBuilt: boolean;
  isPublic: boolean;
  rating?: number;
  downloads?: number;
  createdAt: string;
  questionSetId: string;
}

// Generation configuration
export interface GenerationConfig {
  numberOfQuestions: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  questionTypes: ('multiple-choice' | 'true-false' | 'scenario')[];
  topicFocus?: string;
  subject: string;
  estimatedQuestionCount?: number; // Frontend's detection, overrides backend
}

// Content source types
export interface ContentSource {
  type: 'file' | 'url' | 'search' | 'text';
  content: string;
  metadata?: {
    fileName?: string;
    fileType?: string;
    url?: string;
    searchQuery?: string;
    isJSON?: boolean;
    cleaningMetadata?: {
      isExamDump: boolean;
      needsEnhancement: boolean;
      originalCount: number;
      cleanedCount: number;
      missingExplanations: number;
      missingDifficulty: number;
    };
  };
}

// User preferences
export interface UserPreferences {
  userId: string;
  allowSharing: boolean;
  defaultSubject?: string;
  savedQuestionSets: string[];
}

// API response types
export interface GenerateQuestionsResponse {
  success: boolean;
  questions: Question[];
  metadata: QuestionSetMetadata;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  content: string;
  fileName: string;
  fileType: string;
  error?: string;
  // For JSON files with questions
  questions?: Question[];
  cleaningMetadata?: {
    isExamDump: boolean;
    needsEnhancement: boolean;
    originalCount: number;
    cleanedCount: number;
    missingExplanations: number;
    missingDifficulty: number;
  };
}

export interface ScrapeResponse {
  success: boolean;
  content: string;
  url: string;
  title?: string;
  error?: string;
}
