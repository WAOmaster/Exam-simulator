import { GoogleGenAI } from '@google/genai';
import { Question, GenerationConfig, QuestionSetMetadata } from './types';
import { generateSpatialQuestion, SpatialType } from './ccatSpatialGenerator';

// Initialize Gemini AI
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenAI({ apiKey });
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
  // CCAT mode: route to CCAT-specific generation
  if (config.ccatMode || config.subject?.toLowerCase().includes('ccat')) {
    console.log('CCAT mode detected - using CCAT question generation');
    const result = await generateCCATQuestions(content, config);
    return { ...result, mode: 'generated' };
  }

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

// ─── CCAT Question Generation ─────────────────────────────────────────────

const CCAT_TYPE_DESCRIPTIONS: Record<string, string> = {
  'verbal-analogy': 'WORD A is to WORD B as WORD C is to ______. Tests vocabulary and relationships between concepts.',
  'sentence-completion': 'A sentence with one blank. Select the word that best fits the meaning.',
  'antonym': 'One word is underlined. Select its closest OPPOSITE meaning.',
  'syllogism': 'Given two true premises, determine if the conclusion is TRUE, FALSE, or UNCERTAIN. Use 3 options only.',
  'number-series': 'Find the next number in the pattern. Must be solvable by mental arithmetic.',
  'word-problem': 'Multi-step arithmetic word problem solvable in under 30 seconds without a calculator.',
  'attention-to-detail': 'Present two columns of items. Ask how many pairs are exactly identical.',
};

// Spatial types that are image-generated separately — excluded from the text prompt
const CCAT_SPATIAL_TYPES = new Set([
  'spatial-next-in-series',
  'spatial-matrix',
  'spatial-odd-one-out',
]);

// Map from config type → API spatialType param
const SPATIAL_TYPE_MAP: Record<string, 'nextInSeries' | 'matrix' | 'oddOneOut'> = {
  'spatial-next-in-series': 'nextInSeries',
  'spatial-matrix': 'matrix',
  'spatial-odd-one-out': 'oddOneOut',
};

function buildCCATPrompt(content: string, config: GenerationConfig, textQuestionCount: number): string {
  // Exclude spatial types — those are image-generated separately
  const ccatTypes = config.questionTypes.filter(
    t => Object.keys(CCAT_TYPE_DESCRIPTIONS).includes(t) && !CCAT_SPATIAL_TYPES.has(t)
  );
  const activeTypes = ccatTypes.length > 0 ? ccatTypes : Object.keys(CCAT_TYPE_DESCRIPTIONS);

  const typeGuidance = activeTypes
    .map(t => `- ${t}: ${CCAT_TYPE_DESCRIPTIONS[t]}`)
    .join('\n');

  const isSyllogismOnly = activeTypes.length === 1 && activeTypes[0] === 'syllogism';

  return `You are an expert CCAT (Criteria Cognitive Aptitude Test) question generator.
Generate exactly ${textQuestionCount} CCAT-style questions.

CRITICAL RULES:
1. ALL questions use 5 options labeled A through E — EXCEPT syllogism questions which use exactly 3 options: A=True, B=False, C=Uncertain
2. Questions must be solvable in under 30 seconds (CCAT average is 18 sec/question)
3. No calculators — math must use mental arithmetic or simple estimation
4. Mix question types proportionally if multiple types are selected
5. Difficulty: ${config.difficulty}

Active question types:
${typeGuidance}

${content ? `Source material for context:\n${content.substring(0, 6000)}\n` : ''}
Subject focus: ${config.subject || 'General Cognitive Aptitude'}

Return ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text here",
      "options": [
        {"id": "A", "text": "Option A"},
        {"id": "B", "text": "Option B"},
        {"id": "C", "text": "Option C"},
        {"id": "D", "text": "Option D"},
        {"id": "E", "text": "Option E"}
      ],
      "correctAnswer": "B",
      "explanation": "Brief explanation (max 60 words)",
      "difficulty": "easy",
      "type": "verbal-analogy",
      "category": "Verbal"
    }
  ]
}

For SYLLOGISM questions use exactly 3 options:
{"id":"A","text":"True"}, {"id":"B","text":"False"}, {"id":"C","text":"Uncertain"}

Valid type values: ${activeTypes.join(', ')}
Valid category values: "Verbal", "Math & Logic"
Valid difficulty values: easy, medium, hard

${isSyllogismOnly ? 'IMPORTANT: This is syllogism-only mode. Every question must be a syllogism with 3 options.' : ''}

Return ONLY the JSON object, no other text.`;
}

