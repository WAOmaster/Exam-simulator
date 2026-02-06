import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

interface SolutionRequest {
  image: string; // base64 encoded
  mimeType: string;
  mode: 'hints' | 'step_by_step' | 'full_solution' | 'analysis';
  subject?: string;
  generateQuestions?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body: SolutionRequest = await request.json();
    const { image, mimeType, mode, subject, generateQuestions } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    // Build prompt based on mode
    let modeInstructions = '';
    switch (mode) {
      case 'hints':
        modeInstructions = `Provide 3-5 helpful hints that guide the student toward the solution WITHOUT giving away the answer directly. Each hint should build on the previous one, starting from general concepts and getting more specific.`;
        break;
      case 'step_by_step':
        modeInstructions = `Provide a detailed step-by-step solution with clear numbered steps. Each step should be self-contained and explain the reasoning behind it.`;
        break;
      case 'full_solution':
        modeInstructions = `Provide a complete, detailed solution with full explanation. Include all calculations, reasoning, and the final answer. Explain any formulas or concepts used.`;
        break;
      case 'analysis':
        modeInstructions = `Analyze this problem thoroughly. Identify the type of problem, required knowledge, potential approaches, and common pitfalls. Do NOT solve the problem directly.`;
        break;
    }

    const prompt = `You are an expert tutor analyzing a problem from an image. The problem could be from any subject: mathematics, physics, chemistry, biology, engineering, economics, or any other academic field.

${subject ? `Subject hint: ${subject}` : 'First, identify what subject/field this problem is from.'}

${modeInstructions}

Respond in valid JSON format with this structure:
{
  "problemIdentification": "Clear description of what the problem is asking",
  "subject": "The academic subject (e.g., Calculus, Physics, Organic Chemistry)",
  "difficulty": "easy" | "medium" | "hard",
  "content": "Main explanation or solution text",
  ${mode === 'hints' ? '"hints": ["hint1", "hint2", "hint3"],' : ''}
  ${mode === 'step_by_step' ? '"steps": ["step1", "step2", ...],' : ''}
  "keyConcepts": ["concept1", "concept2", ...],
  "commonMistakes": ["mistake1", "mistake2", ...]
}

Important:
- Be thorough but concise
- Use proper mathematical notation where needed (use Unicode symbols or LaTeX-like notation)
- Explain concepts at an undergraduate level
- Return ONLY valid JSON, no markdown code blocks`;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inlineData: { mimeType, data: image } },
          ],
        },
      ],
      config: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const responseText = response.text || '';

    // Parse JSON from response
    let solution;
    try {
      // Remove potential markdown code blocks
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      solution = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse AI response',
          rawResponse: responseText.substring(0, 500),
        },
        { status: 500 }
      );
    }

    // Generate practice questions if requested
    let generatedQuestions = undefined;
    if (generateQuestions) {
      const questionPrompt = `Based on the following problem, generate 3 practice multiple-choice questions to test understanding of the same concepts.

Original problem: ${solution.problemIdentification}
Subject: ${solution.subject}
Key concepts: ${solution.keyConcepts.join(', ')}

Generate 3 questions in this JSON format:
[
  {
    "question": "Question text",
    "options": [
      {"id": "A", "text": "Option A"},
      {"id": "B", "text": "Option B"},
      {"id": "C", "text": "Option C"},
      {"id": "D", "text": "Option D"}
    ],
    "correctAnswer": "A",
    "explanation": "Why this is correct",
    "category": "${solution.subject}",
    "difficulty": "medium"
  }
]

Return ONLY valid JSON array.`;

      try {
        const questionResponse = await getAI().models.generateContent({
          model: 'gemini-2.5-flash',
          contents: questionPrompt,
          config: {
            temperature: 0.5,
            maxOutputTokens: 2048,
          },
        });

        const questionText = questionResponse.text || '';
        const cleanedQuestionText = questionText
          .replace(/```json\s*/g, '')
          .replace(/```\s*/g, '')
          .trim();

        generatedQuestions = JSON.parse(cleanedQuestionText).map(
          (q: any, index: number) => ({
            ...q,
            id: Date.now() + index,
            type: 'multiple-choice',
          })
        );
      } catch (err) {
        console.error('Failed to generate questions:', err);
        // Continue without questions
      }
    }

    return NextResponse.json({
      success: true,
      solution: {
        problemIdentification: solution.problemIdentification || '',
        subject: solution.subject || subject || 'General',
        difficulty: solution.difficulty || 'medium',
        content: solution.content || '',
        steps: solution.steps,
        hints: solution.hints,
        keyConcepts: solution.keyConcepts || [],
        commonMistakes: solution.commonMistakes || [],
      },
      generatedQuestions,
    });
  } catch (error: any) {
    console.error('Visual Solver API Error:', error);

    if (error.message?.includes('API key')) {
      return NextResponse.json(
        {
          success: false,
          error: 'API key not configured',
          details: 'Please add GEMINI_API_KEY to your environment variables.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to analyze image',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
