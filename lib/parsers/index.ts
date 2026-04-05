import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { cleanExamDumpJSON, isExamDumpFormat, validateQuestions, type CleanedQuestion } from '@/lib/jsonCleaner';

export interface ParsedContent {
  text: string;
  fileName: string;
  fileType: string;
  // For JSON files with questions
  questions?: CleanedQuestion[];
  cleaningMetadata?: {
    isExamDump: boolean;
    needsEnhancement: boolean;
    originalCount: number;
    cleanedCount: number;
    missingExplanations: number;
    missingDifficulty: number;
  };
}

/**
 * Parse DOCX file to extract text content
 */
export async function parseDOCX(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      fileName,
      fileType: 'docx',
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse PDF file to extract text content
 * Note: PDF parsing is currently not supported due to serverless environment limitations
 */
export async function parsePDF(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  throw new Error('PDF parsing is currently not supported. Please convert your PDF to DOCX, Excel, or TXT format and upload again.');
}

/**
 * Parse Excel file to extract text content
 */
export async function parseExcel(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    let text = '';

    // Iterate through all sheets
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      const sheetData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      // Convert to text
      text += `\n=== ${sheetName} ===\n`;
      sheetData.forEach(row => {
        text += row.join(' | ') + '\n';
      });
    });

    return {
      text,
      fileName,
      fileType: 'xlsx',
    };
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse TXT file to extract text content
 */
export async function parseTXT(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  try {
    return {
      text: buffer.toString('utf-8'),
      fileName,
      fileType: 'txt',
    };
  } catch (error) {
    throw new Error(`Failed to parse TXT file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse JSON file with automatic exam dump cleaning
 */
export async function parseJSON(buffer: Buffer, fileName: string): Promise<ParsedContent> {
  try {
    const jsonString = buffer.toString('utf-8');
    const parsed = JSON.parse(jsonString);

    // Check if it's an array of questions
    if (!Array.isArray(parsed)) {
      throw new Error('JSON must be an array of questions');
    }

    // Detect if it's exam dump format
    const isExamDump = isExamDumpFormat(parsed);

    // Clean the questions
    const cleaningResult = cleanExamDumpJSON(parsed);

    // Validate cleaned questions
    const validation = validateQuestions(cleaningResult.questions);
    if (!validation.valid) {
      throw new Error(`Invalid question format: ${validation.errors.join(', ')}`);
    }

    // Return cleaned questions as JSON string for consistency
    return {
      text: JSON.stringify(cleaningResult.questions, null, 2),
      fileName,
      fileType: 'json',
      questions: cleaningResult.questions,
      cleaningMetadata: {
        isExamDump,
        needsEnhancement: cleaningResult.needsEnhancement,
        originalCount: cleaningResult.metadata.originalCount,
        cleanedCount: cleaningResult.metadata.cleanedCount,
        missingExplanations: cleaningResult.metadata.missingExplanations,
        missingDifficulty: cleaningResult.metadata.missingDifficulty,
      },
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON format. Please ensure the file contains valid JSON.');
    }
    throw new Error(`Failed to parse JSON file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Main parser function that routes to the appropriate parser based on file type
 */
export async function parseFile(buffer: Buffer, fileName: string, mimeType: string): Promise<ParsedContent> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'json':
      return parseJSON(buffer, fileName);
    case 'docx':
      return parseDOCX(buffer, fileName);
    case 'pdf':
      return parsePDF(buffer, fileName);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer, fileName);
    case 'txt':
      return parseTXT(buffer, fileName);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