/**
 * Generate CCAT-style questions with 5 options (A-E) and CCAT-specific question types.
 * Spatial question types (spatial-next-in-series, spatial-matrix, spatial-odd-one-out)
 * are generated as images via the /api/ai/ccat-spatial endpoint.
 */
async function generateCCATQuestions(
  content: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  // Split requested types into text-based and spatial (image-based)
  const spatialTypes = config.questionTypes.filter(t => CCAT_SPATIAL_TYPES.has(t));
  const hasTextTypes = config.questionTypes.some(
    t => !CCAT_SPATIAL_TYPES.has(t) && Object.keys(CCAT_TYPE_DESCRIPTIONS).includes(t)
  );

  // Calculate how many of each we need
  const totalRequested = config.numberOfQuestions;
  let spatialCount = 0;
  if (spatialTypes.length > 0) {
    // Allocate spatial questions proportionally; at least 1 per selected spatial type
    const fraction = spatialTypes.length / config.questionTypes.filter(
      t => CCAT_SPATIAL_TYPES.has(t) || Object.keys(CCAT_TYPE_DESCRIPTIONS).includes(t)
    ).length;
    spatialCount = Math.max(spatialTypes.length, Math.round(totalRequested * fraction));
    spatialCount = Math.min(spatialCount, totalRequested);
  }
  const textCount = totalRequested - spatialCount;

  console.log(`Generating ${config.numberOfQuestions} CCAT questions (${textCount} text, ${spatialCount} spatial)...`);

  // ── Generate text-based questions ──────────────────────────────────────────
  let textQuestions: Question[] = [];
  if (textCount > 0 && hasTextTypes) {
    const prompt = buildCCATPrompt(content, config, textCount);
    let responseText = '';
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });
      responseText = response.text ?? '';
    } catch (error: any) {
      if (error?.status === 503) {
        console.log('Model overloaded, retrying with gemini-2.5-flash...');
        const ai2 = getGeminiClient();
        const response2 = await ai2.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.7, maxOutputTokens: 8192 },
        });
        responseText = response2.text ?? '';
      } else {
        throw error;
      }
    }
    const parsed = parseGeneratedQuestions(responseText, config);
    textQuestions = parsed.questions;
  } else if (textCount > 0 && !hasTextTypes) {
    // Only spatial types selected but we still need placeholder text questions — skip
    // all questions will come from spatial generation
  }

  // ── Generate spatial (image-based) questions ───────────────────────────────
  const spatialQuestions: Question[] = [];
  if (spatialCount > 0 && spatialTypes.length > 0) {
    // Distribute spatial count across selected spatial types evenly
    const perType = Math.ceil(spatialCount / spatialTypes.length);
    let idOffset = textQuestions.length;

    for (const spatialType of spatialTypes) {
      const countForThisType = Math.min(perType, spatialCount - spatialQuestions.length);
      if (countForThisType <= 0) break;

      // Fetch questions in parallel (max 3 concurrent to avoid rate limits)
      const CONCURRENT = 3;
      let generated = 0;
      while (generated < countForThisType) {
        const batch = Math.min(CONCURRENT, countForThisType - generated);
        const promises = Array.from({ length: batch }, () =>
          fetchSpatialQuestion(spatialType, config.difficulty, SPATIAL_TYPE_MAP[spatialType])
        );
        const results = await Promise.allSettled(promises);

        for (const result of results) {
          if (result.status === 'fulfilled') {
            idOffset++;
            spatialQuestions.push({
              id: idOffset,
              question: result.value.question,
              options: result.value.options.map((text: string, i: number) => ({
                id: String.fromCharCode(65 + i),
                text,
              })),
              correctAnswer: String.fromCharCode(65 + result.value.correct),
              explanation: result.value.explanation,
              category: 'Spatial Reasoning',
              difficulty: (config.difficulty === 'mixed' ? 'medium' : config.difficulty) as 'easy' | 'medium' | 'hard',
              type: spatialType as Question['type'],
              // Attach the generated image (may be null on fallback)
              ...(result.value.spatialImage ? { spatialImage: result.value.spatialImage } : {}),
            } as Question);
          }
          generated++;
        }
      }
    }
  }

  const allQuestions = [...textQuestions, ...spatialQuestions];

  // Re-use metadata calculation from text result if available; otherwise build a simple one
  const metadata = calculateMetadata(allQuestions, config);
  return { questions: allQuestions, metadata };
}

