import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, options, correctAnswer, userAnswer, isCorrect } = body;

    if (!question || !options || !correctAnswer) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create the prompt based on whether the answer was correct or not
    let prompt: string;

    const correctOptionText = options.find((opt: any) => opt.id === correctAnswer)?.text || 'N/A';
    const userOptionText = options.find((opt: any) => opt.id === userAnswer)?.text || 'N/A';

    if (isCorrect) {
      prompt = `You are an expert exam tutor providing positive reinforcement for a correct answer.

Question: ${question}

Correct Answer: ${correctAnswer}. ${correctOptionText}

Provide a concise explanation (100-150 words) that:
1. Confirms why this answer is correct
2. Explains the key concepts behind it
3. Mentions practical applications or use cases

Use clear formatting with **bold** for key terms and numbered lists where appropriate.`;
    } else {
      prompt = `You are an expert exam tutor helping a student learn from their mistake.

Question: ${question}

Options:
${options.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n')}

Student's Answer: ${userAnswer}. ${userOptionText}
Correct Answer: ${correctAnswer}. ${correctOptionText}

Provide a clear explanation (150-200 words) that:
1. Explains why the correct answer (${correctAnswer}) is right
2. Clarifies why the student's answer (${userAnswer}) is incorrect
3. Briefly notes why other options don't fit

Use clear formatting with **bold** for key terms and numbered lists where appropriate. Be encouraging but educational.`;
    }

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const explanation = response.text || '';

    // Extract grounding sources if available
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources = (groundingMetadata as any)?.groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || '',
      url: chunk.web?.uri || '',
    })).filter((s: any) => s.url) || [];

    return NextResponse.json({
      explanation,
      isCorrect,
      correctAnswer,
      sources,
    });
  } catch (error: any) {
    console.error('Gemini API Error:', error);

    // Provide helpful error messages
    if (error.message?.includes('API key')) {
      return NextResponse.json(
        {
          error:
            'API key not configured. Please add GEMINI_API_KEY to your .env.local file.',
          details: 'Get your free API key from https://makersuite.google.com/app/apikey',
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to generate explanation',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
