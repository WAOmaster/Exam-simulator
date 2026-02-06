import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

interface SessionRecord {
  id: string;
  timestamp: number;
  subject: string;
  score: { correct: number; total: number; percentage: number };
  categoryPerformance: Record<string, { correct: number; total: number }>;
  averageResponseTime: number;
  streaks: { max: number; final: number };
}

interface CoachRequest {
  mode: 'pre_exam' | 'during_exam' | 'post_exam';
  sessionHistory: SessionRecord[];
  currentMetrics?: {
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
    currentScore: number;
    questionsAnswered: number;
    totalQuestions: number;
  };
  subject?: string;
  latestScore?: { correct: number; total: number; percentage: number };
}

export async function POST(request: NextRequest) {
  try {
    const body: CoachRequest = await request.json();
    const { mode, sessionHistory, currentMetrics, subject, latestScore } = body;

    // Analyze historical performance
    const historyAnalysis = analyzeHistory(sessionHistory);

    let prompt = '';

    switch (mode) {
      case 'pre_exam':
        prompt = `You are an encouraging and insightful AI study coach. A student is about to start a practice exam${subject ? ` on ${subject}` : ''}.

Here's their study history:
- Total sessions: ${historyAnalysis.totalSessions}
- Average score: ${historyAnalysis.averageScore}%
- Best streak: ${historyAnalysis.bestStreak} consecutive correct
- Weak areas: ${historyAnalysis.weakCategories.join(', ') || 'None identified yet'}
- Strong areas: ${historyAnalysis.strongCategories.join(', ') || 'Still building data'}
- Recent trend: ${historyAnalysis.trend}

Provide personalized coaching advice in this JSON format:
{
  "tone": "encouraging" | "challenging" | "supportive",
  "message": "A brief, personalized greeting and encouragement (2-3 sentences)",
  "recommendations": [
    { "priority": "high" | "medium" | "low", "action": "Specific action to take", "reason": "Why this matters" }
  ],
  "focusAreas": ["topic1", "topic2"],
  "strengths": ["strength1", "strength2"]
}

Be specific and actionable. If this is their first session, be welcoming and set expectations.`;
        break;

      case 'during_exam':
        prompt = `You are a motivational AI study coach. A student is currently taking an exam.

Current progress:
- Questions answered: ${currentMetrics?.questionsAnswered || 0}/${currentMetrics?.totalQuestions || 0}
- Current streak: ${currentMetrics?.consecutiveCorrect || 0} correct in a row
- Consecutive incorrect: ${currentMetrics?.consecutiveIncorrect || 0}
- Running score: ${currentMetrics?.currentScore || 0}%

Provide brief, encouraging feedback in JSON format:
{
  "tone": "encouraging" | "challenging" | "supportive",
  "message": "Brief encouragement (1-2 sentences, max 100 characters)",
  "recommendations": []
}

${currentMetrics?.consecutiveCorrect && currentMetrics.consecutiveCorrect >= 3 ? 'They are on a hot streak! Celebrate this.' : ''}
${currentMetrics?.consecutiveIncorrect && currentMetrics.consecutiveIncorrect >= 2 ? 'They are struggling. Be supportive and encouraging.' : ''}`;
        break;

      case 'post_exam':
        prompt = `You are a thoughtful AI study coach. A student just completed an exam.

Results:
- Score: ${latestScore?.correct || 0}/${latestScore?.total || 0} (${latestScore?.percentage || 0}%)

Historical context:
- Total sessions: ${historyAnalysis.totalSessions}
- Average score: ${historyAnalysis.averageScore}%
- Trend: ${historyAnalysis.trend}
- Weak areas: ${historyAnalysis.weakCategories.join(', ') || 'None identified'}
- Strong areas: ${historyAnalysis.strongCategories.join(', ') || 'Building data'}

Provide detailed post-exam coaching in JSON format:
{
  "tone": "encouraging" | "challenging" | "supportive",
  "message": "Personalized summary of their performance (2-3 sentences)",
  "recommendations": [
    { "priority": "high" | "medium" | "low", "action": "Specific improvement action", "reason": "Why this will help" }
  ],
  "focusAreas": ["area1", "area2"],
  "strengths": ["strength1", "strength2"],
  "studyPlan": {
    "today": ["action1", "action2"],
    "thisWeek": ["action1", "action2"],
    "goals": ["goal1", "goal2"]
  }
}

Be specific, constructive, and encouraging. Celebrate improvements while identifying areas for growth.`;
        break;
    }

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const responseText = response.text || '';

    let coaching;
    try {
      const cleanedText = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim();
      coaching = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse coach response:', responseText);
      // Provide fallback coaching
      coaching = {
        tone: 'supportive',
        message: mode === 'pre_exam'
          ? "Let's do this! Focus on understanding concepts, not just getting answers right."
          : mode === 'during_exam'
          ? 'Keep going! Every question is a learning opportunity.'
          : "Great effort! Review what you learned and you'll do even better next time.",
        recommendations: [],
        focusAreas: [],
        strengths: [],
      };
    }

    return NextResponse.json({
      success: true,
      coaching,
    });
  } catch (error: any) {
    console.error('Coach API Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate coaching',
        details: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function analyzeHistory(sessions: SessionRecord[]) {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      averageScore: 0,
      bestStreak: 0,
      weakCategories: [],
      strongCategories: [],
      trend: 'new student',
    };
  }

  let totalScore = 0;
  let bestStreak = 0;
  const categoryStats: Record<string, { correct: number; total: number }> = {};

  sessions.forEach((session) => {
    totalScore += session.score.percentage;
    bestStreak = Math.max(bestStreak, session.streaks.max);

    Object.entries(session.categoryPerformance).forEach(([cat, stats]) => {
      if (!categoryStats[cat]) categoryStats[cat] = { correct: 0, total: 0 };
      categoryStats[cat].correct += stats.correct;
      categoryStats[cat].total += stats.total;
    });
  });

  const weakCategories = Object.entries(categoryStats)
    .filter(([_, s]) => s.total >= 2 && (s.correct / s.total) < 0.7)
    .map(([cat]) => cat);

  const strongCategories = Object.entries(categoryStats)
    .filter(([_, s]) => s.total >= 2 && (s.correct / s.total) >= 0.8)
    .map(([cat]) => cat);

  // Calculate trend
  let trend = 'stable';
  if (sessions.length >= 2) {
    const recent = sessions.slice(0, Math.floor(sessions.length / 2));
    const older = sessions.slice(Math.floor(sessions.length / 2));
    const recentAvg = recent.reduce((sum, s) => sum + s.score.percentage, 0) / recent.length;
    const olderAvg = older.reduce((sum, s) => sum + s.score.percentage, 0) / older.length;
    if (recentAvg - olderAvg > 5) trend = 'improving';
    else if (recentAvg - olderAvg < -5) trend = 'declining';
  }

  return {
    totalSessions: sessions.length,
    averageScore: Math.round(totalScore / sessions.length),
    bestStreak,
    weakCategories,
    strongCategories,
    trend,
  };
}
