import { NextRequest, NextResponse } from 'next/server';
import { parseFile } from '@/lib/parsers';
import { UploadResponse } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' } as UploadResponse,
        { status: 400 }
      );
    }

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 10MB limit' } as UploadResponse,
        { status: 400 }
      );
    }

    // Get file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the file
    const { text, fileName, fileType } = await parseFile(buffer, file.name, file.type);

    // Check if content was extracted
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'No text content could be extracted from the file' } as UploadResponse,
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      content: text,
      fileName,
      fileType,
    } as UploadResponse);
  } catch (error: any) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process file',
        content: '',
        fileName: '',
        fileType: '',
      } as UploadResponse,
      { status: 500 }
    );
  }
}
