import { useEffect, useState } from 'react';
import { dictionaries } from '../data/dictionaries';
import { traces } from '../data/traces';
import type { PreparedTrace } from '../data/traces';
import Graph from '../Graph';
import TracePlayer, { TraceControls } from '../TracePlayer';
import ResultView, { ClaimInspector } from '../ResultView';
import Edge from '../Edge';
import { sourceEntryId } from '../predictions';
import { navigate, routeHash } from '../router';
import AccordingTo from './AccordingTo';
import { dictionaryName, numberWord, traceTitle } from './format';
import type { ExplorerProps } from './types';
import type { Action } from '../player';

/** The correction example opens at its result: the corrected derivation, with the first one on record beside it. */
export const CORRECTION_TRACE = 'force-correction';
export const openingStep = (trace: PreparedTrace) => trace.id === CORRECTION_TRACE ? trace.steps.length - 1 : 0;

const kindLabel = (trace: PreparedTrace) => trace.kind === 'recorded' ? (trace.scriptedResponses ? 'recorded run, scripted responses' : 'recorded run') : 'prepared demonstration';
/** The register's gloss: recorded or prepared, the dictionary, and the length. */
function registerGloss(trace: PreparedTrace, dictionaryLabel: string) {
  const derivations = trace.derivations?.length ?? 0;
  const steps = `${trace.steps.length} ${trace.steps.length === 1 ? 'step' : 'steps'}`;
  return `${kindLabel(trace)}. ${dictionaryLabel}, ${steps}${derivations > 1 ? ` in ${numberWord(derivations).toLowerCase()} derivations` : ''}.`;
}

export default function TracesPage({ state, dispatch, selectedSourceId, setSelectedSourceId, selectedClaimId, setSelectedClaimId, presentationVisit }: ExplorerProps) {
  const session = state.sessions[state.dictionaryId];
  const trace = traces.find(item => item.id === session?.traceId) ?? null;
  const dictionary = trace ? dictionaries.find(item => item.id === trace.dictionaryId)! : null;
  const step = trace ? trace.steps[session.stepIndex] : null;
  const selected = dictionary ? dictionary.entries.find(entry => entry.id === session.selectedEntryId) ?? dictionary.entries[0] : null;
  const snapshot = step?.predictionSet;
  const selectedClaim = snapshot?.predictions.find(claim => claim.id === selectedClaimId)
    ?? snapshot?.predictions.filter(claim => snapshot.current_prediction_ids.includes(claim.id) && claim.evidence.before.source_index !== null).at(-1)
    ?? snapshot?.predictions.find(claim => claim.id === snapshot.current_prediction_ids.at(-1));
  const claimSource = selectedClaim && dictionary ? sourceEntryId(selectedClaim, dictionary.entries) : undefined;
  const visited = trace ? [...new Set(trace.steps.slice(0, session.stepIndex + 1).flatMap(item => item.relatedEntryIds))] : [];

  const [follow, setFollow] = useState(true);
  const openTrace = (id: string) => navigate('traces', { t: id });
  const selectEntry = (id: string, sourceId: string | null = null) => { dispatch({ type: 'entry', id }); setSelectedSourceId(sourceId); };
  const selectClaim = (id: string, reveal = true) => {
    setSelectedClaimId(id); dispatch({ type: 'pause' });
    if (reveal && window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => {
      const inspector = document.getElementById('claim-inspector');
      inspector?.focus({ preventScroll: true }); inspector?.scrollIntoView({ block: 'start' });
    });
  };
  const seek = (index: number) => dispatch({ type: 'seek', index });
  // Keep the address on the step shown, whether it moved by a button, a step number or playback.
  const stepShown = session?.stepIndex;
  useEffect(() => {
    if (trace && stepShown !== undefined) window.history.replaceState(null, '', routeHash('traces', { t: trace.id, step: String(stepShown + 1) }));
  }, [trace, stepShown]);
  const playback = (action: Action) => action.type === 'seek' ? seek(action.index) : dispatch(action);

  return <div className="page tr-page">
    <h1 id="page-title" tabIndex={-1} className="page-title">Traces</h1>
    <p className="vd-voice page-lead">A trace follows the entries outward from a starting headword, often a question's. Recorded runs are replayed here at your pace; the site never runs the engine itself.</p>

    <nav aria-label="Traces" className="tr-register">
      <ul>{traces.map(item => { const home = dictionaries.find(entry => entry.id === item.dictionaryId)!; return <li key={item.id}>
        <a href={routeHash('traces', { t: item.id })} className="tr-register-row" aria-current={trace?.id === item.id ? 'true' : undefined} onClick={event => { event.preventDefault(); openTrace(item.id); }}>
          <span className="tr-register-title">{item.id === CORRECTION_TRACE ? 'A corrected mistake' : traceTitle(item.title)}</span>
          <span className="vd-label tr-register-gloss">{registerGloss(item, dictionaryName(home))}</span>
        </a>
      </li>; })}</ul>
    </nav>

    {!trace || !dictionary || !selected || !step ? <p className="vd-voice tr-empty">Choose a trace above to replay it. The correction example shows a derivation with a mistake in it, and the new derivation that corrects it.</p> : <>
      <AccordingTo dictionary={dictionary}/>
      <Edge dictionary={dictionary} selectedHeadword={selected.id} selectedSourceId={selectedSourceId} visitedHeadwords={visited} currentHeadwords={step.relatedEntryIds} onSelect={(headword, sourceId) => selectEntry(headword, sourceId)}/>
      <div className="tr-playback">
        <section className="tr-network" aria-label="Trace on the dictionary map">
          <Graph dictionary={dictionary} selected={selected} selectedSourceId={selectedSourceId} trace={trace} stepIndex={session.stepIndex} playing={session.playing} onSelect={(id, sourceId) => selectEntry(id, sourceId ?? null)} onPlayback={playback} showPlayback={false} follow={follow} onFollowChange={setFollow}
            controls={<TraceControls trace={trace} session={session} dispatch={playback} follow={follow} onFollowChange={setFollow}/>}/>
        </section>
        <TracePlayer trace={trace} session={session} selectedId={selected.id} dispatch={playback} selectEntry={id => selectEntry(id)} showControls={false}/>
      </div>
      {snapshot && <section className="tr-result" aria-labelledby="tr-result-heading">
        <h2 id="tr-result-heading" className="tr-result-heading">Result and commitments</h2>
        <div className="tr-result-grid">
          <ResultView key={`${trace.id}-${presentationVisit}`} trace={trace} index={session.stepIndex} claim={selectedClaim} onClaim={selectClaim} onSeek={seek}/>
          {selectedClaim && <ClaimInspector snapshot={snapshot} claim={selectedClaim} onClaim={selectClaim} sourceId={claimSource} onSource={() => { if (claimSource) navigate('dictionary', { d: dictionary.id, entry: claimSource }); }}/>}
        </div>
      </section>}
    </>}
  </div>;
}
