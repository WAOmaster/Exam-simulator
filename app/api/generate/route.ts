import { NextRequest, NextResponse } from 'next/server';
import {
  intelligentQuestionProcessing,
  generateQuestions,
  generateQuestionsFromSearch,
  batchGenerateQuestions
} from '@/lib/questionGenerator';
import { GenerationConfig, GenerateQuestionsResponse, ContentSource } from '@/lib/types';

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
      // Process content intelligently (extract or generate)
      if (!source.content || source.content.trim().length === 0) {
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
    console.error('Question generation error:', error);

    // Provide helpful error messages
    let errorMessage = error.message || 'Failed to generate questions';

    if (error.message?.includes('API key')) {
      errorMessage = 'Gemini API key not configured. Please add GEMINI_API_KEY to your environment.';
    } else if (error.message?.includes('quota')) {
      errorMessage = 'API quota exceeded. Please try again later or use fewer questions.';
    } else if (error.message?.includes('parse')) {
      errorMessage = 'Failed to parse AI response. Please try again.';
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
