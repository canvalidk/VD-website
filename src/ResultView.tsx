import { useEffect, useRef, useState } from 'react';
import type { PreparedTrace } from './data/traces';
import type { PredictionSnapshot, RecordedClaim } from './predictions';
import { claimDependencies, relevance } from './predictions';
import { earlierDerivations, stageChange, stageGroups } from './derivations';
import type { StageGroup } from './derivations';
import { traceTitle } from './pages/format';

export const relevanceLabel = { current: 'In this derivation', historical: 'Earlier derivation', unknown: 'Support unknown' };
const list = (ids: string[]) => ids.join(', ');
const kindName = (claim: RecordedClaim) => claim.kind === 'supplied_input' ? 'Supplied input' : 'Meaning preservation';

interface Props {
  trace: PreparedTrace;
  index: number;
  claim?: RecordedClaim;
  onClaim: (id: string, reveal?: boolean) => void;
  onSeek: (index: number) => void;
}

/**
 * Derivation 1 and Derivation 2 side by side, once a later derivation has started.
 * The first derivation stays as issued: full ink, never struck through, greyed or marked as a warning.
 */
function DerivationComparison({ trace, index, groups, onSeek }: { trace: PreparedTrace; index: number; groups: StageGroup[]; onSeek: (index: number) => void }) {
  const earlier = earlierDerivations(trace, index).map(group => group.id);
  return <div className="tr-derivations" role="group" aria-label="The derivations in this trace">
    {groups.map(group => {
      const last = group.indexes.at(-1)!;
      const result = trace.steps[last].predictionSet?.result;
      const note = earlier.includes(group.id) && group.outcome ? group.outcome : group.indexes[0] > 0 ? 'A new derivation, with its own commitments.' : 'The record of this derivation, as issued.';
      const shown = group.indexes.includes(index);
      return <section className={'tr-derivation' + (shown ? ' is-shown' : '')} key={group.id} aria-labelledby={`tr-derivation-${group.id}`}>
        <h3 id={`tr-derivation-${group.id}`}>{group.label}</h3>
        {result && <p className="vd-string tr-derivation-result">{result}</p>}
        <p className="tr-derivation-note">{note}</p>
        {last === index
          ? <p className="vd-label tr-derivation-here">Its result is shown below.</p>
          : <button type="button" className="vd-link-button tr-derivation-open" onClick={() => onSeek(last)}>{earlier.includes(group.id) ? 'View as issued' : 'Open its result'}</button>}
      </section>;
    })}
  </div>;
}

