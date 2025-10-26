import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Gemini AI
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

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

    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();

    return NextResponse.json({
      explanation,
      isCorrect,
      correctAnswer,
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
