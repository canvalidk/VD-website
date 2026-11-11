import { useEffect, useRef, useState } from 'react';
import type { PreparedTrace } from './data/traces';
import type { PredictionSnapshot, RecordedClaim } from './predictions';
import { claimDependencies, relevance } from './predictions';
import { earlierDerivations, stageChange, stageGroups } from './derivations';

export const relevanceLabel = { current: 'In this derivation', historical: 'Earlier derivation', unknown: 'Support unknown' };
const list = (ids: string[]) => ids.join(', ');

interface Props {
  trace: PreparedTrace;
  index: number;
  claim?: RecordedClaim;
  onClaim: (id: string, reveal?: boolean) => void;
  onSeek: (index: number) => void;
}

export default function ResultView({ trace, index, claim, onClaim, onSeek }: Props) {
  const [view, setView] = useState<'claims' | 'dependencies'>('claims');
  const [filter, setFilter] = useState<'current' | 'historical' | 'unknown'>('current');
  const snapshot = trace.steps[index].predictionSet;
  if (!snapshot) return <section className="result-unavailable"><p className="eyebrow">RESULT & COMMITMENTS</p><h3>No recorded commitments for this step</h3><p>This playback has an active fragment, but no recorded root result or commitments. Explore the trace in Dictionary network, or try the correction example.</p></section>;
  const current = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'current');
  const historical = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'historical');
  const unknown = snapshot.predictions.filter(item => relevance(snapshot, item.id) === 'unknown');
  const change = stageChange(trace, index)!;
  const groups = stageGroups(trace);
  const earlier = earlierDerivations(trace, index);
  const changeText = change.newDerivation
    ? [`${change.label ?? 'A new derivation'} starts here.`, change.carried.length ? `Carried over: ${list(change.carried)}.` : '', change.retired.length ? `Left with the earlier derivation: ${list(change.retired)}.` : '', change.added.length ? `Added: ${list(change.added)}.` : ''].filter(Boolean).join(' ')
    : [change.added.length ? `Added: ${list(change.added)}.` : '', change.retired.length ? `No longer relied on: ${list(change.retired)}.` : ''].filter(Boolean).join(' ') || 'The same recorded commitments support this result.';
  const effectiveFilter = filter === 'historical' && !historical.length ? 'current' : filter;
  const claims = effectiveFilter === 'current' ? current : effectiveFilter === 'historical' ? historical : unknown;
  const dependencies = claim ? claimDependencies(snapshot, claim) : [];
  const select = (id: string) => onClaim(id);
  return <section id="result-view" className="result-panel" aria-labelledby="result-title">
    <div className="result-heading"><p className="eyebrow">RECORDED ROOT RESULT</p><span className="response-badge">{trace.scriptedResponses ? 'Scripted responses' : 'Recorded responses'}</span></div>
    <div className="result-stage-groups">{groups.map(group => <div className="stage-group" key={group.id || 'all'} style={{ flexGrow: group.indexes.length }}>
      {group.label && <p className="stage-group-label">{group.label}</p>}
      <ol className="result-stages" aria-label={group.label ? `${group.label} snapshots` : 'Result snapshots'}>{group.indexes.map(i => <li key={trace.steps[i].id}><button aria-current={index === i ? 'step' : undefined} onClick={() => onSeek(i)}><span>{String(i + 1).padStart(2, '0')}</span>{trace.steps[i].snapshotLabel ?? trace.steps[i].title}</button></li>)}</ol>
    </div>)}</div>
    <div className="result-output" aria-live="polite" aria-atomic="true">{trace.steps[index].derivationId && <p className="result-derivation">{trace.derivations?.find(item => item.id === trace.steps[index].derivationId)?.label}</p>}<h2 id="result-title">{snapshot.result}</h2><p>{snapshot.trace_complete ? 'No open demands' : 'Open demands remain'}<span aria-hidden="true"> · </span>{snapshot.predictions.every(item => item.verification === 'unchecked') ? 'Claims unchecked' : 'See claim verification'}</p></div>
    <p className="result-narrative">{trace.steps[index].description}</p>
    {earlier.map(group => { const last = group.indexes.at(-1)!; return <div className="earlier-derivation" key={group.id}>
      <div><span>{group.label} · as issued</span><strong>{trace.steps[last].predictionSet?.result}</strong>{group.outcome && <p>{group.outcome}</p>}</div>
      <button onClick={() => onSeek(last)}>View as issued <span aria-hidden="true">↗</span></button>
    </div>; })}
    {index > 0 && <div className="support-change"><span>Since previous snapshot</span><p>{changeText}</p></div>}
    <div id="recorded-claims" className="claims-heading" tabIndex={-1}><div><h3>What does this result rely on?</h3><p>Recorded commitments. If one fails, its failure is a member of this derivation's hypothesis set.</p></div><div className="result-view-picker" aria-label="Prediction presentation"><button aria-pressed={view === 'claims'} onClick={() => setView('claims')}>Claims</button><button aria-pressed={view === 'dependencies'} onClick={() => setView('dependencies')}>Dependencies</button></div></div>
    {view === 'claims' ? <>
      <div className="claim-filters" aria-label="Claim relevance">
        <button aria-pressed={effectiveFilter === 'current'} onClick={() => { setFilter('current'); if (current.length) onClaim(current[0].id, false); }}>This derivation <span>{current.length}</span></button>
        <button aria-pressed={effectiveFilter === 'historical'} disabled={!historical.length} onClick={() => { setFilter('historical'); onClaim(historical[0].id, false); }}>Earlier derivation <span>{historical.length}</span></button>
        {!!unknown.length && <button aria-pressed={effectiveFilter === 'unknown'} onClick={() => { setFilter('unknown'); onClaim(unknown[0].id, false); }}>Unknown <span>{unknown.length}</span></button>}
      </div>
      <p className="claim-group-note">{effectiveFilter === 'historical' ? 'Kept in the record with the derivation that made them. They are not commitments of the derivation shown.' : effectiveFilter === 'unknown' ? 'The export cannot establish whether these claims support this result.' : 'Each is a commitment of this derivation. Relying on a claim does not establish that it is true.'}</p>
      <div className="claim-list">{claims.map(item => <button className={'claim-row' + (item.id === claim?.id ? ' selected' : '')} key={item.id} aria-pressed={item.id === claim?.id} onClick={() => select(item.id)}><span className="claim-id">{item.id}</span><span className="claim-text"><span className="claim-category">{item.classification.category}</span><strong>{item.evidence.response}</strong><span className="claim-stimulus">{item.evidence.stimulus}</span></span><span className="claim-status">{item.verification} <span aria-hidden="true">↗</span></span></button>)}</div>
      {!claims.length && <p className="claim-group-note">No claims in this group.</p>}
    </> : <div className="dependency-view">
      <p className="claim-group-note">Choose a claim to see its recorded support. Dependencies include indirect consumers; their order is not a proof tree.</p>
      <div className="dependency-choices">{snapshot.predictions.map(item => <button key={item.id} aria-pressed={item.id === claim?.id} onClick={() => onClaim(item.id, false)}>{item.id}<span>{item.evidence.response}</span></button>)}</div>
      {claim && <><button className="dependency-target" onClick={() => select(claim.id)} aria-label={`Inspect ${claim.id} evidence`}><span>{claim.id} · {relevanceLabel[relevance(snapshot, claim.id)]}</span><strong>{claim.evidence.response}</strong><span>Inspect evidence ↗</span></button><p className="dependency-connector">↑ recorded support</p><div className="dependency-support">{dependencies.map(item => <button key={item.id} onClick={() => onClaim(item.id, false)}><span>{item.id}</span>{item.evidence.response}</button>)}</div>{!dependencies.length && <p className="claim-group-note">{claim.evidence.dependencies_complete ? 'No earlier response dependencies recorded for this claim.' : 'Earlier response dependencies are incomplete.'}</p>}</>}
    </div>}
    <div className="coverage-note"><span className="coverage-dot" aria-hidden="true"/><p><strong>Partial hypothesis set · no verdict computed</strong><br/>{snapshot.dependency_selection_complete ? 'Recorded support is fully tracked for this snapshot.' : 'Recorded support has gaps.'} Equivalence and supplied-input fidelity are still unchecked.</p></div>
    <details className="result-boundary"><summary>What is included?</summary><p>The trace records two kinds of commitment: supplied inputs and meaning-preserving substitutions. The failure of each one is a member of the derivation's hypothesis set. The full set also contains the result itself, and commitments the trace does not record yet. The producer's export calls this list a prediction set.</p><ul>{snapshot.limitations.map(text => <li key={text}>{text}</li>)}</ul><p>Trace settlement, recorded dependency coverage, and claim correctness are separate states.</p></details>
  </section>;
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
  return <aside ref={inspector} id="claim-inspector" className="inspector claim-inspector" tabIndex={-1} aria-label="Selected claim details">
    <button className="back-to-claims" onClick={() => { const target = document.getElementById('recorded-claims'); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'start' }); }}>↑ Back to claims</button>
    <div className="section-label"><h2>Claim details</h2><span>{claim.id}</span></div>
    <span className={'relevance-badge ' + relevance(snapshot, claim.id)}>{relevanceLabel[relevance(snapshot, claim.id)]}</span>
    <h3>{claim.kind === 'supplied_input' ? 'Supplied input' : 'Meaning preservation'}</h3>
    <p className="claim-statement">{claim.statement}</p>
    <div className="claim-evidence"><p className="eyebrow">STIMULUS</p><p>{claim.evidence.stimulus}</p><span aria-hidden="true">↓</span><p className="eyebrow">RECORDED RESPONSE</p><p>{claim.evidence.response}</p></div>
    <dl className="claim-metadata"><div><dt>Category</dt><dd>{claim.classification.category}</dd></div><div><dt>Verification</dt><dd>{claim.verification}</dd></div><div><dt>Event</dt><dd>{claim.event_index} · {claim.operation}</dd></div><div><dt>Frame</dt><dd>{claim.evidence.before.address.length ? claim.evidence.before.address.join(' › ') : 'root'}</dd></div></dl>
    <p className="claim-group-note">Category is a reader's label. It is separate from verification.</p>
    <div className="reference-section"><p className="eyebrow">RECORDED SUPPORT</p><div className="dependency-chips">{dependencies.map(item => <button key={item.id} onClick={() => onClaim(item.id)}>{item.id} · {item.evidence.response}</button>)}</div>{!dependencies.length && <p className="muted">{claim.evidence.dependencies_complete ? 'No earlier responses recorded.' : 'Support incomplete.'}</p>}</div>
    {sourceId && <button className="source-definition-link" onClick={onSource}>Inspect source definition <span>{sourceId} ↗</span></button>}
    <details className="raw-evidence"><summary>Exact frame before / after</summary><p>Before</p><pre>{claim.evidence.before.render}</pre><p>After</p><pre>{claim.evidence.after.render}</pre></details>
  </aside>;
}
