import type { PreparedTrace } from './data/traces.ts';

export const edgeId = (from: string, to: string) => `${from}→${to}`;

/** Rebuild from the displayed step so seeking backwards removes later history. */
export function traceGraphState(trace: PreparedTrace | undefined, index: number) {
  const boundInputs = new Map<string, { from: string; to: string; value: string }>();
  if (!trace) return { startEntryId: undefined, traversed: new Set<string>(), occurrences: [], boundInputs };
  const traversed = new Set(trace.steps.slice(0, index + 1).flatMap(step =>
    (step.traversedEdges ?? []).map(edge => edgeId(edge.from, edge.to))));
  const occurrences = (trace.occurrences ?? []).filter(occurrence =>
    index >= trace.steps.findIndex(step => step.id === occurrence.appearsAt))
    .map(occurrence => ({ ...occurrence, flattened: index >= trace.steps.findIndex(step => step.id === occurrence.flattenedAt) }));
  for (const step of trace.steps.slice(0, index + 1)) {
    for (const input of step.boundInputs ?? []) boundInputs.set(edgeId(input.from, input.to), input);
  }
  return { startEntryId: trace.startEntryId ?? trace.steps[0].relatedEntryIds[0], traversed, occurrences, boundInputs };
}
