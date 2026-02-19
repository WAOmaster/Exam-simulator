'use client';

import { CellDescriptor, ShapeDescriptor } from '@/lib/ccatTypes';

// ─── Single shape renderer ─────────────────────────────────────────────────

function RenderShape({ shape, key }: { shape: ShapeDescriptor; key: number }) {
  const base = {
    key,
    fill: shape.fill ?? 'none',
    stroke: shape.stroke ?? '#333',
    strokeWidth: shape.strokeWidth ?? 2,
  };

  switch (shape.type) {
    case 'circle':
      return <circle {...base} cx={shape.cx} cy={shape.cy} r={shape.r} />;
    case 'line':
      return (
        <line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke ?? '#333'}
          strokeWidth={shape.strokeWidth ?? 2}
        />
      );
    case 'rect':
      return (
        <rect
          {...base}
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          rx={shape.rx}
          transform={shape.transform}
        />
      );
    case 'polygon':
      return <polygon {...base} points={shape.points} />;
    case 'ellipse':
      return <ellipse {...base} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} />;
    default:
      return null;
  }
}

// ─── Single SVG cell ───────────────────────────────────────────────────────

export function SvgCell({ descriptor, size = 42 }: { descriptor: CellDescriptor; size?: number }) {
  return (
    <svg viewBox="0 0 50 50" width={size} height={size}>
      {descriptor.shapes.map((shape, i) => (
        <RenderShape key={i} shape={shape} />
      ))}
    </svg>
  );
}

// ─── Question-mark placeholder ─────────────────────────────────────────────

function QuestionCell({ size }: { size: number }) {
  return (
    <div
      className="flex items-center justify-center rounded border-2 border-rose-400/70 bg-rose-50/40 dark:bg-rose-500/10"
      style={{ width: size, height: size }}
    >
      <span className="text-xl font-bold text-rose-500 dark:text-rose-400">?</span>
    </div>
  );
}

// ─── Pattern cell wrapper ──────────────────────────────────────────────────

function PatternCell({
  descriptor,
  size,
  isLast,
}: {
  descriptor: CellDescriptor | null;
  size: number;
  isLast: boolean;
}) {
  if (isLast || descriptor === null) return <QuestionCell size={size} />;
  return (
    <div
      className="flex items-center justify-center rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
      style={{ width: size, height: size }}
    >
      <SvgCell descriptor={descriptor} size={size - 10} />
    </div>
  );
}

// ─── Option cell ────────────────────────────────────────────────────────────

function OptionCell({ descriptor, label, size }: { descriptor: CellDescriptor; label: string; size: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="flex items-center justify-center rounded border border-gray-400 dark:border-gray-500 bg-white dark:bg-gray-800"
        style={{ width: size, height: size }}
      >
        <SvgCell descriptor={descriptor} size={size - 10} />
      </div>
      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
    </div>
  );
}

// ─── Next in Series ────────────────────────────────────────────────────────

export function CCATNextInSeries({
  descriptors,
  optionDescriptors,
  cellSize = 58,
}: {
  descriptors: (CellDescriptor | null)[];
  optionDescriptors: CellDescriptor[];
  cellSize?: number;
}) {
  return (
    <div className="space-y-3">
      {/* Series row */}
      <div className="flex items-center gap-2 flex-wrap">
        {descriptors.map((d, i) => (
          <PatternCell
            key={i}
            descriptor={d}
            size={cellSize}
            isLast={i === descriptors.length - 1}
          />
        ))}
      </div>
      {/* Divider */}
      <div className="border-t-2 border-gray-400 dark:border-gray-500 w-full" />
      {/* Options row */}
      <div className="flex items-end gap-3 flex-wrap">
        {optionDescriptors.map((d, i) => (
          <OptionCell
            key={i}
            descriptor={d}
            label={String.fromCharCode(65 + i)}
            size={cellSize - 4}
          />
        ))}
      </div>
    </div>
  );
}

// ─── 3×3 Matrix ────────────────────────────────────────────────────────────

export function CCATMatrix({
  descriptors,
  optionDescriptors,
  cellSize = 54,
}: {
  descriptors: (CellDescriptor | null)[];
  optionDescriptors: CellDescriptor[];
  cellSize?: number;
}) {
  return (
    <div className="space-y-3">
      {/* 3x3 grid */}
      <div
        className="inline-grid gap-1 p-1 rounded bg-gray-200 dark:bg-gray-700"
        style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        {descriptors.map((d, i) => (
          <PatternCell key={i} descriptor={d} size={cellSize} isLast={i === 8} />
        ))}
      </div>
      {/* Divider */}
      <div className="border-t-2 border-gray-400 dark:border-gray-500" style={{ width: cellSize * 3 + 12 }} />
      {/* Options */}
      <div className="flex items-end gap-3 flex-wrap">
        {optionDescriptors.map((d, i) => (
          <OptionCell
            key={i}
            descriptor={d}
            label={String.fromCharCode(65 + i)}
            size={cellSize - 4}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Odd One Out ───────────────────────────────────────────────────────────

export function CCATOddOneOut({
  descriptors,
  cellSize = 58,
}: {
  descriptors: CellDescriptor[];
  cellSize?: number;
}) {
  return (
    <div className="flex items-end gap-3 flex-wrap">
      {descriptors.map((d, i) => (
        <OptionCell
          key={i}
          descriptor={d}
          label={String.fromCharCode(65 + i)}
          size={cellSize}
        />
      ))}
    </div>
  );
}

// ─── Attention to Detail Table ─────────────────────────────────────────────

export function CCATAttentionTable({ left, right }: { left: string[]; right: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full max-w-lg text-sm border-collapse">
        <thead>
          <tr>
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-left text-gray-700 dark:text-gray-200 font-semibold">
              Left-Hand Column
            </th>
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-left text-gray-700 dark:text-gray-200 font-semibold">
              Right-Hand Column
            </th>
          </tr>
        </thead>
        <tbody>
          {left.map((l, i) => (
            <tr key={i} className="odd:bg-white even:bg-gray-50 dark:odd:bg-gray-800 dark:even:bg-gray-800/60">
              <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200 font-mono text-xs">
                {l}
              </td>
              <td className="border border-gray-200 dark:border-gray-600 px-3 py-2 text-gray-800 dark:text-gray-200 font-mono text-xs">
                {right[i]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
