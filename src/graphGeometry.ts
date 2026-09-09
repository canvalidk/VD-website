interface Point { x: number; y: number }

/** Split a quadratic at its midpoint to give markerMid a directional anchor. */
export function referencePath(from: Point, to: Point, reciprocal: boolean) {
  const dx = to.x - from.x, dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = reciprocal ? 48 : 0;
  const control = { x: (from.x + to.x) / 2 - dy / length * offset, y: (from.y + to.y) / 2 + dx / length * offset };
  const first = { x: (from.x + control.x) / 2, y: (from.y + control.y) / 2 };
  const second = { x: (to.x + control.x) / 2, y: (to.y + control.y) / 2 };
  const middle = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
  return { middle, path: `M ${from.x} ${from.y} Q ${first.x} ${first.y} ${middle.x} ${middle.y} Q ${second.x} ${second.y} ${to.x} ${to.y}` };
}
