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
 * Detect if content contains existing questions
 */
function detectExistingQuestions(content: string): boolean {
  const questionPatterns = [
    /\d+\.\s*[A-Z]/i,  // "1. What is..."
    /Question\s*\d+/i,  // "Question 1"
    /Q\d+[\.:]/i,       // "Q1:" or "Q1."
    /^\s*[A-Z]\.\s/m,   // "A. option" (answer options)
    /Answer:\s*[A-D]/i, // "Answer: A"
    /Correct\s*Answer/i, // "Correct Answer"
    /\?\s*$/m,          // Lines ending with ?
  ];

  let patternMatches = 0;
  for (const pattern of questionPatterns) {
    if (pattern.test(content)) {
      patternMatches++;
    }
  }

  // If 3 or more patterns match, likely contains questions
  return patternMatches >= 3;
}

/**
 * Intelligently process content - either extract existing questions or generate new ones
 */
export async function intelligentQuestionProcessing(
  content: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata; mode: 'extracted' | 'generated' }> {
  const hasExistingQuestions = detectExistingQuestions(content);

  if (hasExistingQuestions) {
    console.log('Detected existing questions in content - using extraction mode');
    try {
      const result = await extractAndCompleteQuestions(content, config);
      return { ...result, mode: 'extracted' };
    } catch (error) {
      console.error('Extraction failed, falling back to generation mode:', error);
      // If extraction fails (e.g., model overloaded), fall back to generation
      const result = await generateQuestions(content, config);
      return { ...result, mode: 'generated' };
    }
  } else {
    console.log('No existing questions detected - using generation mode');
    const result = await generateQuestions(content, config);
    return { ...result, mode: 'generated' };
  }
}

/**
 * Extract existing questions from content and fill in missing fields
 */
async function extractAndCompleteQuestions(
  content: string,
  config: GenerationConfig,
  retryCount = 0
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const genAI = getGeminiClient();

  // Try gemini-2.5-flash first, fallback to gemini-1.5-flash if overloaded
  const modelName = retryCount > 0 ? 'gemini-1.5-flash' : 'gemini-2.5-flash';

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3, // Lower temperature for more accurate extraction
      topP: 0.95,
      maxOutputTokens: 8192,
    },
  });

  const prompt = `You are an expert at extracting and completing exam questions. The following content contains existing questions that may be incomplete.

Your task:
1. EXTRACT all existing questions from the content
2. For each question, FILL IN any missing information:
   - If options are missing: Generate 4 plausible options (A, B, C, D) based on the question
   - If correct answer is missing: Analyze the question and determine the most logical answer
   - If explanation is missing: Provide a detailed explanation of why the answer is correct
   - If explanation exists: ENHANCE it with additional AI insights and context
   - Determine question type: multiple-choice, true-false, or scenario
   - Assign appropriate difficulty: easy, medium, or hard

Content to process:
${content.substring(0, 15000)} ${content.length > 15000 ? '...(content truncated)' : ''}

Target: Extract/complete up to ${config.numberOfQuestions} questions
Subject: ${config.subject}

Return questions in this JSON format:
{
  "questions": [
    {
      "question": "The extracted or cleaned question text",
      "options": [
        {"id": "A", "text": "Option A text"},
        {"id": "B", "text": "Option B text"},
        {"id": "C", "text": "Option C text"},
        {"id": "D", "text": "Option D text"}
      ],
      "correctAnswer": "A",
      "explanation": "Comprehensive explanation combining original explanation (if any) with AI analysis",
      "difficulty": "easy|medium|hard",
      "type": "multiple-choice|true-false|scenario",
      "category": "${config.subject}"
    }
  ]
}

IMPORTANT RULES:
1. PRESERVE the original question text exactly as written (just clean up formatting)
2. If the content has answers marked, USE those answers
3. If the content has explanations, KEEP them and ADD AI enhancement
4. For MCQs with only questions and answers but no options: GENERATE plausible distractors
5. If answer is given but no explanation: CREATE detailed explanation
6. Make sure every question is complete and ready for exam use
7. Return ONLY valid JSON, no additional text

Return ONLY the JSON object, no markdown formatting.`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseGeneratedQuestions(text, config);
  } catch (error: any) {
    // Check if it's a 503 (service overloaded) or rate limit error
    const isOverloadedError = error.message?.includes('503') ||
                              error.message?.includes('overloaded') ||
                              error.message?.includes('quota');

    // Retry once with different model if overloaded and haven't retried yet
    if (isOverloadedError && retryCount === 0) {
      console.log('Model overloaded, retrying with gemini-1.5-flash...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return extractAndCompleteQuestions(content, config, 1);
    }

    throw new Error(`Failed to extract/complete questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate questions from content using Gemini AI
 */
export async function generateQuestions(
  content: string,
  config: GenerationConfig,
  retryCount = 0
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const genAI = getGeminiClient();

  // Try gemini-2.5-flash first, fallback to gemini-1.5-flash if overloaded
  const modelName = retryCount > 0 ? 'gemini-1.5-flash' : 'gemini-2.5-flash';

  const model = genAI.getGenerativeModel({
    model: modelName,
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
  } catch (error: any) {
    // Check if it's a 503 (service overloaded) or rate limit error
    const isOverloadedError = error.message?.includes('503') ||
                              error.message?.includes('overloaded') ||
                              error.message?.includes('quota');

    // Retry once with different model if overloaded and haven't retried yet
    if (isOverloadedError && retryCount === 0) {
      console.log('Model overloaded, retrying with gemini-1.5-flash...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return generateQuestions(content, config, 1);
    }

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
