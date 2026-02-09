import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60; // Longer timeout for batch processing

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

interface QuestionItem {
  questionId: number;
  question: string;
  options: { id: string; text: string }[];
  correctAnswer: string;
  userAnswer: string;
  responseTimeMs: number;
  selectionChanges: number;
  consecutiveIncorrect: number;
  category: string;
  difficulty: string;
}

function buildQuestionBlock(item: QuestionItem, index: number): string {
  const correctText = item.options?.find((opt) => opt.id === item.correctAnswer)?.text || 'N/A';
  const userText = item.options?.find((opt) => opt.id === item.userAnswer)?.text || 'N/A';

  return `--- QUESTION ${index + 1} (ID: ${item.questionId}) ---
QUESTION: ${item.question}
OPTIONS:
${item.options?.map((opt) => `${opt.id}. ${opt.text}`).join('\n') || 'N/A'}
STUDENT'S ANSWER: ${item.userAnswer}. ${userText}
CORRECT ANSWER: ${item.correctAnswer}. ${correctText}
BEHAVIORAL SIGNALS:
- Response time: ${item.responseTimeMs}ms (${item.responseTimeMs < 5000 ? 'FAST' : item.responseTimeMs > 30000 ? 'SLOW' : 'MODERATE'})
- Answer changes: ${item.selectionChanges} (${item.selectionChanges > 2 ? 'HIGH uncertainty' : item.selectionChanges > 0 ? 'SOME hesitation' : 'Confident'})
- Consecutive incorrect: ${item.consecutiveIncorrect}
- Category: ${item.category || 'General'}
- Difficulty: ${item.difficulty || 'unknown'}`;
}

function buildBatchPrompt(items: QuestionItem[]): string {
  const questionBlocks = items.map((item, i) => buildQuestionBlock(item, i)).join('\n\n');

  return `You are a cognitive diagnostic AI tutor. Analyze ${items.length} incorrect answers from a student with deep reasoning.

${questionBlocks}

For EACH question, analyze:
1. WHY did the student choose wrong?
2. What misconception or knowledge gap caused this?
3. Is it a careless mistake, conceptual misunderstanding, or prerequisite gap?

Return a JSON array with one diagnosis per question, in the SAME ORDER:
[
  {
    "questionId": <number>,
    "hypotheses": [
      {
        "type": "misconception|prerequisite_gap|careless_error|time_pressure|partial_knowledge",
        "confidence": 0.0-1.0,
        "reasoning": "Brief explanation (max 30 words)"
      }
    ],
    "primaryDiagnosis": "The most likely error type",
    "emotionalTone": "encouraging|empathetic|challenging|supportive",
    "diagnosticExplanation": "2-3 sentence explanation (max 60 words)",
    "remediation": {
      "immediateAction": "What to do right now (max 20 words)",
      "conceptToReview": "Specific concept to study (max 15 words)",
      "practiceHint": "A hint for similar questions (max 25 words)"
    }
  }
]

RULES:
- Return diagnoses for ALL ${items.length} questions
- Provide exactly 3 hypotheses per question, ranked by confidence
- Keep ALL text concise
- Choose emotionalTone: 3+ consecutive wrong → "empathetic", fast answer → "encouraging", slow + many changes → "supportive", otherwise → "challenging"
- Return ONLY the JSON array, nothing else`;
}

function createFallbackDiagnosis(item: QuestionItem) {
  const correctText = item.options?.find((opt) => opt.id === item.correctAnswer)?.text || 'N/A';
  const userText = item.options?.find((opt) => opt.id === item.userAnswer)?.text || 'N/A';

  return {
    questionId: item.questionId,
    hypotheses: [
      { type: 'misconception', confidence: 0.7, reasoning: 'The student may have confused related concepts.' },
      { type: 'partial_knowledge', confidence: 0.5, reasoning: 'Incomplete understanding of the topic.' },
      { type: 'careless_error', confidence: 0.3, reasoning: 'May have misread the question or options.' },
    ],
    primaryDiagnosis: 'misconception',
    emotionalTone: item.consecutiveIncorrect >= 3 ? 'empathetic' : 'encouraging',
    diagnosticExplanation: `You selected "${userText}" but the correct answer is "${correctText}". Review the key differences between these concepts.`,
    remediation: {
      immediateAction: 'Re-read the question carefully',
      conceptToReview: item.category || 'Core concepts',
      practiceHint: 'Focus on distinguishing similar options',
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Support both single and batch requests
    const items: QuestionItem[] = body.batch || [body];

    if (items.length === 0 || !items[0].question) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = buildBatchPrompt(items);

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.HIGH,
          includeThoughts: true,
        },
      },
    });

    // Extract thinking steps
    const thinkingSteps: string[] = [];
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if ((part as any).thought && (part as any).text) {
        thinkingSteps.push((part as any).text);
      }
    }

    const mainText = response.text || '';

    // Parse response
    let diagnoses: any[];
    try {
      let jsonText = mainText.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1].trim();
      }

      // Find array or object
      const arrayStart = jsonText.indexOf('[');
      const objStart = jsonText.indexOf('{');

      if (arrayStart !== -1 && (arrayStart < objStart || objStart === -1)) {
        const arrayEnd = jsonText.lastIndexOf(']');
        jsonText = jsonText.substring(arrayStart, arrayEnd + 1);
        diagnoses = JSON.parse(jsonText);
      } else if (objStart !== -1) {
        const objEnd = jsonText.lastIndexOf('}');
        jsonText = jsonText.substring(objStart, objEnd + 1);
        diagnoses = [JSON.parse(jsonText)];
      } else {
        throw new Error('No JSON found');
      }

      // Ensure we have a diagnosis for every question
      if (!Array.isArray(diagnoses)) diagnoses = [diagnoses];
    } catch {
      // Fallback for all items
      diagnoses = items.map((item) => createFallbackDiagnosis(item));
    }

    // Map diagnoses back to question IDs, filling gaps with fallbacks
    const resultMap: Record<number, any> = {};
    diagnoses.forEach((d: any) => {
      if (d.questionId) resultMap[d.questionId] = d;
    });

    const finalDiagnoses = items.map((item, i) => {
      const found = resultMap[item.questionId] || diagnoses[i];
      if (found && found.hypotheses && found.remediation) {
        return { ...found, questionId: item.questionId };
      }
      return createFallbackDiagnosis(item);
    });

    // Return batch format if batch request, single format if single
    if (body.batch) {
      return NextResponse.json({
        success: true,
        diagnoses: finalDiagnoses,
        thinkingProcess: thinkingSteps,
      });
    }

    // Single question backward compatibility
    return NextResponse.json({
      success: true,
      diagnosis: finalDiagnoses[0],
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
