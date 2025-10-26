import { GoogleGenerativeAI } from '@google/generative-ai';
import { Question, GenerationConfig, QuestionSetMetadata } from './types';

// Initialize Gemini AI
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Generate questions from content using Gemini AI
 */
export async function generateQuestions(
  content: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });

  // Build the prompt based on configuration
  const prompt = buildPrompt(content, config);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    const parsedResponse = parseGeneratedQuestions(text, config);

    return parsedResponse;
  } catch (error) {
    throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate questions using Google Search grounding
 */
export async function generateQuestionsFromSearch(
  searchQuery: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });

  const prompt = `You are an expert exam question generator. Use Google Search to find information about "${searchQuery}" and generate ${config.numberOfQuestions} exam questions.

Subject: ${config.subject}
Difficulty: ${config.difficulty}
Question Types: ${config.questionTypes.join(', ')}
${config.topicFocus ? `Focus on: ${config.topicFocus}` : ''}

Generate questions in JSON format with the following structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this is correct",
      "difficulty": "easy|medium|hard",
      "type": "multiple-choice|true-false|scenario"
    }
  ]
}

Requirements:
- Each question must be clear, specific, and based on accurate information
- Provide 4 options for multiple-choice questions (A, B, C, D)
- For true-false, provide 2 options (A=True, B=False)
- Include detailed explanations
- Distribute difficulty levels appropriately
- Make distractors (incorrect options) plausible but clearly incorrect

Return ONLY the JSON object, no additional text.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseGeneratedQuestions(text, config);
  } catch (error) {
    throw new Error(`Failed to generate questions from search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build the prompt for question generation
 */
function buildPrompt(content: string, config: GenerationConfig): string {
  const difficultyGuide = {
    easy: 'Focus on basic concepts, definitions, and fundamental understanding',
    medium: 'Include application-level questions requiring analysis and comprehension',
    hard: 'Create complex scenarios requiring synthesis, evaluation, and expert knowledge',
    mixed: 'Distribute difficulty evenly across easy, medium, and hard levels',
  };

  return `You are an expert exam question generator. Analyze the following content and generate ${config.numberOfQuestions} high-quality exam questions.

Content to analyze:
${content.substring(0, 15000)} ${content.length > 15000 ? '...(content truncated)' : ''}

Subject: ${config.subject}
Difficulty: ${config.difficulty} - ${difficultyGuide[config.difficulty]}
Question Types: ${config.questionTypes.join(', ')}
${config.topicFocus ? `Focus specifically on: ${config.topicFocus}` : ''}

Generate questions in JSON format with the following structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this is correct and why other options are wrong",
      "difficulty": "easy|medium|hard",
      "type": "multiple-choice|true-false|scenario",
      "category": "${config.subject}"
    }
  ]
}

Requirements:
1. Base ALL questions on the provided content
2. Each question must test real understanding, not just memorization
3. For multiple-choice: provide 4 plausible options (A, B, C, D)
4. For true-false: provide 2 options (A=True, B=False)
5. For scenario: create realistic situations that apply concepts from the content
6. Make distractors (wrong answers) plausible but clearly incorrect
7. Include comprehensive explanations for each answer
8. Ensure questions are clear, unambiguous, and grammatically correct
9. If difficulty is "mixed", distribute roughly equally: 1/3 easy, 1/3 medium, 1/3 hard
10. Cover different topics from the content, don't focus on just one area

Return ONLY the JSON object, no additional text or markdown formatting.`;
}

/**
 * Parse the generated questions from Gemini response
 */
function parseGeneratedQuestions(
  text: string,
  config: GenerationConfig
): { questions: Question[]; metadata: QuestionSetMetadata } {
  try {
    // Extract JSON from the response (remove markdown code blocks if present)
    let jsonText = text.trim();

    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
    }

    // Try to extract JSON object if there's extra text
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    // Clean up common JSON issues
    jsonText = jsonText
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/\n/g, ' ') // Remove newlines
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // Log the problematic JSON for debugging
      console.error('Failed to parse JSON. First 500 chars:', jsonText.substring(0, 500));
      console.error('Last 500 chars:', jsonText.substring(Math.max(0, jsonText.length - 500)));
      throw parseError;
    }

    // Validate the structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Response does not contain a valid questions array');
    }

    const questions: Question[] = parsed.questions.map((q: any, index: number) => ({
      id: Date.now() + index,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      category: q.category || config.subject,
      difficulty: q.difficulty || config.difficulty,
      type: q.type,
    }));

    // Calculate metadata
    const metadata = calculateMetadata(questions, config);

    return { questions, metadata };
  } catch (error) {
    throw new Error(`Failed to parse generated questions: ${error instanceof Error ? error.message : 'Invalid JSON response'}`);
  }
}

/**
 * Calculate metadata for the generated question set
 */
function calculateMetadata(questions: Question[], config: GenerationConfig): QuestionSetMetadata {
  const difficultyDistribution = {
    easy: 0,
    medium: 0,
    hard: 0,
  };

  const questionTypes = {
    'multiple-choice': 0,
    'true-false': 0,
    'scenario': 0,
  };

  const topicsSet = new Set<string>();

  questions.forEach(q => {
    // Count difficulty
    if (q.difficulty in difficultyDistribution) {
      difficultyDistribution[q.difficulty as keyof typeof difficultyDistribution]++;
    }

    // Count question types
    if (q.type && q.type in questionTypes) {
      questionTypes[q.type as keyof typeof questionTypes]++;
    }

    // Extract topics from category
    topicsSet.add(q.category);
  });

  return {
    totalQuestions: questions.length,
    difficultyDistribution,
    questionTypes,
    topics: Array.from(topicsSet),
  };
}

/**
 * Batch generate questions to handle large content
 */
export async function batchGenerateQuestions(
  content: string,
  totalQuestions: number,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const batchSize = 25; // Generate 25 questions at a time
  const numBatches = Math.ceil(totalQuestions / batchSize);

  const allQuestions: Question[] = [];

  for (let i = 0; i < numBatches; i++) {
    const questionsInBatch = Math.min(batchSize, totalQuestions - allQuestions.length);
    const batchConfig = { ...config, numberOfQuestions: questionsInBatch };

    const { questions } = await generateQuestions(content, batchConfig);
    allQuestions.push(...questions);

    // Add small delay between batches to avoid rate limiting
    if (i < numBatches - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const metadata = calculateMetadata(allQuestions, config);

  return { questions: allQuestions, metadata };
}
