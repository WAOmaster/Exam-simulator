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
 * Now with intelligent batching to handle large question sets
 */
async function extractAndCompleteQuestions(
  content: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  // Estimate number of questions in content
  const estimatedQuestions = estimateQuestionCount(content);
  console.log(`Estimated ${estimatedQuestions} questions in content`);

  // If content has many questions (>25), use batch extraction
  if (estimatedQuestions > 25) {
    console.log(`Using batch extraction for ${estimatedQuestions} questions`);
    return batchExtractAndCompleteQuestions(content, estimatedQuestions, config);
  }

  // For smaller sets, process in single call
  return extractBatch(content, Math.min(estimatedQuestions, 25), config);
}

/**
 * Estimate the number of questions in content
 */
function estimateQuestionCount(content: string): number {
  const patterns = [
    /^\s*\d+\.\s+[A-Z]/gm,           // "1. Question" (must have letter after)
    /^\s*Question\s*\d+/gim,         // "Question 1"
    /^\s*Q\d+[\.:]\s*/gim,           // "Q1:" or "Q1."
    /^\s*\d+\)\s+[A-Z]/gm,           // "1) Question"
  ];

  let maxCount = 0;
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      const count = matches.length;
      console.log(`Pattern ${pattern.source} found ${count} matches`);
      maxCount = Math.max(maxCount, count);
    }
  }

  console.log(`Estimated question count: ${maxCount}`);
  return maxCount || 10; // Default to 10 if can't detect
}

/**
 * Split content into batches based on question boundaries
 */
function splitContentIntoQuestionBatches(content: string, questionsPerBatch: number): string[] {
  const batches: string[] = [];

  // Try to find question boundaries (e.g., "1. ", "Question 1", "Q1:")
  const questionBoundaries: number[] = [];
  const patterns = [
    /^\s*\d+\.\s/gm,
    /^\s*Question\s*\d+/gim,
    /^\s*Q\d+[\.:]/gim,
  ];

  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        questionBoundaries.push(match.index);
      }
    }
  }

  // Sort and deduplicate boundaries
  const sortedBoundaries = [...new Set(questionBoundaries)].sort((a, b) => a - b);

  if (sortedBoundaries.length === 0) {
    // If can't detect boundaries, split by character count
    const charsPerBatch = Math.ceil(content.length / Math.ceil(estimateQuestionCount(content) / questionsPerBatch));
    for (let i = 0; i < content.length; i += charsPerBatch) {
      batches.push(content.substring(i, i + charsPerBatch));
    }
    return batches;
  }

  // Group questions into batches
  for (let i = 0; i < sortedBoundaries.length; i += questionsPerBatch) {
    const startIdx = sortedBoundaries[i];
    // Get the end index: either the start of the next batch or the end of content
    const nextBatchStart = i + questionsPerBatch < sortedBoundaries.length
      ? sortedBoundaries[i + questionsPerBatch]
      : content.length;

    batches.push(content.substring(startIdx, nextBatchStart));
  }

  return batches;
}

/**
 * Extract a single batch of questions
 */
