import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const batchFiles = [
      'aws-aif-c01-batch-1.json',
      'aws-aif-c01-batch-2.json',
      'aws-aif-c01-batch-3.json',
      'aws-aif-c01-batch-4.json',
    ];

    const allQuestions = [];
    for (const file of batchFiles) {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        allQuestions.push(...data);
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({ success: false, error: 'No batch files found' }, { status: 404 });
    }

    // Calculate difficulty distribution
    const difficultyDistribution = { easy: 0, medium: 0, hard: 0 };
    const questionTypes: Record<string, number> = { 'multiple-choice': 0, 'true-false': 0, 'scenario': 0 };

    for (const q of allQuestions) {
      if (q.difficulty in difficultyDistribution) {
        difficultyDistribution[q.difficulty as keyof typeof difficultyDistribution]++;
      }
      const qType = q.type || 'multiple-choice';
      if (qType in questionTypes) {
        questionTypes[qType]++;
      }
    }

    const questionSet = {
      id: 'aws-aif-c01-complete',
      title: 'AWS AIF-C01 - AI Foundations Complete',
      description: `Complete AWS Certified AI Practitioner (AIF-C01) question bank with ${allQuestions.length} questions covering all exam domains.`,
      subject: 'AWS - AIF-C01',
      questions: allQuestions,
      metadata: {
        totalQuestions: allQuestions.length,
        difficultyDistribution,
        questionTypes: questionTypes as any,
        topics: ['AWS AI Services', 'Machine Learning', 'Generative AI', 'Responsible AI', 'Amazon Bedrock', 'Amazon SageMaker'],
        processingMode: 'extracted' as const,
        sourceInfo: {
          fileName: 'aws-aif-c01-batch-1-4.json',
        },
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
      sourceType: 'upload' as const,
    };

    return NextResponse.json({ success: true, questionSet });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