/**
 * Generate one image-based spatial question by calling the shared lib directly (no HTTP).
 */
async function fetchSpatialQuestion(
  configType: string,
  difficulty: string,
  spatialType: SpatialType
): Promise<{ question: string; options: string[]; correct: number; explanation: string; spatialImage: string | null }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
  const result = await generateSpatialQuestion(spatialType, difficulty, apiKey);
  return {
    question: result.question,
    options: result.options,
    correct: result.correct,
    explanation: result.explanation,
    spatialImage: result.spatialImage,
  };
}

/**
 * Extract existing questions from content and fill in missing fields
 * Now with intelligent batching to handle large question sets
 */
async function extractAndCompleteQuestions(
  content: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  // Use frontend's count if provided, otherwise estimate
  let estimatedQuestions = config.estimatedQuestionCount || estimateQuestionCount(content);

  if (config.estimatedQuestionCount) {
    console.log(`Using frontend-provided count: ${estimatedQuestions} questions`);
  } else {
    console.log(`Estimated ${estimatedQuestions} questions in content (backend detection)`);
  }

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

  // Try to find question boundaries - use same patterns as frontend for consistency
  const questionBoundaries: number[] = [];
  const patterns = [
    /\d+\.\s*[A-Z]/gi,           // "1. What" - same as frontend
    /Question\s*\d+/gi,           // "Question 1"
    /Q\d+[\.:]/gi,                // "Q1:" or "Q1."
    /^\s*\d+\.\s/gm,              // "1. " at line start
    /^\s*\d+\)\s+[A-Z]/gm,        // "1) What"
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

  console.log(`Found ${sortedBoundaries.length} question boundaries`);

  if (sortedBoundaries.length === 0) {
    console.log('No boundaries found, splitting by character count');
    // If can't detect boundaries, split by character count
    const charsPerBatch = Math.ceil(content.length / Math.ceil(estimateQuestionCount(content) / questionsPerBatch));
    for (let i = 0; i < content.length; i += charsPerBatch) {
      batches.push(content.substring(i, i + charsPerBatch));
    }
    console.log(`Created ${batches.length} batches by character count`);
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

  console.log(`Created ${batches.length} batches from ${sortedBoundaries.length} boundaries`);
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
  const ai = getGeminiClient();

  // Try gemini-3-flash-preview first, fallback to gemini-3-flash-preview if overloaded
  const modelName = retryCount > 0 ? 'gemini-3-flash-preview' : 'gemini-3-flash-preview';

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
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || '';
    console.log('Extraction response length:', text.length);

    return parseGeneratedQuestions(text, config);
  } catch (error: any) {
    console.error('extractBatch error:', error?.message, error?.status, error?.code);

    // Only retry on transient 503 errors, NOT quota/rate limit errors
    const msg = error.message || '';
    const is503 = msg.includes('503') || msg.includes('overloaded');
    const isQuotaOrRate = msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rateLimitExceeded');

    if (is503 && !isQuotaOrRate && retryCount === 0) {
      console.log('Model overloaded (503), retrying after delay...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return extractBatch(content, expectedQuestions, config, 1);
    }

    throw new Error(`Failed to extract/complete questions: ${msg || 'Unknown error'}`);
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

  // Process batches sequentially to avoid rate limits
  for (let batchIndex = 0; batchIndex < contentBatches.length; batchIndex++) {
    const batchContent = contentBatches[batchIndex];

    console.log(`Processing batch ${batchIndex + 1}/${contentBatches.length}...`);

    try {
      const result = await extractBatch(batchContent, QUESTIONS_PER_BATCH, config);
      batchResults.push({ batchIndex, result, error: undefined });
    } catch (error) {
      console.error(`Batch ${batchIndex + 1} failed:`, error);
      batchResults.push({ batchIndex, result: null, error });
    }

    // Delay between batches to stay within rate limits
    if (batchIndex < contentBatches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
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
  const ai = getGeminiClient();

  // Try gemini-3-flash-preview first, fallback to gemini-3-flash-preview if overloaded
  const modelName = retryCount > 0 ? 'gemini-3-flash-preview' : 'gemini-3-flash-preview';

  // Build the prompt based on configuration
  const prompt = buildPrompt(content, config);

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
      },
    });

    const text = response.text || '';
    console.log('Generation response length:', text.length);

    // Parse the JSON response
    const parsedResponse = parseGeneratedQuestions(text, config);

    return parsedResponse;
  } catch (error: any) {
    console.error('generateQuestions error:', error?.message, error?.status, error?.code);

    const msg = error.message || '';
    const is503 = msg.includes('503') || msg.includes('overloaded');
    const isQuotaOrRate = msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('rateLimitExceeded');

    if (is503 && !isQuotaOrRate && retryCount === 0) {
      console.log('Model overloaded (503), retrying after delay...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return generateQuestions(content, config, 1);
    }

    throw new Error(`Failed to generate questions: ${msg || 'Unknown error'}`);
  }
}

/**
 * Generate questions using Google Search grounding with STEM-focused sources
 * Enhanced to prioritize academic, textbook, and curated educational materials
 */
export async function generateQuestionsFromSearch(
  searchQuery: string,
  config: GenerationConfig
): Promise<{ questions: Question[]; metadata: QuestionSetMetadata }> {
  const ai = getGeminiClient();

  // Enhance search query with STEM-focused source preferences
  const stemSources = getSTEMSourceGuidance(config.subject);

  const prompt = `You are an expert exam question generator with access to Google Search. Research "${searchQuery}" and generate ${config.numberOfQuestions} exam questions.

SEARCH GUIDANCE:
${stemSources}

Subject: ${config.subject}
Difficulty: ${config.difficulty}
Question Types: ${config.questionTypes.join(', ')}
${config.topicFocus ? `Focus on: ${config.topicFocus}` : ''}

RESEARCH PRIORITIES:
1. Academic textbooks and university course materials
2. Peer-reviewed papers and research publications (arXiv, IEEE, ACM, Nature, Science)
3. Educational resources from MIT OpenCourseWare, Khan Academy, Coursera
4. Technical documentation and official standards
5. Respected educational publishers (Pearson, Springer, O'Reilly)

Generate questions based on accurate, authoritative information from these sources.

JSON Output Format:
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
      "explanation": "Detailed explanation with reference to authoritative sources when possible",
      "difficulty": "easy|medium|hard",
      "type": "multiple-choice|true-false|scenario",
      "category": "Specific topic or subtopic"
    }
  ]
}

QUALITY REQUIREMENTS:
- Base questions on academically accurate, peer-reviewed information
- Each question must be clear, specific, and unambiguous
- Provide 4 options for multiple-choice (A, B, C, D)
- For true-false, provide 2 options (A=True, B=False)
- Include detailed explanations referencing key concepts
- Distribute difficulty levels appropriately
- Make distractors (incorrect options) plausible but clearly incorrect
- Avoid trivial or overly easy questions
- Ensure technical accuracy

Return ONLY the JSON object, no additional text.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        maxOutputTokens: 8192,
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || '';
    console.log('Search generation response length:', text.length);

    return parseGeneratedQuestions(text, config);
  } catch (error) {
    throw new Error(`Failed to generate questions from search: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get STEM-focused source guidance based on subject area
 * Inspired by lunch-stem's curated source approach
 */
function getSTEMSourceGuidance(subject: string): string {
  const subjectLower = subject.toLowerCase();

  // Computer Science & Technology
  if (subjectLower.includes('computer') || subjectLower.includes('programming') ||
      subjectLower.includes('software') || subjectLower.includes('algorithm')) {
    return `Prioritize sources like:
- ACM Digital Library, IEEE Xplore for research papers
- Computer Science textbooks (Cormen, Knuth, Tanenbaum, Sipser)
- MIT OpenCourseWare Computer Science courses
- Official documentation (Python, Java, C++, etc.)
- arXiv.org Computer Science section
- Stanford, MIT, Berkeley CS course materials`;
  }

  // Mathematics
  if (subjectLower.includes('math') || subjectLower.includes('calculus') ||
      subjectLower.includes('algebra') || subjectLower.includes('geometry')) {
    return `Prioritize sources like:
- Mathematics textbooks (Stewart Calculus, Linear Algebra by Strang, Abstract Algebra by Dummit)
- arXiv.org Mathematics section
- MIT OpenCourseWare Mathematics courses
- Khan Academy Math sections
- Wolfram MathWorld
- Mathematical proofs and theorem repositories`;
  }

  // Physics
  if (subjectLower.includes('physics') || subjectLower.includes('mechanics') ||
      subjectLower.includes('quantum') || subjectLower.includes('thermodynamics')) {
    return `Prioritize sources like:
- Physics textbooks (Halliday & Resnick, Feynman Lectures, Griffiths)
- arXiv.org Physics section
- Physical Review journals
- MIT OpenCourseWare Physics courses
- CERN, NASA educational resources
- Nature Physics, Physics Today`;
  }

  // Chemistry
  if (subjectLower.includes('chem')) {
    return `Prioritize sources like:
- Chemistry textbooks (Atkins, Brown & LeMay, Organic Chemistry by Clayden)
- ACS (American Chemical Society) publications
- Journal of the American Chemical Society
- MIT OpenCourseWare Chemistry courses
- IUPAC nomenclature and standards
- ChemLibreTexts educational resources`;
  }

  // Biology & Life Sciences
  if (subjectLower.includes('bio') || subjectLower.includes('life') ||
      subjectLower.includes('genetics') || subjectLower.includes('molecular')) {
    return `Prioritize sources like:
- Biology textbooks (Campbell Biology, Molecular Biology of the Cell)
- NCBI, PubMed research papers
- Nature, Science, Cell journals
- MIT OpenCourseWare Biology courses
- Khan Academy Biology sections
- University biology course materials`;
  }

  // Engineering
  if (subjectLower.includes('engineer')) {
    return `Prioritize sources like:
- Engineering textbooks (Engineering Mechanics, Circuit Analysis, Thermodynamics)
- IEEE, ASME, ASCE publications
- Engineering standards (ISO, ANSI, ASTM)
- MIT OpenCourseWare Engineering courses
- University engineering course materials
- Professional engineering handbooks`;
  }

  // Arts & Humanities
  if (subjectLower.includes('art') || subjectLower.includes('humanities') ||
      subjectLower.includes('history') || subjectLower.includes('literature')) {
    return `Prioritize sources like:
- Academic humanities textbooks and anthologies
- JSTOR, Project MUSE for scholarly articles
- Stanford Encyclopedia of Philosophy
- Museum and cultural institution resources
- University humanities course materials
- Respected literary and historical analyses`;
  }

  // Default: General STEM
  return `Prioritize sources like:
- Academic textbooks from respected publishers
- Peer-reviewed research papers and journals
- University course materials and lecture notes
- arXiv.org, Google Scholar indexed papers
- Educational resources (MIT OCW, Khan Academy, Coursera)
- Official technical documentation and standards`;
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

    // Remove markdown code blocks (handle all variations)
    jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*$/gm, '').replace(/^```\s*/gm, '');

    // Try to extract JSON object if there's extra text (thinking tokens, explanations, etc.)
    const firstBrace = jsonText.indexOf('{');
    const lastBrace = jsonText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && firstBrace < lastBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1);
    }

    // Clean up common JSON issues before parsing
    jsonText = jsonText
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/[\x00-\x1F\x7F]/g, (match) => {
        // Preserve newlines and tabs inside strings, remove other control chars
        if (match === '\n' || match === '\r' || match === '\t') return match;
        return '';
      })
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (parseError) {
      // Try to fix truncated JSON
      console.error('Initial parse failed, attempting to fix JSON...');
      console.error('JSON length:', jsonText.length);
      console.error('First 500 chars:', jsonText.substring(0, 500));
      console.error('Last 500 chars:', jsonText.substring(Math.max(0, jsonText.length - 500)));

      // Attempt 1: Fix unescaped control characters in string values
      try {
        const fixedNewlines = jsonText.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n');
        parsed = JSON.parse(fixedNewlines);
      } catch {
        // Attempt 2: Fix truncated JSON (missing closing brackets)
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
