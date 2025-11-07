import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import { Question, QuestionSet } from './types';

export interface ExportOptions {
  includeAnswers?: boolean;
  includeExplanations?: boolean;
  includeMetadata?: boolean;
}

/**
 * Export question set to JSON format
 */
export function exportToJSON(questionSet: QuestionSet, options: ExportOptions = {}): void {
  const data = {
    title: questionSet.title,
    description: questionSet.description,
    subject: questionSet.subject,
    ...(options.includeMetadata !== false && {
      metadata: questionSet.metadata,
      createdAt: questionSet.createdAt,
      updatedAt: questionSet.updatedAt,
      sourceType: questionSet.sourceType,
      isPublic: questionSet.isPublic,
    }),
    questions: questionSet.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      ...(options.includeAnswers !== false && { correctAnswer: q.correctAnswer }),
      ...(options.includeExplanations !== false && { explanation: q.explanation }),
      category: q.category,
      difficulty: q.difficulty,
      ...(q.type && { type: q.type }),
    })),
  };

  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const filename = `${sanitizeFilename(questionSet.title)}.json`;
  saveAs(blob, filename);
}

/**
 * Export questions to CSV format
 */
export function exportToCSV(questionSet: QuestionSet, options: ExportOptions = {}): void {
  const includeAnswers = options.includeAnswers !== false;
  const includeExplanations = options.includeExplanations !== false;
  const includeMetadata = options.includeMetadata !== false;

  // CSV Headers
  const headers = [
    'Question Number',
    'Question',
    'Option A',
    'Option B',
    'Option C',
    'Option D',
    ...(includeAnswers ? ['Correct Answer'] : []),
    ...(includeExplanations ? ['Explanation'] : []),
    'Difficulty',
    'Type',
    'Category'
  ];

  // Build CSV rows
  const rows = questionSet.questions.map((q, index) => {
    const optionA = q.options.find(o => o.id === 'A')?.text || '';
    const optionB = q.options.find(o => o.id === 'B')?.text || '';
    const optionC = q.options.find(o => o.id === 'C')?.text || '';
    const optionD = q.options.find(o => o.id === 'D')?.text || '';

    return [
      index + 1,
      escapeCSV(q.question),
      escapeCSV(optionA),
      escapeCSV(optionB),
      escapeCSV(optionC),
      escapeCSV(optionD),
      ...(includeAnswers ? [q.correctAnswer] : []),
      ...(includeExplanations ? [escapeCSV(q.explanation)] : []),
      q.difficulty,
      q.type || 'multiple-choice',
      q.category
    ];
  });

  // Combine metadata, headers and rows
  const csvContent = [
    // Add metadata if included
    ...(includeMetadata
      ? [
          ['Title', escapeCSV(questionSet.title)],
          ['Description', escapeCSV(questionSet.description)],
          ['Subject', questionSet.subject],
          ['Total Questions', questionSet.questions.length.toString()],
          ['Created', new Date(questionSet.createdAt).toLocaleDateString()],
          [''], // Empty row
        ].map(row => row.join(','))
      : []),
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = `${sanitizeFilename(questionSet.title)}.csv`;
  saveAs(blob, filename);
}

/**
 * Export questions to PDF format
 */
export function exportToPDF(questionSet: QuestionSet): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  // Helper function to add spacing
  const addSpacing = (space: number = 5) => {
    yPosition += space;
  };

  // Title
  addText(questionSet.title, 18, true);
  addSpacing(3);

  // Description
  if (questionSet.description) {
    addText(questionSet.description, 12);
    addSpacing(5);
  }

  // Metadata
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  addText(`Subject: ${questionSet.subject}`, 10);
  addText(`Total Questions: ${questionSet.questions.length}`, 10);
  addText(`Created: ${new Date(questionSet.createdAt).toLocaleDateString()}`, 10);
  addSpacing(10);

  pdf.setTextColor(0);

  // Questions
  questionSet.questions.forEach((question, index) => {
    // Question number and text
    addText(`Question ${index + 1}`, 14, true);
    addSpacing(2);
    addText(question.question, 12);
    addSpacing(3);

    // Options
    question.options.forEach((option) => {
      const prefix = option.id === question.correctAnswer ? '✓ ' : '   ';
      addText(`${prefix}${option.id}. ${option.text}`, 11);
      addSpacing(1);
    });
    addSpacing(3);

    // Correct Answer
    pdf.setTextColor(0, 128, 0);
    addText(`Correct Answer: ${question.correctAnswer}`, 11, true);
    pdf.setTextColor(0);
    addSpacing(2);

    // Explanation
    addText('Explanation:', 11, true);
    addText(question.explanation, 10);
    addSpacing(3);

    // Metadata
    pdf.setFontSize(9);
    pdf.setTextColor(128);
    addText(`Difficulty: ${question.difficulty} | Type: ${question.type || 'multiple-choice'}`, 9);
    pdf.setTextColor(0);
    addSpacing(10);
  });

  // Answer key page
  pdf.addPage();
  yPosition = margin;

  addText('Answer Key', 16, true);
  addSpacing(5);

  const answersPerRow = 5;
  questionSet.questions.forEach((question, index) => {
    if (index % answersPerRow === 0 && index !== 0) {
      addSpacing(5);
    }

    const answerText = `${index + 1}. ${question.correctAnswer}`;
    pdf.text(answerText, margin + (index % answersPerRow) * 35, yPosition);

    if ((index + 1) % answersPerRow === 0) {
      yPosition += lineHeight;
    }
  });

  // Save PDF
  pdf.save(`${sanitizeFilename(questionSet.title)}.pdf`);
}

