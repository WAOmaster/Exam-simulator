import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export interface ParsedContent {
  text: string;
  fileName: string;
  fileType: string;
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
 * Main parser function that routes to the appropriate parser based on file type
 */
export async function parseFile(buffer: Buffer, fileName: string, mimeType: string): Promise<ParsedContent> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
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
