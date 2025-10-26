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

    if (isCorrect) {
      prompt = `You are an Oracle Cloud Infrastructure (OCI) certification expert. A student answered a question correctly.

Question: ${question}

Options:
${options.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Please provide a clear and concise explanation of why answer ${correctAnswer} is correct. Focus on the key OCI concepts and best practices. Keep it under 150 words.`;
    } else {
      prompt = `You are an Oracle Cloud Infrastructure (OCI) certification expert. A student answered a question incorrectly.

Question: ${question}

Options:
${options.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n')}

Correct Answer: ${correctAnswer}
Student's Answer: ${userAnswer}

Please provide:
1. Why the correct answer (${correctAnswer}) is right
2. Why the student's answer (${userAnswer}) is wrong
3. Why the other options are incorrect

Keep the explanation clear, concise, and educational. Focus on OCI concepts. Keep it under 200 words.`;
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
