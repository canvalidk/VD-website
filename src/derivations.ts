import type { PreparedTrace } from './data/traces.ts';
import { snapshotChanges } from './predictions.ts';

/**
 * A derivation as issued is fixed. Finding a mistake in it does not edit it;
 * the corrected derivation is a new one with its own commitments.
 */
export interface StageGroup { id: string; label?: string; outcome?: string; indexes: number[] }

/** Contiguous runs of steps in one derivation. A trace without derivations is one unlabelled group. */
export function stageGroups(trace: PreparedTrace): StageGroup[] {
  const groups: StageGroup[] = [];
  trace.steps.forEach((step, index) => {
    const id = step.derivationId ?? '';
    const last = groups.at(-1);
    if (last && last.id === id) { last.indexes.push(index); return; }
    const derivation = trace.derivations?.find(item => item.id === id);
    groups.push({ id, label: derivation?.label, outcome: derivation?.outcome, indexes: [index] });
  });
  return groups;
}

/** Labelled derivations that finished before the one containing this step. */
export function earlierDerivations(trace: PreparedTrace, index: number): StageGroup[] {
  const groups = stageGroups(trace);
  const at = groups.findIndex(group => group.indexes.includes(index));
  return groups.slice(0, Math.max(at, 0)).filter(group => group.label);
}

/** What changed since the previous snapshot, and whether this snapshot starts a new derivation. */
export function stageChange(trace: PreparedTrace, index: number) {
  const step = trace.steps[index];
  const previousStep = trace.steps[index - 1];
  const current = step?.predictionSet;
  if (!current) return undefined;
  const previous = previousStep?.predictionSet;
  const newDerivation = !!previousStep && !!step.derivationId && step.derivationId !== previousStep.derivationId;
  const carried = newDerivation ? current.current_prediction_ids.filter(id => previous?.current_prediction_ids.includes(id)) : [];
  const label = trace.derivations?.find(item => item.id === step.derivationId)?.label;
  return { newDerivation, label, carried, ...snapshotChanges(previous, current) };
}
