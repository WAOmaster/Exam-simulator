import React from 'react';

/**
 * Format AI-generated explanations with proper styling
 * Handles markdown-like formatting from Gemini responses
 */
export function formatExplanation(text: string): React.ReactNode {
  if (!text) return null;

  // Split text into paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim());

  return (
    <div className="space-y-4">
      {paragraphs.map((paragraph, pIndex) => {
        // Check if paragraph is a numbered list item
        const numberedMatch = paragraph.match(/^(\d+)\.\s*(.+)/s);
        if (numberedMatch) {
          const [, number, content] = numberedMatch;
          return (
            <div key={pIndex} className="flex gap-3">
              <span className="font-bold text-blue-600 dark:text-blue-400 flex-shrink-0">
                {number}.
              </span>
              <div className="flex-1">
                {formatInlineText(content)}
              </div>
            </div>
          );
        }

        // Check if paragraph is a bullet point
        const bulletMatch = paragraph.match(/^[*\-•]\s*(.+)/s);
        if (bulletMatch) {
          const [, content] = bulletMatch;
          return (
            <div key={pIndex} className="flex gap-3 ml-6">
              <span className="text-blue-600 dark:text-blue-400 flex-shrink-0">•</span>
              <div className="flex-1">
                {formatInlineText(content)}
              </div>
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={pIndex} className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {formatInlineText(paragraph)}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Format inline text with bold, italic, and other formatting
 */
function formatInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;

  // Pattern to match **bold** text
  const boldPattern = /\*\*(.+?)\*\*/g;
  let match;

  while ((match = boldPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${keyCounter++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Add bold text
    parts.push(
      <strong key={`bold-${keyCounter++}`} className="font-bold text-gray-900 dark:text-white">
        {match[1]}
      </strong>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${keyCounter++}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  // If no formatting was found, return original text
  if (parts.length === 0) {
    return text;
  }

  return <>{parts}</>;
}

/**
 * Alternative: Simple line-break formatter for basic formatting
 */
export function formatSimple(text: string): React.ReactNode {
  return text.split('\n').map((line, index) => (
    <React.Fragment key={index}>
      {formatInlineText(line)}
      {index < text.split('\n').length - 1 && <br />}
    </React.Fragment>
  ));
}