export default function ResultView({ trace, index, claim, onClaim, onSeek }: Props) {
  const [view, setView] = useState<'claims' | 'dependencies'>('claims');
  const [filter, setFilter] = useState<'current' | 'historical' | 'unknown'>('current');
  const snapshot = trace.steps[index].predictionSet;
  if (!snapshot) return <div id="result-view" className="tr-result-unavailable">
    <h3>No recorded commitments for this step</h3>
    <p className="vd-voice">This playback has an active fragment, but no recorded root result or commitments. Explore the trace on the network, or try the correction example.</p>
  </div>;
  const current = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'current');
  const historical = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'historical');
  const unknown = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'unknown');
  const change = stageChange(trace, index)!;
  const groups = stageGroups(trace);
  const labelled = groups.filter(group => group.label);
  const earlier = earlierDerivations(trace, index);
  const changeText = change.newDerivation
    ? [`${change.label ?? 'A new derivation'} starts here.`, change.carried.length ? `Carried over: ${list(change.carried)}.` : '', change.retired.length ? `Left with the earlier derivation: ${list(change.retired)}.` : '', change.added.length ? `Added: ${list(change.added)}.` : ''].filter(Boolean).join(' ')
    : [change.added.length ? `Added: ${list(change.added)}.` : '', change.retired.length ? `No longer relied on: ${list(change.retired)}.` : ''].filter(Boolean).join(' ') || 'The same recorded commitments support this result.';
  const effectiveFilter = filter === 'historical' && !historical.length ? 'current' : filter;
  const claims = effectiveFilter === 'current' ? current : effectiveFilter === 'historical' ? historical : unknown;
  const dependencies = claim ? claimDependencies(snapshot, claim) : [];
  const select = (id: string) => onClaim(id);
  const derivationLabel = trace.derivations?.find(item => item.id === trace.steps[index].derivationId)?.label;

  return <div id="result-view" className="tr-result-view">
    <div className="tr-stage-groups">{groups.map(group => <div className="tr-stage-group" key={group.id || 'all'}>
      {group.label && <p className="tr-stage-group-label">{group.label}</p>}
      <ol className="tr-stages" aria-label={group.label ? `${group.label} snapshots` : 'Result snapshots'}>{group.indexes.map(i => <li key={trace.steps[i].id}>
        <button type="button" className="tr-stage" aria-current={index === i ? 'step' : undefined} onClick={() => onSeek(i)}><span className="tr-stage-number vd-num">{i + 1}</span><span className="tr-stage-name">{traceTitle(trace.steps[i].snapshotLabel ?? trace.steps[i].title)}</span></button>
      </li>)}</ol>
    </div>)}</div>

    {earlier.length > 0 && labelled.length > 1 && <DerivationComparison trace={trace} index={index} groups={labelled} onSeek={onSeek}/>}

    <div className="tr-result-columns">
      <div className="tr-result-lead">
        <div className="tr-result-slip" aria-live="polite" aria-atomic="true">
          {derivationLabel && <p className="vd-label tr-result-derivation">{derivationLabel}</p>}
          <p className="vd-string tr-result-figure">{snapshot.result}</p>
          <p className="tr-result-state">{snapshot.trace_complete ? 'No open demands.' : 'Open demands remain.'} {snapshot.predictions.every(item => item.verification === 'unchecked') ? 'Claims unchecked.' : 'See claim verification.'}</p>
          <p className="vd-label tr-result-responses">{trace.scriptedResponses ? 'scripted responses' : 'recorded responses'}</p>
        </div>
        <p className="tr-result-narrative">{trace.steps[index].description}</p>
        {index > 0 && <div className="tr-support-change"><h3 className="tr-minor-head">Since the previous snapshot</h3><p>{changeText}</p></div>}
        <div className="tr-coverage"><p><strong>Partial hypothesis set. No verdict computed.</strong> {snapshot.dependency_selection_complete ? 'Recorded support is fully tracked for this snapshot.' : 'Recorded support has gaps.'} Equivalence and supplied-input fidelity are still unchecked.</p></div>
        <details className="tr-details"><summary>What is included?</summary><p>The trace records two kinds of commitment: supplied inputs and meaning-preserving substitutions. The failure of each one is a member of the derivation's hypothesis set. The full set also contains the result itself, and commitments the trace does not record yet. The producer's export calls this list a prediction set.</p><ul>{snapshot.limitations.map(text => <li key={text}>{text}</li>)}</ul><p>Trace settlement, recorded dependency coverage, and claim correctness are separate states.</p></details>
      </div>

      <div className="tr-commitments">
        <div id="recorded-claims" className="tr-claims-heading" tabIndex={-1}>
          <h3>What does this result rely on?</h3>
          <p>Recorded commitments. If one fails, its failure is a member of this derivation's hypothesis set.</p>
        </div>
        <div className="tr-claim-tools">
          <div className="vd-segmented" role="group" aria-label="Show commitments as"><button type="button" className="vd-button" aria-pressed={view === 'claims'} onClick={() => setView('claims')}>Claims</button><button type="button" className="vd-button" aria-pressed={view === 'dependencies'} onClick={() => setView('dependencies')}>Dependencies</button></div>
          {view === 'claims' && <div className="vd-segmented" role="group" aria-label="Claim relevance">
            <button type="button" className="vd-button" aria-pressed={effectiveFilter === 'current'} onClick={() => { setFilter('current'); if (current.length) onClaim(current[0].id, false); }}>This derivation <span className="tr-count vd-num">{current.length}</span></button>
            <button type="button" className="vd-button" aria-pressed={effectiveFilter === 'historical'} disabled={!historical.length} onClick={() => { setFilter('historical'); onClaim(historical[0].id, false); }}>Earlier derivation <span className="tr-count vd-num">{historical.length}</span></button>
            {!!unknown.length && <button type="button" className="vd-button" aria-pressed={effectiveFilter === 'unknown'} onClick={() => { setFilter('unknown'); onClaim(unknown[0].id, false); }}>Unknown <span className="tr-count vd-num">{unknown.length}</span></button>}
          </div>}
        </div>
        {view === 'claims' ? <>
          <p className="tr-note">{effectiveFilter === 'historical' ? 'Kept in the record with the derivation that made them. They are not commitments of the derivation shown.' : effectiveFilter === 'unknown' ? 'The export cannot establish whether these claims support this result.' : 'Each is a commitment of this derivation. Relying on a claim does not establish that it is true.'}</p>
          {claims.length > 0 && <ul className="tr-claims">{claims.map(item => <li key={item.id}>
            <button type="button" className="tr-claim" aria-pressed={item.id === claim?.id} onClick={() => select(item.id)}>
              <span className="vd-string tr-claim-id">{item.id}</span>
              <span className="tr-claim-body">
                <span className="vd-label tr-claim-category">{item.classification.category}</span>
                <span className="vd-string tr-claim-response">{item.evidence.response}</span>
                <span className="vd-string tr-claim-stimulus">{item.evidence.stimulus}</span>
              </span>
              <span className="vd-label tr-claim-status">{item.verification}</span>
            </button>
          </li>)}</ul>}
          {!claims.length && <p className="tr-note">No claims in this group.</p>}
        </> : <div className="tr-dependencies">
          <p className="tr-note">Choose a claim to see its recorded support. Dependencies include indirect consumers; their order is not a proof tree.</p>
          <ul className="tr-dependency-choices">{snapshot.predictions.map(item => <li key={item.id}><button type="button" className="tr-chip" aria-pressed={item.id === claim?.id} onClick={() => onClaim(item.id, false)}><span className="vd-string tr-chip-id">{item.id}</span><span className="vd-string">{item.evidence.response}</span></button></li>)}</ul>
          {claim && <>
            <div className="tr-dependency-target">
              <p className="vd-label">{relevanceLabel[relevance(snapshot, claim.id)]}</p>
              <p><span className="vd-string tr-chip-id">{claim.id}</span> <span className="vd-string tr-dependency-response">{claim.evidence.response}</span></p>
              <button type="button" className="vd-link-button tr-text-action" onClick={() => select(claim.id)}>Inspect the evidence for <span className="vd-string">{claim.id}</span></button>
            </div>
            <h4 className="tr-minor-head">Its recorded support</h4>
            {dependencies.length > 0 && <ul className="tr-dependency-support">{dependencies.map(item => <li key={item.id}><button type="button" className="tr-chip" onClick={() => onClaim(item.id, false)}><span className="vd-string tr-chip-id">{item.id}</span><span className="vd-string">{item.evidence.response}</span></button></li>)}</ul>}
            {!dependencies.length && <p className="tr-note">{claim.evidence.dependencies_complete ? 'No earlier response dependencies recorded for this claim.' : 'Earlier response dependencies are incomplete.'}</p>}
          </>}
        </div>}
      </div>
    </div>
  </div>;
}

