'use client';

import React from 'react';
import { parseInlineImages } from '@/lib/parseInlineImages';
import ZoomableImage from './ZoomableImage';

/**
 * Lightweight rich-text rendering for question/option/explanation strings.
 *
 * Supports, without any markdown dependency:
 *   - fenced code blocks    ```lang\n...\n```
 *   - inline code           `code`
 *   - bold                  **bold**
 *   - markdown pipe tables   | a | b |\n| 1 | 2 |
 *   - inline images          [IMAGE: <url>]   (via parseInlineImages)
 *
 * `RichText` renders block-level content (code blocks, tables, paragraphs,
 * images). `RichInline` renders only inline spans (code + bold) and is meant
 * for tight spots like answer-option labels.
 */

// ─── Inline tokens: `code` and **bold** ─────────────────────────────────────

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split on inline code spans first so ** inside `code` is left untouched.
  const codeParts = text.split(/(`[^`]+`)/g);
  codeParts.forEach((part, i) => {
    if (!part) return;
    if (/^`[^`]+`$/.test(part)) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="px-1.5 py-0.5 rounded bg-muted/80 dark:bg-black/40 font-mono text-[0.85em] text-foreground border border-card-border break-words"
        >
          {part.slice(1, -1)}
        </code>
      );
      return;
    }
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
    boldParts.forEach((bp, j) => {
      if (!bp) return;
      if (/^\*\*[^*]+\*\*$/.test(bp)) {
        nodes.push(<strong key={`${keyPrefix}-b${i}-${j}`}>{bp.slice(2, -2)}</strong>);
      } else {
        nodes.push(<React.Fragment key={`${keyPrefix}-t${i}-${j}`}>{bp}</React.Fragment>);
      }
    });
  });
  return nodes;
}

export function RichInline({ text }: { text: string }) {
  return <>{renderInline(text ?? '', 'ri')}</>;
}

// ─── Fenced code blocks ──────────────────────────────────────────────────────

type Segment = { kind: 'code'; lang: string; content: string } | { kind: 'text'; content: string };

function splitFencedCode(text: string): Segment[] {
  const segs: Segment[] = [];
  const re = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', content: text.slice(last, m.index) });
    segs.push({ kind: 'code', lang: m[1].trim(), content: m[2].replace(/\n+$/, '') });
    last = re.lastIndex;
  }
  if (last < text.length) segs.push({ kind: 'text', content: text.slice(last) });
  return segs;
}

function CodeBlock({ lang, content }: { lang: string; content: string }) {
  return (
    <div className="my-3">
      {lang && (
        <div className="inline-block px-2 py-0.5 mb-1 text-[10px] font-mono font-semibold uppercase tracking-wide rounded bg-muted text-muted-foreground">
          {lang}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg bg-gray-900 dark:bg-black/50 border border-gray-700 dark:border-gray-600 p-3">
        <code className="font-mono text-xs sm:text-sm text-gray-100 whitespace-pre">{content}</code>
      </pre>
    </div>
  );
}

// ─── Markdown pipe tables ────────────────────────────────────────────────────

function isTableLine(line: string): boolean {
  const t = line.trim();
  if (!t.includes('|')) return false;
  return splitRow(t).length >= 2;
}

function isSeparatorRow(line: string): boolean {
  const t = line.trim();
  return t.includes('-') && /^\|?[\s:|-]+\|?$/.test(t);
}

function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((c) => c.trim());
}

function MarkdownTable({ lines, keyPrefix }: { lines: string[]; keyPrefix: string }) {
  const rows = lines.filter((l) => !isSeparatorRow(l)).map(splitRow);
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  return (
    <div className="my-3 overflow-x-auto">
      <table className="text-sm border-collapse">
        <thead>
          <tr>
            {header.map((c, i) => (
              <th
                key={i}
                className="border border-card-border px-3 py-2 bg-muted text-left font-semibold text-foreground"
              >
                {renderInline(c, `${keyPrefix}-th${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri} className="odd:bg-card even:bg-muted/30">
              {r.map((c, ci) => (
                <td key={ci} className="border border-card-border px-3 py-2 text-foreground">
                  {renderInline(c, `${keyPrefix}-r${ri}c${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Prose with embedded tables ──────────────────────────────────────────────

function renderProse(text: string, keyPrefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const out: React.ReactNode[] = [];
  let buffer: string[] = [];

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    const chunk = buffer.join('\n');
    buffer = [];
    if (!chunk.trim()) return;
    out.push(
      <span key={`${keyPrefix}-p${out.length}`} className="whitespace-pre-wrap break-words">
        {renderInline(chunk, `${keyPrefix}-p${out.length}`)}
      </span>
    );
  };

  let i = 0;
  while (i < lines.length) {
    if (isTableLine(lines[i])) {
      let j = i;
      const tableLines: string[] = [];
      while (j < lines.length && isTableLine(lines[j])) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 2) {
        flushBuffer();
        out.push(<MarkdownTable key={`${keyPrefix}-tbl${out.length}`} lines={tableLines} keyPrefix={`${keyPrefix}-tbl${out.length}`} />);
        i = j;
        continue;
      }
    }
    buffer.push(lines[i]);
    i++;
  }
  flushBuffer();
  return out;
}

function TextSegment({
  text,
  gallery,
  hideImages,
  keyPrefix,
}: {
  text: string;
  gallery: string[];
  hideImages: boolean;
  keyPrefix: string;
}) {
  const parts = parseInlineImages(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === 'text') {
          return <React.Fragment key={`${keyPrefix}-${i}`}>{renderProse(p.value, `${keyPrefix}-${i}`)}</React.Fragment>;
        }
        if (hideImages) return null;
        return (
          <span key={`${keyPrefix}-${i}`} className="block my-3">
            <ZoomableImage src={p.value} alt="Diagram" gallery={gallery} />
          </span>
        );
      })}
    </>
  );
}

// ─── Public block renderer ───────────────────────────────────────────────────

export default function RichText({
  text,
  gallery = [],
  hideImages = false,
  className,
}: {
  text: string | null | undefined;
  gallery?: string[];
  hideImages?: boolean;
  className?: string;
}) {
  if (!text) return null;
  const segments = splitFencedCode(text);
  return (
    <div className={className}>
      {segments.map((seg, si) =>
        seg.kind === 'code' ? (
          <CodeBlock key={si} lang={seg.lang} content={seg.content} />
        ) : (
          <TextSegment key={si} text={seg.content} gallery={gallery} hideImages={hideImages} keyPrefix={`s${si}`} />
        )
      )}
    </div>
  );
}
