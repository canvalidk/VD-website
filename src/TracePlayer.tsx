import type { Dispatch } from 'react';
import type { PreparedTrace } from './data/traces';
import type { Action, Session } from './player';

interface Props { trace: PreparedTrace; session: Session; selectedId: string; dispatch: Dispatch<Action>; selectEntry: (id: string) => void }
function Icon({ name }: { name: 'play' | 'pause' | 'next' | 'previous' | 'restart' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'play' && <path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>}
    {name === 'pause' && <path d="M8 5v14M16 5v14" strokeWidth="3"/>}
    {name === 'next' && <path d="m5 6 9 6-9 6ZM18 5v14"/>}
    {name === 'previous' && <path d="m19 6-9 6 9 6ZM6 5v14"/>}
    {name === 'restart' && <path d="M3 4v6h6M3.5 10a9 9 0 1 1 1.6 7"/>}
  </svg>;
}

export default function TracePlayer({ trace, session, selectedId, dispatch, selectEntry }: Props) {
  const step = trace.steps[session.stepIndex];
  const selected = { id: selectedId };
  return <section className="trace-panel" aria-labelledby="trace-title">
            <div className="trace-heading"><div><p className="eyebrow">TRACE PLAYER</p><h2 id="trace-title">Watch it unfold</h2></div><span className="demo-badge">{trace.kind === 'recorded' ? 'Recorded trace · condensed' : 'Prepared demonstration'}</span></div>
            {trace.question && <p className="trace-question">{trace.question}</p>}
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
          </section>;
}
