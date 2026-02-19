// CCAT (Criteria Cognitive Aptitude Test) specific types

export interface ShapeDescriptor {
  type: 'circle' | 'line' | 'rect' | 'polygon' | 'ellipse';
  // circle / ellipse
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  // line
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  // rect
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  transform?: string;
  // polygon
  points?: string;
  // shared visual
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
}

export interface CellDescriptor {
  shapes: ShapeDescriptor[];
}

export type SpatialType = 'nextInSeries' | 'matrix' | 'oddOneOut' | 'attention';

export interface CCATQuestion {
  id: number;
  category: 'Verbal' | 'Math & Logic' | 'Spatial Reasoning';
  type: string; // 'Sentence Completion', 'Word Problem', 'Analogy', 'Next in Series', etc.
  question: string;
  options: string[];
  correct: number; // 0-indexed into options array
  explanation: string;
  // Spatial fields — only present for spatial questions
  spatial?: SpatialType;
  // nextInSeries: array of CellDescriptor|null (null = question mark slot)
  seriesDescriptors?: (CellDescriptor | null)[];
  optionDescriptors?: CellDescriptor[];
  // matrix: 9-element array with null at index 8
  matrixDescriptors?: (CellDescriptor | null)[];
  // oddOneOut: 5 items
  oddDescriptors?: CellDescriptor[];
  // attention detail: plain string arrays
  attentionLeft?: string[];
  attentionRight?: string[];
  // AI-generated spatial image (base64 PNG data URL, e.g. "data:image/png;base64,...")
  spatialImage?: string;
}

export type CCATScreen = 'start' | 'exam' | 'results';

export interface CCATState {
  screen: CCATScreen;
  current: number;
  answers: (number | null)[];
  timeLeft: number;
  reviewMode: boolean;
}

export interface CCATCategoryScore {
  correct: number;
  total: number;
  pct: number;
}
