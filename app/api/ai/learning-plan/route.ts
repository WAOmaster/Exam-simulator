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
      diagnosis,
      question,
      options,
      correctAnswer,
      userAnswer,
      category,
    } = body;

    if (!question && !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const correctOptionText = options?.find((opt: any) => opt.id === correctAnswer)?.text || 'N/A';
    const userOptionText = options?.find((opt: any) => opt.id === userAnswer)?.text || 'N/A';

    const diagnosisContext = diagnosis
      ? `
COGNITIVE COMPANION DIAGNOSIS:
- Primary Issue: ${diagnosis.primaryDiagnosis}
- Explanation: ${diagnosis.diagnosticExplanation}
- Concept to Review: ${diagnosis.remediation?.conceptToReview || 'N/A'}
- Practice Hint: ${diagnosis.remediation?.practiceHint || 'N/A'}`
      : '';

    const prompt = `You are an expert educational AI creating a personalized interactive learning module.

CONTEXT:
A student answered incorrectly and needs targeted remediation.
${diagnosisContext}

Original Question: ${question}
Options:
${options?.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n') || 'N/A'}
Student's Wrong Answer: ${userAnswer}. ${userOptionText}
Correct Answer: ${correctAnswer}. ${correctOptionText}
Category: ${category || 'General'}

CREATE an interactive learning plan with 4 steps to close this knowledge gap:

STEP 1 - SOCRATIC OPENER:
A thought-provoking question that probes the ROOT concept behind their error.
- 4 options (one clearly correct)
- A hint if they get stuck
- Expected insight: what they should realize from answering correctly

STEP 2 - VISUAL EXPLANATION:
Provide a clear conceptual explanation with visual structure.
- "description": 2-3 sentence explanation of the core concept
- "key_concepts": 3-5 bullet points breaking down the concept into key parts (each max 20 words)
- "key_takeaway": One-sentence main lesson

STEP 3 - PRACTICE QUESTIONS:
Create 3 targeted practice questions with increasing difficulty.
- Start EASY, then MEDIUM, then HARD
- Each tests the same core concept from different angles
- Clear explanations for each

STEP 4 - VERIFICATION:
A challenging question to verify the gap is closed.
- Similar difficulty to the original question
- Success message: encouraging, celebrates mastery
- Retry message: supportive, suggests reviewing again

Return EXACTLY this JSON structure:
{
  "module_title": "Understanding [Concept]",
  "estimated_minutes": 8,
  "socratic_opener": {
    "question": "...",
    "expected_insight": "...",
    "hint_if_stuck": "...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0
  },
  "visual_explanation": {
    "description": "...",
    "key_concepts": ["concept 1", "concept 2", "concept 3"],
    "key_takeaway": "..."
  },
  "practice_questions": [
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "easy"
    },
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "medium"
    },
    {
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "...",
      "difficulty": "hard"
    }
  ],
  "verification": {
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_index": 0,
    "success_message": "...",
    "retry_message": "..."
  },
  "grounded_sources": [
    { "title": "...", "url": "..." }
  ]
}

RULES:
- Module should take ~8 minutes
- Socratic question should be simpler than the original
- Practice questions: exactly 3, increasing difficulty
- All explanations: clear, concise, educational (max 40 words each)
- correct_index must be 0-3
- Return ONLY valid JSON, no markdown`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        maxOutputTokens: 4096,
        temperature: 0.6,
        tools: [{ googleSearch: {} }],
      },
    });

    const mainText = response.text || '';

    // Extract grounding sources from response metadata
    const groundingSources: Array<{ title: string; url: string }> = [];
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata?.groundingChunks) {
      for (const chunk of candidate.groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          groundingSources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
          });
        }
      }
    }

    let learningPlan;
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
      learningPlan = JSON.parse(jsonText);
    } catch {
      // Fallback learning plan
      learningPlan = buildFallbackPlan(question, correctOptionText, userOptionText, category);
    }

    // Merge grounded sources from API if the plan doesn't have good ones
    if (groundingSources.length > 0 && (!learningPlan.grounded_sources || learningPlan.grounded_sources.length === 0)) {
      learningPlan.grounded_sources = groundingSources.slice(0, 3);
    }

    return NextResponse.json({
      success: true,
      learningPlan,
    });
  } catch (error: any) {
    console.error('Learning Plan Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate learning plan',
      },
      { status: 500 }
    );
  }
}

function buildFallbackPlan(
  question: string,
  correctAnswer: string,
  userAnswer: string,
  category: string
) {
  return {
    module_title: `Understanding ${category || 'this concept'}`,
    estimated_minutes: 8,
    socratic_opener: {
      question: `Which statement best describes the core concept behind this topic: ${category || 'the subject'}?`,
      expected_insight: 'Understanding the fundamental concept helps answer related questions correctly.',
      hint_if_stuck: 'Think about what makes each option distinct from the others.',
      options: [
        'It involves understanding key relationships between concepts',
        'It is purely based on memorization',
        'It has no practical applications',
        'It cannot be broken down into simpler parts',
      ],
      correct_index: 0,
    },
    visual_explanation: {
      description: `The correct answer is "${correctAnswer}" because it aligns with the core principles of ${category || 'this topic'}. Your answer "${userAnswer}" reflects a common misconception.`,
      key_concepts: [
        'Identify the core principle being tested',
        'Distinguish between similar-sounding options',
        'Apply the concept to the specific context given',
      ],
      key_takeaway: 'Focus on understanding WHY the correct answer is right, not just memorizing it.',
    },
    practice_questions: [
      {
        question: 'What is the most important step when approaching a conceptual question?',
        options: [
          'Identify the key concept being tested',
          'Choose the longest answer',
          'Pick the first option',
          'Skip and come back later',
        ],
        correct_index: 0,
        explanation: 'Identifying the key concept helps you evaluate each option against the right criteria.',
        difficulty: 'easy' as const,
      },
      {
        question: 'When two answer options seem similar, what should you do?',
        options: [
          'Pick either one randomly',
          'Look for the subtle difference that matters',
          'Choose neither',
          'Skip the question',
        ],
        correct_index: 1,
        explanation: 'Similar options often test whether you understand the precise distinction between related concepts.',
        difficulty: 'medium' as const,
      },
      {
        question: 'How can you verify your understanding of a concept?',
        options: [
          'Only re-read the definition',
          'Ask someone else',
          'Apply it to a new scenario and check your reasoning',
          'Memorize more examples',
        ],
        correct_index: 2,
        explanation: 'Applying concepts to new scenarios tests true understanding rather than surface-level recall.',
        difficulty: 'hard' as const,
      },
    ],
    verification: {
      question: `Reflecting on the original question about ${category || 'this topic'}, what approach would help you answer correctly?`,
      options: [
        'Carefully analyze what the question is really asking',
        'Look for keyword matches only',
        'Choose the most complex-sounding option',
        'Rely on intuition alone',
      ],
      correct_index: 0,
      success_message: 'Excellent! You now understand the approach to tackle these questions confidently.',
      retry_message: 'Not quite yet. Try reviewing the visual explanation again to reinforce the concept.',
    },
    grounded_sources: [],
  };
}
