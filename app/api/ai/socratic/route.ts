import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      question,
      options,
      correctAnswer,
      userAnswer,
      conversationHistory,
    } = body;

    if (!question || !correctAnswer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const correctOptionText = options?.find((opt: any) => opt.id === correctAnswer)?.text || 'N/A';
    const userOptionText = options?.find((opt: any) => opt.id === userAnswer)?.text || 'N/A';

    // Format conversation history for context
    const historyText = conversationHistory?.length
      ? conversationHistory
          .map((msg: any) => `${msg.role === 'tutor' ? 'Tutor' : 'Student'}: ${msg.message}`)
          .join('\n')
      : '';

    const exchangeCount = conversationHistory?.length || 0;

    const prompt = `You are a Socratic tutor guiding a student to discover why their answer is wrong through questions. You must NEVER directly reveal the correct answer (${correctAnswer}: ${correctOptionText}).

EXAM QUESTION: ${question}

OPTIONS:
${options?.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n') || 'N/A'}

STUDENT'S WRONG ANSWER: ${userAnswer}. ${userOptionText}
CORRECT ANSWER (HIDDEN FROM STUDENT): ${correctAnswer}. ${correctOptionText}

${historyText ? `CONVERSATION SO FAR:\n${historyText}\n` : ''}

EXCHANGE COUNT: ${exchangeCount}

YOUR RULES:
1. NEVER reveal the correct answer directly
2. Ask probing questions about underlying concepts (2-3 sentences max)
3. Guide the student to identify their own error
4. Build on their responses to lead them to understanding
5. ${exchangeCount >= 5 ? 'The student has been trying for a while. Provide a SUBTLE hint without directly stating the answer.' : 'Be patient and encouraging.'}
6. If the student demonstrates understanding of why their answer is wrong and seems to grasp the correct concept, set isResolved to true
7. Be warm, encouraging, and concise

Respond with JSON only:
{
  "tutorMessage": "Your Socratic question or guidance (2-3 sentences max)",
  "isResolved": false,
  "hint": ${exchangeCount >= 5 ? '"A subtle hint to guide them"' : 'null'}
}

Return ONLY the JSON object.`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const text = response.text || '';

    let result;
    try {
      let jsonText = text.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      result = JSON.parse(jsonText);
    } catch {
      // Fallback response
      result = {
        tutorMessage: exchangeCount === 0
          ? "Let's think about this together. What made you choose that answer? Can you explain your reasoning?"
          : "That's an interesting perspective. Let's dig deeper into the key concept here. What do you think is the main principle being tested?",
        isResolved: false,
        hint: exchangeCount >= 5 ? 'Think carefully about the relationship between the options.' : null,
      };
    }

    return NextResponse.json({
      success: true,
      tutorMessage: result.tutorMessage,
      isResolved: result.isResolved || false,
      hint: result.hint || null,
    });
  } catch (error: any) {
    console.error('Socratic Dialogue Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate Socratic response',
      },
      { status: 500 }
    );
  }
}
