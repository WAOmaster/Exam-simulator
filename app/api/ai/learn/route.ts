import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

export async function POST(request: NextRequest) {
  try {
    const { question, options, correctAnswer } = await request.json();

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question is required' },
        { status: 400 }
      );
    }

    // Format options for the prompt
    const optionsText = options
      ? options.map((opt: any) => `${opt.id}. ${opt.text}`).join('\n')
      : '';

    const correctAnswerText = correctAnswer
      ? options?.find((opt: any) => opt.id === correctAnswer)?.text
      : '';

    const prompt = `You are an educational AI assistant helping students understand concepts deeply. Analyze this exam question and provide comprehensive learning guidance.

Question: ${question}
${optionsText ? `\nOptions:\n${optionsText}` : ''}
${correctAnswerText ? `\nCorrect Answer: ${correctAnswerText}` : ''}

Please provide a structured learning guide with the following:

1. **Topic**: The main topic or concept being tested (be specific)
2. **Subject Area**: The broader subject/field this belongs to
3. **Key Concepts**: List 3-5 key concepts needed to understand this question
4. **Learning Guide** (limit to 250 words):
   - Explain the fundamental concepts in simple terms
   - Break down why the correct answer is correct
   - Common misconceptions to avoid
   - How this connects to broader understanding
5. **Further Learning**: Provide 3-4 specific search queries or topics for deeper study

Format your response EXACTLY as JSON:
{
  "topic": "specific topic name",
  "subjectArea": "broader subject field",
  "keyConcepts": ["concept1", "concept2", "concept3"],
  "learningGuide": "detailed explanation here (250 words max)",
  "furtherLearning": [
    "search query or topic 1",
    "search query or topic 2",
    "search query or topic 3"
  ]
}

IMPORTANT:
- Keep the learning guide under 250 words but make it comprehensive
- Use clear, simple language suitable for learning
- Focus on understanding, not memorization
- Be encouraging and educational in tone`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    const text = response.text || '';

    // Parse the JSON response
    let learningData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      learningData = JSON.parse(jsonText);
    } catch {
      console.error('Failed to parse AI response:', text);
      // Return a fallback structure
      learningData = {
        topic: 'Concept Analysis',
        subjectArea: 'General',
        keyConcepts: ['Critical thinking', 'Problem solving', 'Understanding'],
        learningGuide: text.substring(0, 800),
        furtherLearning: [
          'Review fundamental concepts in this topic',
          'Practice similar problems',
          'Consult textbooks or online resources'
        ]
      };
    }

    // Validate and ensure word limit
    if (learningData.learningGuide) {
      const wordCount = learningData.learningGuide.split(/\s+/).length;
      if (wordCount > 300) {
        // Truncate to approximately 300 words
        const words = learningData.learningGuide.split(/\s+/);
        learningData.learningGuide = words.slice(0, 300).join(' ') + '...';
      }
    }

    return NextResponse.json({
      success: true,
      learning: learningData
    });

  } catch (error: any) {
    console.error('Learn with AI error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate learning content'
      },
      { status: 500 }
    );
  }
}