async function extractBatch(
  content: string,
  expectedQuestions: number,
  config: GenerationConfig,
  retryCount = 0
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const genAI = getGeminiClient();

  // Try gemini-2.5-flash first, fallback to gemini-1.5-pro if overloaded
  const modelName = retryCount > 0 ? 'gemini-1.5-pro' : 'gemini-2.5-flash';

  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.3, // Lower temperature for more accurate extraction
      topP: 0.95,
      maxOutputTokens: 8192, // Reduced from 16384
    },
  });

  const prompt = `You are an expert at extracting and completing exam questions. Extract EXACTLY ${expectedQuestions} questions from the content below.

STRICT RULES - MUST FOLLOW:
1. Extract ONLY ${expectedQuestions} questions - NO MORE, NO LESS
2. Keep explanations BRIEF (max 50 words each)
3. DO NOT add extra details, examples, or context
4. Return ONLY valid JSON, nothing else

Your task:
- EXTRACT existing questions from the content
- If options missing: Generate 4 concise options (A, B, C, D)
- If correct answer missing: Determine the answer
- If explanation missing: Provide SHORT explanation (max 50 words)
- If explanation exists: Keep it and make it concise (max 50 words)
- Set question type: multiple-choice, true-false, or scenario
- Set difficulty: easy, medium, or hard

Content to process:
${content.substring(0, 25000)} ${content.length > 25000 ? '...(content truncated)' : ''}

Subject: ${config.subject || 'General'}

Return questions in this EXACT JSON format (NO extra text):
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

CRITICAL RULES - STRICTLY ENFORCE:
1. Extract EXACTLY ${expectedQuestions} questions - count them!
2. Keep ALL explanations under 50 words (shorter = better)
3. NO markdown, NO code blocks, NO extra text
4. Escape quotes properly (use \\" inside strings)
5. Return ONLY the JSON object

Return ONLY the JSON object. No markdown formatting, no text before or after.`;

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
      console.log('Model overloaded, retrying with gemini-1.5-pro...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return extractBatch(content, expectedQuestions, config, 1);
    }

    throw new Error(`Failed to extract/complete questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Batch extraction for large question sets (>25 questions)
 */
async function batchExtractAndCompleteQuestions(
  content: string,
  estimatedQuestions: number,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const QUESTIONS_PER_BATCH = 15; // Reduced from 25 to avoid token limits
  const numBatches = Math.ceil(estimatedQuestions / QUESTIONS_PER_BATCH);

  console.log(`Splitting into ${numBatches} batches of ~${QUESTIONS_PER_BATCH} questions each`);

  // Split content into batches
  const contentBatches = splitContentIntoQuestionBatches(content, QUESTIONS_PER_BATCH);

  const allQuestions: Question[] = [];
  const batchResults: Array<{ batchIndex: number; result: { questions: Question[]; metadata: QuestionSetMetadata } | null; error?: any }> = [];

  // Process batches in parallel (but with controlled concurrency)
  const CONCURRENT_BATCHES = 3; // Process 3 batches at a time to avoid rate limits

  for (let i = 0; i < contentBatches.length; i += CONCURRENT_BATCHES) {
    const batchPromises = [];

    for (let j = 0; j < CONCURRENT_BATCHES && i + j < contentBatches.length; j++) {
      const batchIndex = i + j;
      const batchContent = contentBatches[batchIndex];

      console.log(`Processing batch ${batchIndex + 1}/${contentBatches.length}...`);

      batchPromises.push(
        extractBatch(batchContent, QUESTIONS_PER_BATCH, config)
          .then(result => ({ batchIndex, result, error: undefined }))
          .catch(error => {
            console.error(`Batch ${batchIndex + 1} failed:`, error);
            return { batchIndex, result: null, error };
          })
      );
    }

    // Wait for this set of concurrent batches to complete
    const results = await Promise.all(batchPromises);
    batchResults.push(...results);

    // Small delay between batch groups to avoid rate limiting
    if (i + CONCURRENT_BATCHES < contentBatches.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Collect all questions from successful batches
  for (const batchResult of batchResults) {
    if (batchResult.result && batchResult.result.questions) {
      console.log(`Batch ${batchResult.batchIndex + 1} extracted ${batchResult.result.questions.length} questions`);
      allQuestions.push(...batchResult.result.questions);
    } else if (batchResult.error) {
      console.warn(`Skipping batch ${batchResult.batchIndex + 1} due to error`);
    }
  }

  console.log(`Total questions extracted: ${allQuestions.length}`);

  // Calculate combined metadata
  const metadata = calculateMetadata(allQuestions, config);

  return { questions: allQuestions, metadata };
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

  // Try gemini-2.5-flash first, fallback to gemini-1.5-pro if overloaded
  const modelName = retryCount > 0 ? 'gemini-1.5-pro' : 'gemini-2.5-flash';

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
      console.log('Model overloaded, retrying with gemini-1.5-pro...');
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

    // Clean up common JSON issues before parsing
    jsonText = jsonText
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to fix truncated JSON
      console.error('Initial parse failed, attempting to fix JSON...');
      console.error('Failed to parse JSON. First 500 chars:', jsonText.substring(0, 500));
      console.error('Last 500 chars:', jsonText.substring(Math.max(0, jsonText.length - 500)));

      // Check if JSON was truncated (missing closing brackets)
      const openBraces = (jsonText.match(/{/g) || []).length;
      const closeBraces = (jsonText.match(/}/g) || []).length;
      const openBrackets = (jsonText.match(/\[/g) || []).length;
      const closeBrackets = (jsonText.match(/\]/g) || []).length;

      if (openBraces > closeBraces || openBrackets > closeBrackets) {
        console.log('Detected truncated JSON, attempting to close...');

        // Remove any incomplete question at the end
        const lastCompleteQuestion = jsonText.lastIndexOf('},');
        if (lastCompleteQuestion > 0) {
          jsonText = jsonText.substring(0, lastCompleteQuestion + 1);
        }

        // Add missing closing brackets
        for (let i = 0; i < (openBrackets - closeBrackets); i++) {
          jsonText += ']';
        }
        for (let i = 0; i < (openBraces - closeBraces); i++) {
          jsonText += '}';
        }

        console.log('Attempting to parse fixed JSON...');
        parsed = JSON.parse(jsonText);
      } else {
        throw parseError;
      }
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
