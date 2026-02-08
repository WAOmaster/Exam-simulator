import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionSummary, diagnosisSummary, weakCategories, strongCategories, weakConcepts, overallStats, trend } = body;

    if (!overallStats) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const prompt = `You are an expert educational AI creating a comprehensive, personalized study guide for a student.

STUDENT PERFORMANCE DATA:
- Total sessions completed: ${overallStats.totalSessions}
- Average score: ${overallStats.averageScore}%
- Total questions attempted: ${overallStats.totalQuestions}
- Best correct streak: ${overallStats.bestStreak}
- Average response time: ${overallStats.averageResponseTime}ms
- Recent trend: ${trend || 'stable'}

WEAK AREAS (accuracy < 70%):
${weakCategories?.map((c: any) => `- ${c.category}: ${c.accuracy}% (${c.total} questions)`).join('\n') || 'None identified yet'}

STRONG AREAS (accuracy >= 80%):
${strongCategories?.map((c: any) => `- ${c.category}: ${c.accuracy}% (${c.total} questions)`).join('\n') || 'Building data'}

COGNITIVE COMPANION DIAGNOSES:
- Total diagnoses: ${diagnosisSummary?.totalDiagnoses || 0}
- Most common error types: ${diagnosisSummary?.topErrorTypes?.map((e: any) => `${e.type} (${e.count}x)`).join(', ') || 'N/A'}
- Concepts needing review: ${weakConcepts?.slice(0, 5).map((c: any) => `"${c.conceptToReview}" in ${c.category} (${c.frequency}x)`).join(', ') || 'N/A'}

CREATE a comprehensive study guide with this exact JSON structure:
{
  "overview": "2-3 sentence personalized assessment of where the student stands (max 60 words)",
  "studyPlan": {
    "immediate": [
      {
        "title": "Action title (max 8 words)",
        "description": "What to do and why (max 25 words)",
        "category": "Related category",
        "priority": "critical|important|recommended",
        "estimatedMinutes": 15
      }
    ],
    "shortTerm": [
      {
        "title": "Action title",
        "description": "What to do and why",
        "category": "Related category",
        "priority": "critical|important|recommended",
        "estimatedMinutes": 30
      }
    ],
    "longTerm": [
      {
        "title": "Action title",
        "description": "What to do and why",
        "category": "Related category",
        "priority": "important|recommended",
        "estimatedMinutes": 45
      }
    ]
  },
  "conceptBreakdowns": [
    {
      "concept": "Concept name",
      "category": "Category",
      "explanation": "Clear, educational explanation (max 80 words)",
      "commonMistakes": ["mistake1", "mistake2"],
      "keyPoints": ["point1", "point2", "point3"],
      "practiceRecommendation": "Specific practice advice (max 20 words)"
    }
  ],
  "motivationalMessage": "Encouraging message based on their progress (max 30 words)"
}

RULES:
- immediate: 2-3 items, focus on biggest gaps, all "critical" or "important"
- shortTerm: 2-3 items, reinforcement and practice
- longTerm: 2-3 items, mastery and advanced topics
- conceptBreakdowns: 2-4 items, one per weak area (skip if no weak areas)
- Be specific to the student's actual performance data
- estimatedMinutes should be realistic (10-60 range)
- If student is new (0 sessions), provide generic study tips
- Return ONLY valid JSON, no markdown`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        tools: [{ googleSearch: {} }],
      },
    });

    const mainText = response.text || '';

    // Extract grounding sources
    const groundedSources: Array<{ title: string; url: string }> = [];
    const candidate = response.candidates?.[0];
    if (candidate?.groundingMetadata?.groundingChunks) {
      for (const chunk of candidate.groundingMetadata.groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          groundedSources.push({
            title: chunk.web.title,
            url: chunk.web.uri,
          });
        }
      }
    }

    let studyGuide;
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
      studyGuide = JSON.parse(jsonText);
    } catch {
      studyGuide = buildFallbackGuide(overallStats, weakCategories, strongCategories);
    }

    // Attach grounded sources
    if (groundedSources.length > 0) {
      studyGuide.resources = groundedSources.slice(0, 5);
    }

    return NextResponse.json({
      success: true,
      studyGuide,
    });
  } catch (error: any) {
    console.error('Study Guide API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate study guide',
      },
      { status: 500 }
    );
  }
}

function buildFallbackGuide(overallStats: any, weakCategories: any[], strongCategories: any[]) {
  const isNew = !overallStats || overallStats.totalSessions === 0;

  return {
    overview: isNew
      ? 'Welcome! Start by taking a practice exam to get personalized study recommendations. Your study guide will become more detailed as you complete more sessions.'
      : `You've completed ${overallStats.totalSessions} sessions with an average score of ${overallStats.averageScore}%. Keep practicing to improve your weak areas.`,
    studyPlan: {
      immediate: [
        {
          title: isNew ? 'Take your first practice exam' : 'Review weak categories',
          description: isNew ? 'Start with any subject to establish your baseline' : 'Focus on areas where your accuracy is below 70%',
          category: 'General',
          priority: 'critical' as const,
          estimatedMinutes: 30,
        },
      ],
      shortTerm: [
        {
          title: 'Practice regularly',
          description: 'Consistent practice is key to long-term retention',
          category: 'General',
          priority: 'important' as const,
          estimatedMinutes: 30,
        },
      ],
      longTerm: [
        {
          title: 'Master all categories',
          description: 'Aim for 80%+ accuracy across all categories',
          category: 'General',
          priority: 'recommended' as const,
          estimatedMinutes: 45,
        },
      ],
    },
    conceptBreakdowns: [],
    motivationalMessage: isNew
      ? 'Every expert was once a beginner. Start your journey today!'
      : 'Keep pushing forward — consistent practice leads to mastery.',
  };
}
