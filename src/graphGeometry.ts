export interface Point { x: number; y: number }
export interface Segment { x1: number; y1: number; x2: number; y2: number }

/** Split a quadratic at its midpoint to give markerMid a directional anchor. */
export function referencePath(from: Point, to: Point, reciprocal: boolean) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = reciprocal ? 48 : 0;
  const control = { x: (from.x + to.x) / 2 - dy / length * offset, y: (from.y + to.y) / 2 + dx / length * offset };
  const first = { x: (from.x + control.x) / 2, y: (from.y + control.y) / 2 };
  const second = { x: (to.x + control.x) / 2, y: (to.y + control.y) / 2 };
  const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  // `approach` is the control point of the last piece: the path arrives at `to` heading away from it.
  return { middle, approach: second, path: `M ${from.x} ${from.y} Q ${first.x} ${first.y} ${middle.x} ${middle.y} Q ${second.x} ${second.y} ${to.x} ${to.y}` };
}

/**
 * The double rail of a chimney or wall link: two parallel segments, each offset half the gap
 * along the link's unit normal. Drawn as two lines, not an overpainted stripe, so the tray shows between them.
 */
export function railPair(from: Point, to: Point, gap: number): [Segment, Segment] {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length * gap / 2, ny = dx / length * gap / 2;
  return [
    { x1: from.x + nx, y1: from.y + ny, x2: to.x + nx, y2: to.y + ny },
    { x1: from.x - nx, y1: from.y - ny, x2: to.x - nx, y2: to.y - ny },
  ];
}

/**
 * Where a line heading from `from` to the centre of a box crosses the box's border, pulled back
 * towards `from` by `inset`. Lines run centre to centre under the slips, so anything drawn at a
 * link's end (the given-input circle, the end of a link to an unwritten slot) is placed here instead.
 */
export function boxExit(from: Point, centre: Point, halfWidth: number, halfHeight: number, inset = 0): Point {
  const dx = from.x - centre.x, dy = from.y - centre.y;
  const length = Math.hypot(dx, dy);
  if (!length) return { ...centre };
  const scale = Math.min(Math.abs(dx) ? halfWidth / Math.abs(dx) : Infinity, Math.abs(dy) ? halfHeight / Math.abs(dy) : Infinity);
  const reach = Math.min(length, length * scale + inset);
  return { x: centre.x + dx / length * reach, y: centre.y + dy / length * reach };
}

/**
 * Lines for a headword drawn as SVG text, which cannot wrap by itself. Breaks only after the
 * headword's own hyphens, never inside a part, so the string stays exact when read across lines.
 */
export function hyphenLines(word: string, maxChars: number): string[] {
  const parts = word.match(/[^-]+-|[^-]+$|-/g) ?? [word];
  const lines: string[] = [];
  for (const part of parts) {
    const last = lines.length - 1;
    if (last >= 0 && lines[last].length + part.length <= maxChars) lines[last] += part;
    else lines.push(part);
  }
  return lines;
}
