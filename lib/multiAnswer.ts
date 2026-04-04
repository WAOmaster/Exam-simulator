/**
 * Multi-answer question utilities.
 * Handles comma-separated correctAnswer strings (e.g., "B,D")
 * while remaining backward-compatible with single answers (e.g., "A").
 */

/** Parse a comma-separated answer string into a sorted array. */
export function parseAnswers(answer: string): string[] {
  return answer.split(',').map(a => a.trim()).filter(Boolean).sort();
}

/** Compare two answer strings for equality (order-independent). */
export function answersMatch(a: string, b: string): boolean {
  const pa = parseAnswers(a);
  const pb = parseAnswers(b);
  return pa.length === pb.length && pa.every((v, i) => v === pb[i]);
}

/** Check if a single option ID is part of the correct answer set. */
export function isCorrectOption(optionId: string, correctAnswer: string): boolean {
  return parseAnswers(correctAnswer).includes(optionId);
}

/** Check if a single option ID is in the selected answers. */
export function isOptionSelected(optionId: string, selectedAnswer: string | null): boolean {
  if (!selectedAnswer) return false;
  return parseAnswers(selectedAnswer).includes(optionId);
}

/** Toggle an option in a multi-answer selection. Returns new comma-separated string. */
export function toggleAnswer(optionId: string, current: string | null): string {
  const answers = current ? parseAnswers(current) : [];
  const idx = answers.indexOf(optionId);
  if (idx >= 0) {
    answers.splice(idx, 1);
  } else {
    answers.push(optionId);
  }
  return answers.sort().join(',');
}

/** How many answers are required. Checks correctAnswer first, then question text. */
export function getRequiredAnswerCount(correctAnswer: string, questionText?: string): number {
  const fromCorrect = parseAnswers(correctAnswer).length;
  if (fromCorrect > 1) return fromCorrect;

  if (questionText) {
    const match = questionText.match(/(?:choose|select)\s+(two|three|four|2|3|4)/i);
    if (match) {
      const map: Record<string, number> = { two: 2, three: 3, four: 4, '2': 2, '3': 3, '4': 4 };
      return map[match[1].toLowerCase()] || 1;
    }
  }

  return fromCorrect;
}

/** Whether a question requires multiple answers. */
export function isMultiAnswer(correctAnswer: string, questionText?: string): boolean {
  return getRequiredAnswerCount(correctAnswer, questionText) > 1;
}

/** Get all correct option texts for display. */
export function getCorrectOptionTexts(
  correctAnswer: string,
  options: { id: string; text: string }[]
): string[] {
  const ids = parseAnswers(correctAnswer);
  return ids.map(id => {
    const opt = options.find(o => o.id === id);
    return opt ? opt.text : id;
  });
}
