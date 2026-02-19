import { NextRequest, NextResponse } from 'next/server';
import { generateSpatialQuestion, SpatialType } from '@/lib/ccatSpatialGenerator';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { spatialType, difficulty = 'medium' } = body as {
      spatialType: SpatialType;
      difficulty?: string;
    };

    const validTypes: SpatialType[] = ['nextInSeries', 'matrix', 'oddOneOut'];
    if (!spatialType || !validTypes.includes(spatialType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid spatialType. Must be nextInSeries, matrix, or oddOneOut.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const result = await generateSpatialQuestion(spatialType, difficulty, apiKey);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('CCAT Spatial Route Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate spatial question' },
      { status: 500 }
    );
  }
}
