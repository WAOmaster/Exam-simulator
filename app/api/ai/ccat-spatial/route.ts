import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

type SpatialType = 'nextInSeries' | 'matrix' | 'oddOneOut';

const IMAGE_PROMPTS: Record<SpatialType, string> = {
  nextInSeries: `Create a clean, simple visual sequence for a CCAT aptitude test.
Draw exactly 5 cells arranged left to right in a single row.
The first 4 cells each contain a geometric pattern that follows a clear visual rule (e.g. rotation by 90°, progressive addition of a shape, alternating fill, or size increase).
The 5th cell must contain only a large bold question mark "?" on a plain white background to indicate the missing answer.
Use only simple black outlines on a pure white background. No color, no text, no labels, no borders between cells.
The visual rule must be obvious and solvable in under 15 seconds.`,

  matrix: `Create a clean, simple 3×3 grid for a CCAT aptitude test.
Draw a 3×3 grid of cells. Each cell contains a geometric shape or pattern.
The cells in each row and each column follow a consistent visual rule (e.g. shape rotates, fills, or transforms systematically).
The bottom-right cell (row 3, column 3) must contain only a large bold question mark "?" on a plain white background.
Use only simple black outlines on a pure white background. No color, no text, no labels.
The visual rule must be obvious and solvable in under 20 seconds.`,

  oddOneOut: `Create a clean, simple row of 5 shapes for a CCAT aptitude test.
Draw exactly 5 cells arranged horizontally. Four cells contain shapes that share a common visual property (same shape type, same orientation, same fill pattern, etc.). One cell contains a shape that is clearly different from the others.
Use only simple black outlines on a pure white background. No color, no text, no labels.
The odd one out must be unambiguous and immediately identifiable.`,
};

interface GeneratedSpatialQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

async function generateQuestionFromImage(
  ai: GoogleGenAI,
  imageBase64: string,
  mimeType: string,
  spatialType: SpatialType,
  difficulty: string
): Promise<GeneratedSpatialQuestion> {
  const typeLabel =
    spatialType === 'nextInSeries' ? 'Next in Series (sequence completion)'
    : spatialType === 'matrix' ? 'Matrix (3×3 pattern grid)'
    : 'Odd One Out (find the mismatching shape)';

  const prompt = `You are a CCAT (Criteria Cognitive Aptitude Test) question writer.
The image shows a spatial reasoning pattern of type: ${typeLabel}.
Difficulty: ${difficulty}

Write a CCAT spatial reasoning question based on this pattern image.

Requirements:
- The question text should describe what the student needs to do (e.g. "Which shape completes the series?" or "Which figure does not belong?")
- Provide exactly 5 answer options labeled A through E
- For Next in Series / Matrix: options A–E describe possible shapes or patterns that could complete the missing cell; one must be correct based on the visible rule
- For Odd One Out: options A–E identify which position/cell is the odd one out (e.g. "A. The first shape" ... "E. The fifth shape"), OR describe what makes one shape different
- correct is the 0-indexed position of the correct answer (0=A, 1=B, 2=C, 3=D, 4=E)
- explanation must describe the visual rule clearly in ≤60 words

Return ONLY valid JSON:
{
  "question": "Which figure completes the pattern?",
  "options": ["A description", "B description", "C description", "D description", "E description"],
  "correct": 2,
  "explanation": "Brief explanation of the visual rule..."
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: prompt },
        ],
      },
    ],
    config: {
      temperature: 0.4,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const text = response.text ?? '';

  // Parse JSON from response
  let jsonText = text;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) jsonText = fenceMatch[1].trim();
  const start = jsonText.indexOf('{');
  const end = jsonText.lastIndexOf('}');
  if (start !== -1 && end !== -1) jsonText = jsonText.substring(start, end + 1);

  const parsed = JSON.parse(jsonText);
  return {
    question: parsed.question || 'Which option completes the pattern?',
    options: Array.isArray(parsed.options) ? parsed.options : ['A', 'B', 'C', 'D', 'E'],
    correct: typeof parsed.correct === 'number' ? parsed.correct : 0,
    explanation: parsed.explanation || 'Follow the visual rule shown in the pattern.',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spatialType, difficulty = 'medium' } = body as {
      spatialType: SpatialType;
      difficulty?: string;
    };

    if (!spatialType || !IMAGE_PROMPTS[spatialType]) {
      return NextResponse.json(
        { success: false, error: 'Invalid spatialType. Must be nextInSeries, matrix, or oddOneOut.' },
        { status: 400 }
      );
    }

    const ai = getAI();
    const imagePrompt = IMAGE_PROMPTS[spatialType];

    // Step 1: Generate the spatial pattern image
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-05-20',
      contents: imagePrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts = imageResponse.candidates?.[0]?.content?.parts || [];
    let imageBase64: string | null = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        imageBase64 = part.inlineData.data || null;
        mimeType = part.inlineData.mimeType || 'image/png';
      }
    }

    if (!imageBase64) {
      // Fallback: return a text-only spatial question
      return NextResponse.json({
        success: true,
        fallback: true,
        spatialImage: null,
        question: spatialType === 'oddOneOut'
          ? 'Look at the five shapes: circle, circle, circle, triangle, circle. Which shape does not belong?'
          : 'In a pattern where shapes rotate 90° clockwise each step, what comes next after a shape pointing right?',
        options: ['A. Triangle', 'B. Square', 'C. Circle', 'D. Pentagon', 'E. Hexagon'],
        correct: 0,
        explanation: 'The pattern follows a consistent visual rule. The odd or missing element follows logically.',
      });
    }

    // Step 2: Generate the question text from the image
    const questionData = await generateQuestionFromImage(ai, imageBase64, mimeType, spatialType, difficulty);

    return NextResponse.json({
      success: true,
      fallback: false,
      spatialImage: `data:${mimeType};base64,${imageBase64}`,
      ...questionData,
    });
  } catch (error: any) {
    console.error('CCAT Spatial Generation Error:', error);

    // Return fallback question on any error
    return NextResponse.json({
      success: true,
      fallback: true,
      spatialImage: null,
      question: 'Which shape completes the logical pattern? (Spatial pattern could not be generated)',
      options: ['A. Triangle', 'B. Square', 'C. Circle', 'D. Pentagon', 'E. Diamond'],
      correct: 1,
      explanation: 'The correct shape follows the visual rule established by the preceding elements.',
    });
  }
}
