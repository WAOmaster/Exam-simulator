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
      responseTimeMs,
      selectionChanges,
      consecutiveIncorrect,
      category,
      difficulty,
    } = body;

    if (!question || !correctAnswer || !userAnswer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const correctOptionText = options?.find((opt: any) => opt.id === correctAnswer)?.text || 'N/A';
    const userOptionText = options?.find((opt: any) => opt.id === userAnswer)?.text || 'N/A';

    // Behavioral signal analysis context
    const behavioralContext = `
BEHAVIORAL SIGNALS:
- Response time: ${responseTimeMs}ms (${responseTimeMs < 5000 ? 'FAST - potential careless error' : responseTimeMs > 30000 ? 'SLOW - student was uncertain or struggling' : 'MODERATE'})
- Answer changes before submit: ${selectionChanges} (${selectionChanges > 2 ? 'HIGH - significant uncertainty' : selectionChanges > 0 ? 'SOME hesitation' : 'Confident first choice'})
- Consecutive incorrect answers: ${consecutiveIncorrect} (${consecutiveIncorrect >= 3 ? 'PATTERN - possible prerequisite knowledge gap' : consecutiveIncorrect > 0 ? 'Recent mistakes' : 'No streak'})
- Question category: ${category || 'General'}
- Question difficulty: ${difficulty || 'unknown'}`;

    const prompt = `You are a cognitive diagnostic AI tutor. Analyze a student's incorrect answer with deep reasoning.

QUESTION: ${question}

OPTIONS:
${options?.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n') || 'N/A'}

STUDENT'S ANSWER: ${userAnswer}. ${userOptionText}
CORRECT ANSWER: ${correctAnswer}. ${correctOptionText}

${behavioralContext}

Analyze the student's error and provide a diagnostic assessment. Consider:
1. WHY did they choose ${userAnswer} instead of ${correctAnswer}?
2. What misconception or knowledge gap led to this error?
3. Is this a careless mistake, conceptual misunderstanding, or prerequisite gap?

Return your analysis as JSON:
{
  "hypotheses": [
    {
      "type": "misconception|prerequisite_gap|careless_error|time_pressure|partial_knowledge",
      "confidence": 0.0-1.0,
      "reasoning": "Brief explanation of this hypothesis (max 30 words)"
    }
  ],
  "primaryDiagnosis": "The most likely error type from hypotheses",
  "emotionalTone": "encouraging|empathetic|challenging|supportive",
  "diagnosticExplanation": "2-3 sentence explanation of what went wrong and why (max 60 words)",
  "remediation": {
    "immediateAction": "What to do right now (max 20 words)",
    "conceptToReview": "Specific concept to study (max 15 words)",
    "practiceHint": "A hint for similar questions (max 25 words)"
  }
}

RULES:
- Provide exactly 3 hypotheses, ranked by confidence (highest first)
- Keep ALL text concise
- Choose emotionalTone based on behavioral signals:
  * 3+ consecutive wrong → "empathetic"
  * Fast answer → "encouraging" (likely careless)
  * Slow + many changes → "supportive" (struggling)
  * Otherwise → "challenging" (push to learn)
- Return ONLY the JSON object`;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    });

    const thinkingSteps: string[] = [];

    const mainText = response.text || '';

    // Parse the main response as JSON
    let diagnosis;
    try {
      let jsonText = mainText.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }
      const jsonStart = jsonText.indexOf('{');
      const jsonEnd = jsonText.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      }
      diagnosis = JSON.parse(jsonText);
    } catch {
      // Fallback diagnosis if parsing fails
      diagnosis = {
        hypotheses: [
          {
            type: 'misconception',
            confidence: 0.7,
            reasoning: 'The student may have confused related concepts.',
          },
          {
            type: 'partial_knowledge',
            confidence: 0.5,
            reasoning: 'Incomplete understanding of the topic.',
          },
          {
            type: 'careless_error',
            confidence: 0.3,
            reasoning: 'May have misread the question or options.',
          },
        ],
        primaryDiagnosis: 'misconception',
        emotionalTone: consecutiveIncorrect >= 3 ? 'empathetic' : 'encouraging',
        diagnosticExplanation: `You selected "${userOptionText}" but the correct answer is "${correctOptionText}". Review the key differences between these concepts.`,
        remediation: {
          immediateAction: 'Re-read the question carefully',
          conceptToReview: category || 'Core concepts',
          practiceHint: 'Focus on distinguishing similar options',
        },
      };
    }

    return NextResponse.json({
      success: true,
      diagnosis,
      thinkingProcess: thinkingSteps,
    });
  } catch (error: any) {
    console.error('Cognitive Companion Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate diagnosis',
      },
      { status: 500 }
    );
  }
}
