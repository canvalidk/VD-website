import type { PreparedTrace } from './data/traces.ts';

export const edgeId = (from: string, to: string) => `${from}→${to}`;

/** Rebuild from the displayed step so seeking backwards removes later history. */
export function traceGraphState(trace: PreparedTrace | undefined, index: number) {
  if (!trace) return { startEntryId: undefined, traversed: new Set<string>(), occurrences: [] };
  const traversed = new Set(trace.steps.slice(0, index + 1).flatMap(step =>
    (step.traversedEdges ?? []).map(edge => edgeId(edge.from, edge.to))));
  const occurrences = (trace.occurrences ?? []).filter(occurrence =>
    index >= trace.steps.findIndex(step => step.id === occurrence.appearsAt))
    .map(occurrence => ({ ...occurrence, flattened: index >= trace.steps.findIndex(step => step.id === occurrence.flattenedAt) }));
  return { startEntryId: trace.startEntryId ?? trace.steps[0].relatedEntryIds[0], traversed, occurrences };
}
