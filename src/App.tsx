import { useEffect, useReducer, useState } from 'react';
import { dictionaries } from './data/dictionaries';
import { traces } from './data/traces';
import { explorerReducer, initialState } from './player';
import Graph from './Graph';
import TracePlayer from './TracePlayer';
import ResultView, { ClaimInspector } from './ResultView';
import { sourceEntryId } from './predictions';
import Explanation from './Explanation';
import type { ExplanationAction } from './data/explanation';
import HouseView from './HouseView';
import { entryRoles, houseStatus, lawLabel, outline } from './houses';
import type { Entry } from './data/dictionaries';

type WorkspaceView = 'laws' | 'dictionary' | 'result';
const roleName = { chimney: 'Chimney', triplet: 'Triplet corner', wall: 'Wall' };

export default function App() {
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('result');
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [presentationVisit, setPresentationVisit] = useState(0);
  const dictionary = dictionaries.find(item => item.id === state.dictionaryId);
  const session = state.sessions[state.dictionaryId];
  const selected = dictionary?.entries.find(entry => entry.id === session?.selectedEntryId);
  const trace = traces.find(item => item.id === session?.traceId);
  const hasLaws = !!dictionary?.houses?.length;
  // Fall back when the chosen view has nothing to show for this dictionary or trace.
  const view: WorkspaceView = workspaceView === 'result' ? (trace ? 'result' : hasLaws ? 'laws' : 'dictionary') : workspaceView === 'laws' && !hasLaws ? 'dictionary' : workspaceView;
  const selectEntry = (id: string, sourceId: string | null = null) => { dispatch({ type: 'entry', id }); setSelectedSourceId(sourceId); if (view === 'result') setWorkspaceView('dictionary'); };
  const defaultView = (dictionaryId: string): WorkspaceView => dictionaries.find(item => item.id === dictionaryId)?.houses?.length ? 'laws' : 'dictionary';
  const openDictionary = (id: string) => { dispatch({ type: 'dictionary', id }); setWorkspaceView(defaultView(id)); setSelectedSourceId(null); setSelectedClaimId(null); };
  const showLaw = (index: number) => { setWorkspaceView('laws'); dispatch({ type: 'pause' }); window.requestAnimationFrame(() => document.getElementById(`house-${index}`)?.scrollIntoView({ block: 'start' })); };
  const structure = dictionary && hasLaws ? outline(dictionary) : undefined;
  const incoming = dictionary?.entries.filter(entry => entry.references.includes(selected?.id ?? '')) ?? [];
  const demonstrations = traces.filter(item => item.dictionaryId === dictionary?.id);
  const definitions = selected ? [{ sourceId: selected.sourceId, definition: selected.definition, references: selected.references }, ...(selected.alternatives ?? [])] : [];
  const snapshot = trace?.steps[session?.stepIndex ?? 0].predictionSet;
  const selectedClaim = snapshot?.predictions.find(claim => claim.id === selectedClaimId)
    ?? snapshot?.predictions.filter(claim => snapshot.current_prediction_ids.includes(claim.id) && claim.evidence.before.source_index !== null).at(-1)
    ?? snapshot?.predictions.find(claim => claim.id === snapshot.current_prediction_ids.at(-1));
  const claimSource = selectedClaim && dictionary ? sourceEntryId(selectedClaim, dictionary.entries) : undefined;
  const selectClaim = (id: string, reveal = true) => {
    setSelectedClaimId(id); dispatch({ type: 'pause' });
    if (reveal && window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => {
      const inspector = document.getElementById('claim-inspector');
      inspector?.focus({ preventScroll: true }); inspector?.scrollIntoView({ block: 'start' });
    });
  };
  const openCorrection = () => {
    dispatch({ type: 'dictionary', id: 'parameterized-correction' });
    dispatch({ type: 'trace', id: 'force-correction' });
    dispatch({ type: 'seek', index: 4 });
    setWorkspaceView('result');
    setSelectedClaimId(null);
    setPresentationVisit(visit => visit + 1);
    window.requestAnimationFrame(() => document.getElementById('result-view')?.scrollIntoView({ block: 'start' }));
  };
  const openFromExplanation = (action: ExplanationAction) => {
    if (action.kind === 'correction') return openCorrection();
    dispatch({ type: 'dictionary', id: action.dictionaryId });
    dispatch({ type: 'trace', id: action.kind === 'trace' ? action.traceId : '' });
    setWorkspaceView(action.kind === 'dictionary' ? action.view ?? defaultView(action.dictionaryId) : 'dictionary');
    setSelectedClaimId(null); setSelectedSourceId(null);
    window.requestAnimationFrame(() => document.getElementById('explorer')?.scrollIntoView({ block: 'start' }));
  };

  const entryRow = (entry: Entry) => <button key={entry.id} className={'entry-row' + (selected?.id === entry.id ? ' selected' : '')} aria-pressed={selected?.id === entry.id} onClick={() => selectEntry(entry.id)}><span>{entry.id}</span><span className="source-id">{entry.alternatives?.length ? (entry.alternatives.length + 1) + ' defs' : entry.sourceId}</span></button>;

  useEffect(() => {
    if (!session?.playing) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'tick' }), 3000);
    return () => window.clearTimeout(timeout);
  }, [session?.playing, session?.stepIndex, session?.traceId, state.dictionaryId]);

  useEffect(() => {
    const pauseIfHidden = () => { if (document.hidden) dispatch({ type: 'pause' }); };
    document.addEventListener('visibilitychange', pauseIfHidden);
    return () => document.removeEventListener('visibilitychange', pauseIfHidden);
  }, []);

  return <>
    <a className="skip-link" href="#explorer">Skip to explorer</a>
    <header className="masthead">
      <a className="brand" href="#explanation"><span className="brand-mark">AD</span><span>Authority Dictionary</span></a>
      <nav className="section-nav" aria-label="Sections"><a href="#explanation">01 Explanation</a><a href="#explorer">02 Explorer</a></nav>
    </header>
    <main>
      <Explanation onAction={openFromExplanation}/>

      <section id="explorer" className="explorer-section" aria-labelledby="explorer-title">
        <div className="explorer-heading"><div><p className="eyebrow">02 / EXPLORER</p><h2 id="explorer-title">Choose a dictionary. Follow a trace.</h2></div>
          <div className="dictionary-picker"><label htmlFor="dictionary">Dictionary</label><select id="dictionary" value={state.dictionaryId} onChange={event => openDictionary(event.target.value)}><option value="">Choose a dictionary…</option>{dictionaries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        </div>
        <div className="correction-invitation"><div><span className="eyebrow">PRESENTATION STUDY</span><p>A found mistake doesn't count against the theory. See one derivation reach 12 N, and a new derivation reach 10 N.</p></div><button onClick={openCorrection}>Try the correction example <span aria-hidden="true">↗</span></button></div>
        {!dictionary || !selected || !session ? <div className="unpicked-state"><span className="empty-monogram" aria-hidden="true">AD</span><h3>No dictionary selected</h3><p>Use the dictionary picker above to open its entries, laws and network.</p></div> :
          <div className={'explorer-layout' + (view === 'result' ? ' showing-result' : '')}>
            <aside className="dictionary-panel" aria-label="Dictionary entries">
              <p className="eyebrow">{dictionary.status ?? 'EXAMPLE DICTIONARY'}</p><h3 className="dictionary-name">{dictionary.name}</h3><p className="dictionary-intro">{dictionary.description}</p>
              {structure && <><div className="section-label"><h2>Laws</h2><span>{structure.laws.length}</span></div>
              <div className="law-list">{structure.laws.map(law => { const status = houseStatus(dictionary.houses![law.house]); return <button className="law-row" key={law.house} onClick={() => showLaw(law.house)}><span>{lawLabel(dictionary, law.house)}</span><span className={'law-count' + (status.missing.length ? ' incomplete' : '')} title={status.missing.length ? 'Entries not written yet' : 'All six entries present'}>{status.present}/{status.total}</span></button>; })}</div></>}
              <div className="section-label"><h2>Headwords</h2><span>{dictionary.entries.length}</span></div>
              <div className="entry-list">{structure ? <>
                {!!structure.groundwork.length && <p className="outline-heading">Groundwork<span>{structure.groundwork.length}</span></p>}
                {structure.groundwork.map(entryRow)}
                {structure.laws.map(law => <div className="outline-law" key={law.house}><button className="outline-heading law" onClick={() => showLaw(law.house)} title="Show this law">{lawLabel(dictionary, law.house)}<span aria-hidden="true">→</span></button>{law.entries.map(entryRow)}</div>)}
              </> : dictionary.entries.map(entryRow)}</div>
              <p className="aside-note">{dictionary.definitionCount ?? dictionary.entries.length} definitions. Select a headword to inspect its references.</p>
            </aside>
            <section id="result-workspace" className="workspace" aria-label="Dictionary network and trace">
              <div className="trace-picker"><label htmlFor="trace-select">Trace</label><select id="trace-select" value={session.traceId ?? ''} onChange={event => { dispatch({ type: 'trace', id: event.target.value }); setSelectedClaimId(null); setWorkspaceView(event.target.value === 'force-correction' ? 'result' : event.target.value === '' ? defaultView(state.dictionaryId) : 'dictionary'); }}><option value="">Browse without a trace</option>{demonstrations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
              {(trace || hasLaws) && <div className="workspace-view-picker" aria-label="Workspace view">
                {hasLaws && <button aria-pressed={view === 'laws'} onClick={() => { setWorkspaceView('laws'); dispatch({ type: 'pause' }); }}>Laws</button>}
                <button aria-pressed={view === 'dictionary'} onClick={() => { setWorkspaceView('dictionary'); dispatch({ type: 'pause' }); }}>Dictionary network</button>
                {trace && <button aria-pressed={view === 'result'} onClick={() => { setWorkspaceView('result'); dispatch({ type: 'pause' }); }}>Result & commitments</button>}
              </div>}
              {trace && view === 'result' ? <ResultView key={`${trace.id}-${presentationVisit}`} trace={trace} index={session.stepIndex} claim={selectedClaim} onClaim={selectClaim} onSeek={index => dispatch({ type: 'seek', index })}/>
                : view === 'laws' ? <HouseView dictionary={dictionary} selectedHeadword={selected.id} selectedSourceId={selectedSourceId} activeIds={trace?.steps[session.stepIndex].relatedEntryIds ?? []} onSelect={selectEntry} onLaw={showLaw}/>
                : <Graph dictionary={dictionary} selected={selected} trace={trace} stepIndex={session.stepIndex} playing={session.playing} onSelect={id => selectEntry(id)} onPlayback={dispatch}/>}
              {trace ? <TracePlayer trace={trace} session={session} selectedId={selected.id} dispatch={dispatch} selectEntry={selectEntry}/> : <div className="trace-empty"><h3>{demonstrations.length ? 'The dictionary is yours to explore.' : 'Browse the current draft.'}</h3><p>{demonstrations.length ? 'Choose a trace above to follow its starting node and traversed edges.' : 'No recorded trace is paired with this draft yet. The Newton II example is available with the operational Newtonian mechanics dictionary.'}</p></div>}
            </section>
            {view === 'result' && snapshot && selectedClaim ? <ClaimInspector snapshot={snapshot} claim={selectedClaim} onClaim={selectClaim} sourceId={claimSource} onSource={() => { if (claimSource) selectEntry(claimSource); setWorkspaceView('dictionary'); }}/> : <aside className="inspector" aria-label="Selected entry details">
              <div className="section-label"><h2>Entry details</h2><span>{definitions.length} {definitions.length === 1 ? 'definition' : 'definitions'}</span></div><h3>{selected.id}</h3><span className="entry-type">HEADWORD</span>
              {definitions.map(item => <div className={'definition' + (selectedSourceId === item.sourceId ? ' selected' : '')} key={item.sourceId}><p className="eyebrow">DEFINITION / {item.sourceId}</p>{entryRoles(dictionary.houses ?? [], item.sourceId).map(role => <button className="role-tag" key={`${role.house}-${role.role}`} onClick={() => showLaw(role.house)}>{roleName[role.role]} · {lawLabel(dictionary, role.house)}</button>)}<p>{item.definition}</p></div>)}
              <div className="reference-section"><p className="eyebrow">REFERENCES · {selected.references.length}</p>{selected.references.length ? selected.references.map(id => <button className="reference-link" key={id} onClick={() => selectEntry(id)}>{id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No headword references.</p>}</div>
              <div className="reference-section incoming"><p className="eyebrow">REFERENCED BY · {incoming.length}</p>{incoming.length ? incoming.map(entry => <button className="reference-link" key={entry.id} onClick={() => selectEntry(entry.id)}>{entry.id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No incoming references.</p>}</div>
              <p className="provenance">{dictionary.source}<br/>Original source entry identifiers are retained.</p>
            </aside>}
          </div>}
      </section>
    </main>
    <footer className="page-footer"><span>Authority Dictionary · by Can Valid Kohen</span><span>Definitions, connections, and traces.</span></footer>
  </>;
}