/**
 * Export questions only (without answers) for actual exam taking
 */
export function exportQuestionsOnlyToPDF(questionSet: QuestionSet): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  const addSpacing = (space: number = 5) => {
    yPosition += space;
  };

  // Title
  addText(questionSet.title, 18, true);
  addSpacing(3);

  if (questionSet.description) {
    addText(questionSet.description, 12);
    addSpacing(5);
  }

  // Instructions
  pdf.setFontSize(10);
  pdf.setTextColor(100);
  addText(`Subject: ${questionSet.subject}`, 10);
  addText(`Total Questions: ${questionSet.questions.length}`, 10);
  addText('Instructions: Choose the best answer for each question.', 10);
  addSpacing(10);

  pdf.setTextColor(0);

  // Questions only (no answers or explanations)
  questionSet.questions.forEach((question, index) => {
    addText(`Question ${index + 1}`, 14, true);
    addSpacing(2);
    addText(question.question, 12);
    addSpacing(3);

    question.options.forEach((option) => {
      addText(`   ${option.id}. ${option.text}`, 11);
      addSpacing(1);
    });

    // Space for answer
    addSpacing(2);
    pdf.setTextColor(200);
    addText('Your Answer: _____', 10);
    pdf.setTextColor(0);
    addSpacing(8);
  });

  pdf.save(`${sanitizeFilename(questionSet.title)}_questions.pdf`);
}

/**
 * Export exam results to PDF
 */
export function exportResultsToPDF(
  questionSet: QuestionSet,
  userAnswers: Map<number, { selectedAnswer: string; isCorrect: boolean }>,
  score: { correct: number; total: number; percentage: number }
): void {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const lineHeight = 7;
  let yPosition = margin;

  const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', isBold ? 'bold' : 'normal');

    const lines = pdf.splitTextToSize(text, pageWidth - 2 * margin);

    lines.forEach((line: string) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
  };

  const addSpacing = (space: number = 5) => {
    yPosition += space;
  };

  // Title
  addText('Exam Results Report', 20, true);
  addSpacing(5);

  // Score Summary
  pdf.setFillColor(score.percentage >= 70 ? 34 : 59, score.percentage >= 70 ? 197 : 130, score.percentage >= 70 ? 94 : 246);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'F');

  pdf.setTextColor(255);
  yPosition += 10;
  addText(`Score: ${score.percentage}%`, 24, true);
  addText(`${score.correct} out of ${score.total} questions correct`, 14);
  pdf.setTextColor(0);
  addSpacing(10);

  // Subject and Date
  addText(`Subject: ${questionSet.subject}`, 12);
  addText(`Date: ${new Date().toLocaleDateString()}`, 12);
  addSpacing(10);

  // Question Review
  questionSet.questions.forEach((question, index) => {
    const userAnswer = userAnswers.get(question.id);
    const isCorrect = userAnswer?.isCorrect || false;

    // Question header
    pdf.setTextColor(isCorrect ? 34 : 220, isCorrect ? 197 : 38, isCorrect ? 94 : 38);
    addText(`${isCorrect ? '✓' : '✗'} Question ${index + 1}`, 12, true);
    pdf.setTextColor(0);
    addSpacing(2);

    // Question text
    addText(question.question, 11);
    addSpacing(3);

    // Options
    question.options.forEach((option) => {
      const isUserAnswer = userAnswer?.selectedAnswer === option.id;
      const isCorrectAnswer = option.id === question.correctAnswer;

      let prefix = '   ';
      if (isCorrectAnswer && isUserAnswer) {
        prefix = '✓✓ '; // User selected correct answer
      } else if (isCorrectAnswer) {
        prefix = '✓  '; // Correct answer
      } else if (isUserAnswer) {
        prefix = '✗  '; // User's wrong answer
      }

      if (isUserAnswer || isCorrectAnswer) {
        pdf.setTextColor(isCorrectAnswer ? 34 : 220, isCorrectAnswer ? 197 : 38, isCorrectAnswer ? 94 : 38);
      }

      addText(`${prefix}${option.id}. ${option.text}`, 10);
      pdf.setTextColor(0);
      addSpacing(1);
    });
    addSpacing(2);

    if (!isCorrect) {
      pdf.setTextColor(128);
      addText('Explanation:', 10, true);
      addText(question.explanation, 9);
      pdf.setTextColor(0);
    }

    addSpacing(8);
  });

  pdf.save(`${sanitizeFilename(questionSet.title)}_results.pdf`);
}

