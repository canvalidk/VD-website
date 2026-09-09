import { useEffect, useReducer } from 'react';
import { dictionaries } from './data/dictionaries';
import { traces } from './data/traces';
import { explorerReducer, initialState } from './player';

function Icon({ name }: { name: 'play' | 'pause' | 'next' | 'previous' | 'restart' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'play' && <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>}
    {name === 'pause' && <path d="M8 5v14M16 5v14" strokeWidth="3"/>}
    {name === 'next' && <path d="m5 6 9 6-9 6ZM18 5v14"/>}
    {name === 'previous' && <path d="m19 6-9 6 9 6ZM6 5v14"/>}
    {name === 'restart' && <path d="M3 4v6h6M3.5 10a9 9 0 1 1 1.6 7"/>}
  </svg>;
}

export default function App() {
  const [state, dispatch] = useReducer(explorerReducer, initialState);
  const dictionary = dictionaries.find(item => item.id === state.dictionaryId)!;
  const session = state.sessions[state.dictionaryId];
  const selected = dictionary.entries.find(entry => entry.id === session.selectedEntryId)!;
  const trace = traces.find(item => item.id === session.traceId)!;
  const step = trace.steps[session.stepIndex];
  const selectEntry = (id: string) => dispatch({ type: 'entry', id });
  const connections = dictionary.entries.flatMap(entry => entry.references.map(target => ({ source: entry, target: dictionary.entries.find(item => item.id === target)! })));
  const incoming = dictionary.entries.filter(entry => entry.references.includes(selected.id));

  useEffect(() => {
    if (!session.playing) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'tick' }), 3000);
    return () => window.clearTimeout(timeout);
  }, [session.playing, session.stepIndex, session.traceId, state.dictionaryId]);
  useEffect(() => {
    const pauseIfHidden = () => { if (document.hidden) dispatch({ type: 'pause' }); };
    document.addEventListener('visibilitychange', pauseIfHidden);
    return () => document.removeEventListener('visibilitychange', pauseIfHidden);
  }, []);

  return <>
    <a className="skip-link" href="#explorer">Skip to explorer</a>
    <header className="masthead"><a className="brand" href="./"><span className="brand-mark">VD</span><span>Valid Dictionary</span></a><span className="edition">An experiment in definitions</span><span className="prototype-label">EXPLORER / 01</span></header>
    <main id="explorer">
      <div className="page-heading"><div><p className="eyebrow">WORDS. CONNECTIONS. TRACES.</p><h1>A dictionary, unfolded.</h1><p>Explore an entry. Follow its references. See a trace take shape.</p></div><span className="version-label">Interactive prototype</span></div>
      <div className="explorer-layout">
        <aside className="dictionary-panel" aria-label="Dictionary browser">
          <label className="eyebrow" htmlFor="dictionary">YOUR DICTIONARY</label>
          <select id="dictionary" value={dictionary.id} onChange={event => dispatch({ type: 'dictionary', id: event.target.value })}>{dictionaries.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <p className="dictionary-intro">{dictionary.description}</p>
          <div className="section-label"><h2>Entries</h2><span>{dictionary.entries.length.toString().padStart(2, '0')}</span></div>
          <div className="entry-list">{dictionary.entries.map(entry => <button key={entry.id} className={`entry-row ${selected.id === entry.id ? 'selected' : ''}`} aria-pressed={selected.id === entry.id} onClick={() => selectEntry(entry.id)}><span>{entry.id}</span><span className="source-id">{entry.sourceId}</span></button>)}</div>
          <p className="aside-note">Each headword opens a definition. References connect it to other entries.</p>
          <details className="about-vd"><summary>What is VD?</summary><p>The Valid Dictionary project explores how definitions refer to one another and how those references unfold in a trace.</p><p>This prototype presents small excerpts and prepared examples. The map shows headword references, not physical causes.</p></details>
        </aside>
        <section className="workspace" aria-label="Dictionary map and trace">
          <div className="graph-card">
            <div className="graph-heading"><div><p className="eyebrow">DICTIONARY VIEW</p><h2>Reference map</h2></div><span>{connections.length} connections</span></div>
            <div className="graph-canvas" role="group" aria-label={`${dictionary.name} reference map. Select an entry to inspect it.`}>
              <svg className="connections" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true">{connections.map(({source, target}) => <line key={`${source.id}-${target.id}`} x1={source.x * 10} y1={source.y * 6.6} x2={target.x * 10} y2={target.y * 6.6} className={source.id === selected.id || target.id === selected.id ? 'connected' : ''}/>)}</svg>
              {dictionary.entries.map(entry => <button key={entry.id} className={`graph-node ${entry.id === selected.id ? 'selected' : ''} ${step.relatedEntryIds.includes(entry.id) ? 'in-trace' : ''}`} style={{ left: `${entry.x}%`, top: `${entry.y}%` }} onClick={() => selectEntry(entry.id)} aria-pressed={entry.id === selected.id} aria-label={`${entry.id}, ${entry.sourceId}${step.relatedEntryIds.includes(entry.id) ? ', in this trace step' : ''}`}><span className="node-id">{entry.sourceId}{step.relatedEntryIds.includes(entry.id) && <span className="trace-node-mark" aria-hidden="true"/>}</span><span>{entry.id}</span></button>)}
            </div>
            <div className="graph-footer"><span><i className="legend-mark selected"/> Selected entry</span><span><i className="legend-mark trace"/> In this step</span><span><i className="legend-line"/> Headword reference</span></div>
          </div>
          <section className="trace-panel" aria-labelledby="trace-title">
            <div className="trace-heading"><div><p className="eyebrow">TRACE PLAYER</p><h2 id="trace-title">Watch it unfold</h2></div><span className="demo-badge">Prepared demonstration</span></div>
            <label className="sr-only" htmlFor="trace-select">Choose a demonstration</label>
            <select id="trace-select" className="trace-select" value={trace.id} onChange={event => dispatch({ type: 'trace', id: event.target.value })}>{traces.filter(item => item.dictionaryId === dictionary.id).map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
            <div className="playback-controls">
              <button className="play-button" onClick={() => dispatch({ type: 'toggle' })} aria-label={session.playing ? 'Pause demonstration' : session.stepIndex === trace.steps.length - 1 ? 'Replay demonstration' : 'Play demonstration'}><Icon name={session.playing ? 'pause' : 'play'}/>{session.playing ? 'Pause' : session.stepIndex === trace.steps.length - 1 ? 'Replay' : 'Play'}</button>
              <div className="step-controls"><button className="icon-button" aria-label="Previous step" title="Previous step" disabled={session.stepIndex === 0} onClick={() => dispatch({ type: 'seek', index: session.stepIndex - 1 })}><Icon name="previous"/></button><button className="icon-button" aria-label="Next step" title="Next step" disabled={session.stepIndex === trace.steps.length - 1} onClick={() => dispatch({ type: 'seek', index: session.stepIndex + 1 })}><Icon name="next"/></button><button className="icon-button" aria-label="Restart demonstration" title="Restart demonstration" onClick={() => dispatch({ type: 'restart' })}><Icon name="restart"/></button></div>
              <span className="playback-position">{session.stepIndex + 1}<span> / {trace.steps.length} steps</span></span>
            </div>
            <ol className="timeline" aria-label="Trace steps">{trace.steps.map((item, index) => <li key={item.id}><button className={`timeline-step ${index === session.stepIndex ? 'current' : ''} ${index < session.stepIndex ? 'past' : ''}`} aria-current={index === session.stepIndex ? 'step' : undefined} aria-label={`Step ${index + 1}: ${item.title}`} title={`${index + 1}. ${item.title}`} onClick={() => dispatch({ type: 'seek', index })}><span>{String(index + 1).padStart(2, '0')}</span></button></li>)}</ol>
            <div className="step-content">
              <div className="step-title"><span className="operation">{step.operation}</span><h3>{step.title}</h3></div><p className="step-description">{step.description}</p>
              <div className="fragment-heading"><span>ACTIVE FRAGMENT</span>{step.settled && <span className="settled-label">No open holes</span>}</div>
              <div className="trace-fragment">{step.fragment.map((part, index) => part.entryId !== undefined ? <button className="inline-reference" key={index} onClick={() => selectEntry(part.entryId)} title={`Inspect ${part.entryId}`}>{part.entryId}</button> : <span key={index}>{part.text}</span>)}</div>
              <p className="trace-context">Focus: {step.context}</p>
              <div className="step-entries"><span>In this step</span>{step.relatedEntryIds.map(id => <button key={id} onClick={() => selectEntry(id)} className={id === selected.id ? 'active' : ''} aria-pressed={id === selected.id}>{id}</button>)}</div>
            </div>
            <p className="player-hint">Select any step to inspect it. Exploring an entry pauses playback.</p>
            <details className="demo-note"><summary>About this demonstration</summary><p>{trace.provenance}</p><p>Playback does not execute the VD engine. Recall inserts literal definition text; it does not expand references inside that text. Settled holes do not establish physical validity.</p></details>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{trace.title}. Step {session.stepIndex + 1} of {trace.steps.length}: {step.title}. {session.playing ? 'Playing.' : 'Paused.'} Selected entry: {selected.id}.</p>
          </section>
        </section>
        <aside className="inspector" aria-label="Selected entry details">
          <div className="section-label"><h2>Entry details</h2><span>{selected.sourceId}</span></div><h3>{selected.id}</h3><span className="entry-type">HEADWORD</span>
          <div className="definition"><p className="eyebrow">DEFINITION</p><p>{selected.definition}</p></div>
          <div className="reference-section"><p className="eyebrow">REFERENCES · {selected.references.length}</p>{selected.references.length ? selected.references.map(id => <button className="reference-link" key={id} onClick={() => selectEntry(id)}>{id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No headword references in this excerpt.</p>}</div>
          <div className="reference-section incoming"><p className="eyebrow">REFERENCED BY · {incoming.length}</p>{incoming.length ? incoming.map(entry => <button className="reference-link" key={entry.id} onClick={() => selectEntry(entry.id)}>{entry.id}<span aria-hidden="true">↗</span></button>) : <p className="muted">No incoming references in this excerpt.</p>}</div>
          <p className="provenance">{dictionary.source}<br/>Original source entry identifiers are retained.</p>
        </aside>
      </div>
    </main><footer className="page-footer"><span>VD / A work in progress</span><span>Prepared examples. Open exploration.</span></footer>
  </>;
}
