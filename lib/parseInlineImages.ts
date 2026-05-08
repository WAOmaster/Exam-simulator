export type InlineFragment =
  | { kind: 'text'; value: string }
  | { kind: 'img'; value: string };

const MARKER = /\[IMAGE:\s*([^\]]+)\]/g;

export function parseInlineImages(text: string | null | undefined): InlineFragment[] {
  if (!text) return [];
  const out: InlineFragment[] = [];
  let last = 0;
  for (const m of text.matchAll(MARKER)) {
    const start = m.index ?? 0;
    if (start > last) {
      out.push({ kind: 'text', value: text.slice(last, start) });
    }
    out.push({ kind: 'img', value: m[1].trim() });
    last = start + m[0].length;
  }
  if (last < text.length) {
    out.push({ kind: 'text', value: text.slice(last) });
  }
  return out;
}
