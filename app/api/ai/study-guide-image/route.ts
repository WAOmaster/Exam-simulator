import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

function getAI() {
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'missing' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept, category, explanation } = body;

    if (!concept || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing concept or category' },
        { status: 400 }
      );
    }

    const prompt = `Create an educational diagram or illustration that explains this concept:

CONCEPT: ${concept}
CATEGORY: ${category}
CONTEXT: ${explanation || 'N/A'}

Requirements:
- Create a clear, educational diagram or visual explanation
- Use labeled components and arrows to show relationships
- Make it suitable for a student studying this topic
- Use professional colors and clean design
- Include a brief text description of what the diagram shows

The image should be informative and help a student understand the concept visually.`;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];

    let description = '';
    let imageData: string | null = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.text) {
        description = part.text;
      }
      if (part.inlineData) {
        imageData = part.inlineData.data || null;
        mimeType = part.inlineData.mimeType || 'image/png';
      }
    }

    if (!imageData) {
      return NextResponse.json({
        success: true,
        image: null,
        description: description || `Visual explanation of ${concept} in ${category}`,
        fallback: true,
      });
    }

    return NextResponse.json({
      success: true,
      image: imageData,
      mimeType,
      description,
      fallback: false,
    });
  } catch (error: any) {
    console.error('Study Guide Image Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate image',
      },
      { status: 500 }
    );
  }
}
