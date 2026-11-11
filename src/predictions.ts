/** Display boundary for VDfirst schema 2. No claims are inferred from prose. */
export interface NodeEvidence {
  address: number[];
  render: string;
  source_index: number | null;
}
export interface RecordedClaim {
  id: string;
  event_index: number;
  operation: string;
  kind: string;
  statement: string;
  evidence: {
    stimulus: string;
    response: string;
    before: NodeEvidence;
    after: NodeEvidence;
    dependencies: number[];
    dependencies_complete: boolean;
  };
  classification: { category: string; note: string };
  verification: string;
}
export interface PredictionSnapshot {
  schema_version: number;
  result: string;
  trace_complete: boolean;
  predictions: RecordedClaim[];
  current_prediction_ids: string[];
  historical_prediction_ids: string[];
  dependency_selection_complete: boolean;
  coverage_complete: boolean;
  unrecorded_events: number[];
  limitations: string[];
}
export type Relevance = 'current' | 'historical' | 'unknown';
export function relevance(snapshot: PredictionSnapshot, id: string): Relevance {
  if (snapshot.current_prediction_ids.includes(id)) return 'current';
  if (snapshot.dependency_selection_complete && snapshot.historical_prediction_ids.includes(id)) return 'historical';
  return 'unknown';
}
export function snapshotChanges(previous: PredictionSnapshot | undefined, current: PredictionSnapshot) {
  return {
    added: current.current_prediction_ids.filter(id => !previous?.current_prediction_ids.includes(id)),
    retired: (previous?.current_prediction_ids ?? []).filter(id => relevance(current, id) === 'historical'),
  };
}
/** Exported dependencies are transitive. Render them as a flat support set. */
export function claimDependencies(snapshot: PredictionSnapshot, claim: RecordedClaim) {
  return snapshot.predictions.filter(item => claim.evidence.dependencies.includes(item.event_index));
}
export function sourceEntryId(claim: RecordedClaim, entries: { id: string; sourceId: string }[]) {
  const index = claim.evidence.before.source_index;
  return index === null ? undefined : entries.find(entry => entry.sourceId === `E${index}`)?.id;
}