/**
 * Export question set as Markdown
 */
export function exportToMarkdown(questionSet: QuestionSet, options: ExportOptions = {}): void {
  const includeAnswers = options.includeAnswers !== false;
  const includeExplanations = options.includeExplanations !== false;
  const includeMetadata = options.includeMetadata !== false;

  let markdown = '';

  // Title and metadata
  markdown += `# ${questionSet.title}\n\n`;
  markdown += `${questionSet.description}\n\n`;

  if (includeMetadata) {
    markdown += `## Metadata\n\n`;
    markdown += `- **Subject:** ${questionSet.subject}\n`;
    markdown += `- **Total Questions:** ${questionSet.questions.length}\n`;
    markdown += `- **Created:** ${new Date(questionSet.createdAt).toLocaleDateString()}\n`;
    markdown += `- **Source:** ${questionSet.sourceType}\n\n`;

    if (questionSet.metadata) {
      const dist = questionSet.metadata.difficultyDistribution;
      markdown += `### Difficulty Distribution\n\n`;
      markdown += `- Easy: ${dist.easy} (${Math.round((dist.easy / questionSet.questions.length) * 100)}%)\n`;
      markdown += `- Medium: ${dist.medium} (${Math.round((dist.medium / questionSet.questions.length) * 100)}%)\n`;
      markdown += `- Hard: ${dist.hard} (${Math.round((dist.hard / questionSet.questions.length) * 100)}%)\n\n`;
    }
  }

  markdown += `---\n\n`;
  markdown += `## Questions\n\n`;

  // Questions
  questionSet.questions.forEach((q, index) => {
    markdown += `### Question ${index + 1}\n\n`;
    markdown += `**${q.question}**\n\n`;

    // Options
    q.options.forEach((opt) => {
      const isCorrect = includeAnswers && opt.id === q.correctAnswer;
      const marker = isCorrect ? '✅' : '○';
      markdown += `${marker} **${opt.id}.** ${opt.text}\n`;
    });

    markdown += `\n`;

    // Metadata
    markdown += `*Category: ${q.category} | Difficulty: ${q.difficulty}*\n\n`;

    // Answer
    if (includeAnswers) {
      markdown += `**Correct Answer:** ${q.correctAnswer}\n\n`;
    }

    // Explanation
    if (includeExplanations) {
      markdown += `**Explanation:**\n${q.explanation}\n\n`;
    }

    markdown += `---\n\n`;
  });

  // Footer
  markdown += `\n*Generated from AI Exam Generator*\n`;

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
  const filename = `${sanitizeFilename(questionSet.title)}.md`;

  saveAs(blob, filename);
}

/**
 * Sanitize filename for safe file downloads
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Escape special characters for CSV
 */
function escapeCSV(text: string): string {
  if (!text) return '';

  // Replace newlines and carriage returns
  text = text.replace(/\r?\n/g, ' ');

  // If text contains comma, quote, or newline, wrap in quotes
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    text = '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}
