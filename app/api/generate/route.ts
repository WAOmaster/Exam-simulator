import { NextRequest, NextResponse } from 'next/server';
import {
  intelligentQuestionProcessing,
  generateQuestions,
  generateQuestionsFromSearch,
  batchGenerateQuestions
} from '@/lib/questionGenerator';
import { GenerationConfig, GenerateQuestionsResponse, ContentSource } from '@/lib/types';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      source,
      config,
    }: {
      source: ContentSource;
      config: GenerationConfig;
    } = body;

    // Validate inputs
    if (!config || !config.numberOfQuestions || !config.subject) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required configuration',
          questions: [],
          metadata: {
            totalQuestions: 0,
            difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
            questionTypes: { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 },
            topics: [],
          },
        } as GenerateQuestionsResponse,
        { status: 400 }
      );
    }

    let result;
    let processingMode: 'extracted' | 'generated' = 'generated';

    // Generate questions based on source type
    if (source.type === 'search') {
      // Use Google Search grounding
      const searchQuery = source.metadata?.searchQuery || source.content;
      result = await generateQuestionsFromSearch(searchQuery, config);
    } else {
      // CCAT mode generates questions from scratch — no source content required
      const isCCATMode = config.ccatMode || config.subject?.toLowerCase().includes('ccat');

      // Process content intelligently (extract or generate)
      if (!isCCATMode && (!source.content || source.content.trim().length === 0)) {
        return NextResponse.json(
          {
            success: false,
            error: 'No content provided for question generation',
            questions: [],
            metadata: {
              totalQuestions: 0,
              difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
              questionTypes: { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 },
              topics: [],
            },
          } as GenerateQuestionsResponse,
          { status: 400 }
        );
      }

      // Use intelligent processing for small to medium sets
      // Use batch generation only for very large sets from scratch content
      if (config.numberOfQuestions > 50) {
        // For large sets, try intelligent processing first
        const intelligentResult = await intelligentQuestionProcessing(source.content, {
          ...config,
          numberOfQuestions: Math.min(50, config.numberOfQuestions), // Process first batch
        });
        processingMode = intelligentResult.mode;

        // If extracted mode and we need more, continue with batch generation
        if (intelligentResult.mode === 'extracted' || config.numberOfQuestions <= 50) {
          result = intelligentResult;
        } else {
          // For pure generation of large sets, use batch mode
          result = await batchGenerateQuestions(source.content, config.numberOfQuestions, config);
        }
      } else {
        // Use intelligent processing (auto-detects extraction vs generation)
        const intelligentResult = await intelligentQuestionProcessing(source.content, config);
        processingMode = intelligentResult.mode;
        result = intelligentResult;
      }
    }

    return NextResponse.json({
      success: true,
      questions: result.questions,
      metadata: {
        ...result.metadata,
        processingMode, // Include mode so UI can show "Extracted & Enhanced" vs "Generated"
      },
    } as GenerateQuestionsResponse);
  } catch (error: any) {
    console.error('Question generation error:', error?.message, error?.status, error?.statusCode, JSON.stringify(error?.errorDetails || error?.details || '').substring(0, 500));

    // Provide helpful error messages while preserving original for debugging
    let errorMessage = error.message || 'Failed to generate questions';
    const originalError = error.message || '';

    if (originalError.includes('GEMINI_API_KEY is not configured')) {
      errorMessage = 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment.';
    } else if (originalError.includes('API_KEY_INVALID') || originalError.includes('API key not valid')) {
      errorMessage = 'Gemini API key is invalid. Please check your GEMINI_API_KEY.';
    } else if (originalError.includes('RESOURCE_EXHAUSTED') || originalError.includes('rateLimitExceeded')) {
      errorMessage = 'API rate limit reached. Please wait a moment and try again.';
    } else if (originalError.includes('quota') && originalError.includes('billing')) {
      errorMessage = 'API quota exceeded. You may need to enable billing on your Google Cloud project.';
    } else if (originalError.includes('quota')) {
      errorMessage = `API quota issue: ${originalError.substring(0, 150)}`;
    } else if (originalError.includes('404') || originalError.includes('not found')) {
      errorMessage = `Model not found. The model may not be available for your API key. Details: ${originalError.substring(0, 150)}`;
    } else if (originalError.includes('parse')) {
      errorMessage = 'Failed to parse AI response. Please try again.';
    } else {
      // Pass through the actual error for visibility
      errorMessage = `Generation failed: ${originalError.substring(0, 200)}`;
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        questions: [],
        metadata: {
          totalQuestions: 0,
          difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
          questionTypes: { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 },
          topics: [],
        },
      } as GenerateQuestionsResponse,
      { status: 500 }
    );
  }
}
