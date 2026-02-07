import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { Question, QuestionSetMetadata } from '@/lib/types';

export const maxDuration = 60;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

// Batch configuration
const QUESTIONS_PER_BATCH = 10; // Reduce from 15 to ensure token limits
const CONCURRENT_BATCHES = 3;
const BATCH_DELAY_MS = 1000;

/**
 * Enhance a batch of questions with AI-generated explanations and difficulty levels
 */
async function enhanceBatch(
  questions: Question[],
  batchIndex: number,
  totalBatches: number
): Promise<Question[]> {
  console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${questions.length} questions)`);

  const prompt = `You are an expert educator reviewing and enhancing exam questions.

TASK: Review the following ${questions.length} questions and enhance them by:
1. **Validating structure**: Ensure each question has proper format
2. **Improving explanations**: Write clear, educational explanations (max 75 words each)
3. **Assigning difficulty**: Determine if each question is 'easy', 'medium', or 'hard'
4. **Preserving content**: Keep original question text and options UNCHANGED

STRICT RULES - MUST FOLLOW:
- Return EXACTLY ${questions.length} questions - NO MORE, NO LESS
- Keep explanations BRIEF (max 75 words each)
- DO NOT modify question text or options
- DO NOT add extra fields or metadata
- Return ONLY valid JSON, nothing else

INPUT QUESTIONS:
${JSON.stringify(questions, null, 2)}

OUTPUT FORMAT (JSON only):
{
  "questions": [
    {
      "id": number,
      "question": "original question text",
      "options": [original options array],
      "correctAnswer": "original correct answer",
      "explanation": "brief, clear explanation (max 75 words)",
      "category": "original category",
      "difficulty": "easy" | "medium" | "hard",
      "type": "original type"
    }
  ]
}

Return ONLY the JSON object, no additional text.`;

  try {
    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.3, // Lower temperature for more consistent output
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || '';

    console.log(`Batch ${batchIndex + 1} response length: ${text.length} characters`);

    // Parse JSON response
    let jsonText = text.trim();

    // Extract JSON if wrapped in markdown code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }

    // Clean up any leading/trailing non-JSON text
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
    }

    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (_parseError) {
      // Attempt to fix common JSON issues
      console.warn(`JSON parse error in batch ${batchIndex + 1}, attempting to fix...`);

      // Try to close any unclosed brackets
      if (!jsonText.endsWith('}')) {
        jsonText += ']}';
      }

      // Try parsing again
      try {
        data = JSON.parse(jsonText);
      } catch (_retryError) {
        console.error('Failed to parse JSON after retry:', jsonText.substring(0, 500));
        throw new Error('Failed to parse AI response as JSON');
      }
    }

    if (!data.questions || !Array.isArray(data.questions)) {
      throw new Error('Invalid response format: missing questions array');
    }

    console.log(`Batch ${batchIndex + 1} successfully enhanced ${data.questions.length} questions`);
    return data.questions;

  } catch (error: any) {
    console.error(`Error enhancing batch ${batchIndex + 1}:`, error.message);

    // If 503 (overloaded), retry with fallback model
    if (error.message?.includes('503') || error.message?.includes('overloaded')) {
      console.log(`Retrying batch ${batchIndex + 1} with fallback model...`);

      try {
        const fallbackResponse = await getAI().models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt,
          config: {
            temperature: 0.3,
            maxOutputTokens: 8192,
          },
        });

        let text = (fallbackResponse.text || '').trim();

        // Extract JSON
        const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          text = jsonMatch[1].trim();
        }

        const jsonStart = text.indexOf('{');
        const jsonEnd = text.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          text = text.substring(jsonStart, jsonEnd + 1);
        }

        const data = JSON.parse(text);
        console.log(`Batch ${batchIndex + 1} succeeded with fallback model`);
        return data.questions;

      } catch (retryError: any) {
        console.error(`Fallback also failed for batch ${batchIndex + 1}:`, retryError.message);
        // Return original questions with minimal enhancement
        return questions.map(q => ({
          ...q,
          explanation: q.explanation || 'Explanation not available',
          difficulty: q.difficulty || 'medium' as 'easy' | 'medium' | 'hard',
        }));
      }
    }

    // For other errors, return original questions with minimal enhancement
    return questions.map(q => ({
      ...q,
      explanation: q.explanation || 'Explanation not available',
      difficulty: q.difficulty || 'medium' as 'easy' | 'medium' | 'hard',
    }));
  }
}

/**
 * Split questions into batches for processing
 */
function splitIntoBatches(questions: Question[]): Question[][] {
  const batches: Question[][] = [];

  for (let i = 0; i < questions.length; i += QUESTIONS_PER_BATCH) {
    batches.push(questions.slice(i, i + QUESTIONS_PER_BATCH));
  }

  return batches;
}

/**
 * Process batches with controlled concurrency
 */
async function processBatchesConcurrently(batches: Question[][]): Promise<Question[]> {
  const allResults: Question[] = [];

  // Process in groups of CONCURRENT_BATCHES
  for (let i = 0; i < batches.length; i += CONCURRENT_BATCHES) {
    const batchGroup = batches.slice(i, i + CONCURRENT_BATCHES);

    // Process this group in parallel
    const groupPromises = batchGroup.map((batch, idx) =>
      enhanceBatch(batch, i + idx, batches.length)
    );

    const groupResults = await Promise.all(groupPromises);

    // Combine results
    for (const result of groupResults) {
      allResults.push(...result);
    }

    // Delay before next group (except for the last group)
    if (i + CONCURRENT_BATCHES < batches.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return allResults;
}

/**
 * Calculate metadata from questions
 */
function calculateMetadata(questions: Question[]): QuestionSetMetadata {
  const difficultyDistribution = {
    easy: questions.filter(q => q.difficulty === 'easy').length,
    medium: questions.filter(q => q.difficulty === 'medium').length,
    hard: questions.filter(q => q.difficulty === 'hard').length,
  };

  const questionTypes = {
    'multiple-choice': questions.filter(q => q.type === 'multiple-choice' || !q.type).length,
    'true-false': questions.filter(q => q.type === 'true-false').length,
    'scenario': questions.filter(q => q.type === 'scenario').length,
  };

  // Extract unique categories/topics
  const topics = [...new Set(questions.map(q => q.category).filter(Boolean))];

  return {
    totalQuestions: questions.length,
    difficultyDistribution,
    questionTypes,
    topics,
    processingMode: 'generated', // Enhanced questions are treated as generated
  };
}

/**
 * POST /api/enhance
 * Enhances a batch of questions with AI-generated explanations and difficulty levels
 */
export async function POST(request: NextRequest) {
  try {
    const { questions } = await request.json();

    // Validate input
    if (!questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: 'Invalid input: questions array required' },
        { status: 400 }
      );
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No questions provided' },
        { status: 400 }
      );
    }

    if (questions.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Maximum 500 questions allowed per request' },
        { status: 400 }
      );
    }

    console.log(`Starting enhancement of ${questions.length} questions`);

    // Split into batches
    const batches = splitIntoBatches(questions);
    console.log(`Split into ${batches.length} batches of up to ${QUESTIONS_PER_BATCH} questions each`);

    // Process all batches
    const enhancedQuestions = await processBatchesConcurrently(batches);

    // Calculate metadata
    const metadata = calculateMetadata(enhancedQuestions);

    console.log(`Successfully enhanced ${enhancedQuestions.length} questions`);

    return NextResponse.json({
      success: true,
      questions: enhancedQuestions,
      metadata,
    });

  } catch (error: any) {
    console.error('Error in enhance API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enhance questions',
      },
      { status: 500 }
    );
  }
}
