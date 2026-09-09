import { useEffect, useReducer } from 'react';
import { dictionaries } from './data/dictionaries';
import { traces } from './data/traces';
import { explorerReducer, initialState } from './player';
import Graph from './Graph';
import TracePlayer from './TracePlayer';

export default function App() {
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const dictionary = dictionaries.find(item => item.id === state.dictionaryId);
  const session = state.sessions[state.dictionaryId];
  const selected = dictionary?.entries.find(entry => entry.id === session?.selectedEntryId);
  const trace = traces.find(item => item.id === session?.traceId);
  const selectEntry = (id: string) => dispatch({ type: 'entry', id });
  const incoming = dictionary?.entries.filter(entry => entry.references.includes(selected?.id ?? '')) ?? [];
  const demonstrations = traces.filter(item => item.dictionaryId === dictionary?.id);
  const definitions = selected ? [{ sourceId: selected.sourceId, definition: selected.definition, references: selected.references }, ...(selected.alternatives ?? [])] : [];

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
      <section id="explanation" className="explanation-section" aria-labelledby="explanation-title">
        <p className="eyebrow">01 / EXPLANATION</p>
        <div className="explanation-heading"><div><h1 id="explanation-title">Authority Dictionary</h1><p className="byline">by Can Valid Kohen</p></div><p className="explanation-lead">Explore dictionaries, the connections between their definitions, and the traces that unfold them.</p></div>
        <div className="explanation-parts">
          <div><span className="part-number">01</span><h2>The dictionary</h2><p>A headword can have more than one definition. Select it to read those definitions and the entries they refer to.</p></div>
          <div><span className="part-number">02</span><h2>The network</h2><p>Lines show headword references. During a trace, the starting node stays marked and the traversed connections remain highlighted.</p></div>
          <div><span className="part-number">03</span><h2>The trace</h2><p>Move through a route at your own pace. Flattened occurrences fade as they are expended, while the dictionary stays available to explore.</p></div>
        </div>
      </section>

      <section id="explorer" className="explorer-section" aria-labelledby="explorer-title">
        <div className="explorer-heading"><div><p className="eyebrow">02 / EXPLORER</p><h2 id="explorer-title">Choose a dictionary. Follow a trace.</h2></div>
          <div className="dictionary-picker"><label htmlFor="dictionary">Dictionary</label><select id="dictionary" value={state.dictionaryId} onChange={event => dispatch({ type: 'dictionary', id: event.target.value })}><option value="">Choose a dictionary…</option>{dictionaries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        </div>
        {!dictionary || !selected || !session ? <div className="unpicked-state"><span className="empty-monogram" aria-hidden="true">AD</span><h3>No dictionary selected</h3><p>Use the dictionary picker above to open its entries and network.</p></div> :
          <div className="explorer-layout">
            <aside className="dictionary-panel" aria-label="Dictionary entries">
              <p className="eyebrow">{dictionary.status ?? 'EXAMPLE DICTIONARY'}</p><h3 className="dictionary-name">{dictionary.name}</h3><p className="dictionary-intro">{dictionary.description}</p>
              <div className="section-label"><h2>Headwords</h2><span>{dictionary.entries.length}</span></div>
              <div className="entry-list">{dictionary.entries.map(entry => <button key={entry.id} className={'entry-row' + (selected.id === entry.id ? ' selected' : '')} aria-pressed={selected.id === entry.id} onClick={() => selectEntry(entry.id)}><span>{entry.id}</span><span className="source-id">{entry.alternatives?.length ? (entry.alternatives.length + 1) + ' defs' : entry.sourceId}</span></button>)}</div>
              <p className="aside-note">{dictionary.definitionCount ?? dictionary.entries.length} definitions. Select a headword to inspect its references.</p>
            </aside>
            <section className="workspace" aria-label="Dictionary network and trace">
              <div className="trace-picker"><label htmlFor="trace-select">Trace</label><select id="trace-select" value={session.traceId ?? ''} onChange={event => dispatch({ type: 'trace', id: event.target.value })}><option value="">Browse without a trace</option>{demonstrations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></div>
              <Graph dictionary={dictionary} selected={selected} trace={trace} stepIndex={session.stepIndex} playing={session.playing} onSelect={selectEntry} onPlayback={dispatch}/>
              {trace ? <TracePlayer trace={trace} session={session} selectedId={selected.id} dispatch={dispatch} selectEntry={selectEntry}/> : <div className="trace-empty"><h3>{demonstrations.length ? 'The dictionary is yours to explore.' : 'Browse the current draft.'}</h3><p>{demonstrations.length ? 'Choose a trace above to follow its starting node and traversed edges.' : 'No recorded trace is paired with this draft yet. The Newton II example is available with the operational Newtonian mechanics dictionary.'}</p></div>}
            </section>
            <aside className="inspector" aria-label="Selected entry details">
              <div className="section-label"><h2>Entry details</h2><span>{definitions.length} {definitions.length === 1 ? 'definition' : 'definitions'}</span></div><h3>{selected.id}</h3><span className="entry-type">HEADWORD</span>
              {definitions.map(item => <div className="definition" key={item.sourceId}><p className="eyebrow">DEFINITION / {item.sourceId}</p><p>{item.definition}</p></div>)}
              <div className="reference-section"><p className="eyebrow">REFERENCES · {selected.references.length}</p>{selected.references.length ? selected.references.map(id => <button className="reference-link" key={id} onClick={() => selectEntry(id)}>{id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No headword references.</p>}</div>
              <div className="reference-section incoming"><p className="eyebrow">REFERENCED BY · {incoming.length}</p>{incoming.length ? incoming.map(entry => <button className="reference-link" key={entry.id} onClick={() => selectEntry(entry.id)}>{entry.id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No incoming references.</p>}</div>
              <p className="provenance">{dictionary.source}<br/>Original source entry identifiers are retained.</p>
            </aside>
          </div>}
      </section>
    </main>
    <footer className="page-footer"><span>Authority Dictionary · by Can Valid Kohen</span><span>Definitions, connections, and traces.</span></footer>
  </>;
}