interface InspectorProps {
  snapshot: PredictionSnapshot;
  claim: RecordedClaim;
  onClaim: (id: string) => void;
  sourceId?: string;
  onSource: () => void;
}
export function ClaimInspector({ snapshot, claim, onClaim, sourceId, onSource }: InspectorProps) {
  const dependencies = claimDependencies(snapshot, claim);
  const inspector = useRef<HTMLElement>(null);
  useEffect(() => { if (inspector.current) inspector.current.scrollTop = 0; }, [claim.id]);
  return <aside ref={inspector} id="claim-inspector" className="tr-inspector" tabIndex={-1} aria-labelledby="tr-inspector-title">
    <button type="button" className="vd-link-button tr-back-to-claims" onClick={() => { const target = document.getElementById('recorded-claims'); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start' }); }}>Back to claims</button>
    <h3 id="tr-inspector-title" className="tr-inspector-title">Claim <span className="vd-string">{claim.id}</span></h3>
    <p className="vd-label tr-inspector-relevance">{relevanceLabel[relevance(snapshot, claim.id)]}</p>
    <p className="tr-inspector-kind">{kindName(claim)}</p>
    <p className="vd-string tr-inspector-statement">{claim.statement}</p>
    <dl className="tr-evidence">
      <div><dt>Stimulus</dt><dd className="vd-string">{claim.evidence.stimulus}</dd></div>
      <div><dt>Recorded response</dt><dd className="vd-string">{claim.evidence.response}</dd></div>
    </dl>
    <dl className="tr-metadata">
      <div><dt>Category</dt><dd className="vd-label">{claim.classification.category}</dd></div>
      <div><dt>Verification</dt><dd className="vd-label">{claim.verification}</dd></div>
      <div><dt>Event</dt><dd><span className="vd-num">{claim.event_index}</span>, {claim.operation}</dd></div>
      <div><dt>Frame</dt><dd className="vd-num">{claim.evidence.before.address.length ? claim.evidence.before.address.join(', ') : 'root'}</dd></div>
    </dl>
    <p className="tr-note">Category is a reader's label. It is separate from verification.</p>
    <h4 className="tr-minor-head">Recorded support</h4>
    {dependencies.length > 0 && <ul className="tr-dependency-support">{dependencies.map(item => <li key={item.id}><button type="button" className="tr-chip" onClick={() => onClaim(item.id)}><span className="vd-string tr-chip-id">{item.id}</span><span className="vd-string">{item.evidence.response}</span></button></li>)}</ul>}
    {!dependencies.length && <p className="tr-note">{claim.evidence.dependencies_complete ? 'No earlier responses recorded.' : 'Support incomplete.'}</p>}
    {sourceId && <button type="button" className="vd-link-button tr-text-action" onClick={onSource}>Read the source definition, <span className="vd-string">{sourceId}</span>, in the dictionary</button>}
    <details className="tr-details"><summary>Exact frame before and after</summary>
      <p className="tr-minor-head">Before</p><p className="vd-string tr-render">{claim.evidence.before.render}</p>
      <p className="tr-minor-head">After</p><p className="vd-string tr-render">{claim.evidence.after.render}</p>
    </details>
  </aside>;
}
