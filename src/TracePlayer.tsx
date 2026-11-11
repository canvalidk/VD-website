import type { Dispatch } from 'react';
import type { PreparedTrace } from './data/traces';
import type { Action, Session } from './player';
import { traceTitle } from './pages/format';

/** Trace contexts are recorded as paths ("displacement › position", "E21 · net-force"); shown with commas. */
export const contextText = (context: string) => context.split(/\s*[·›→]\s*/).filter(Boolean).join(', ');

interface ControlProps {
  trace: PreparedTrace;
  session: Session;
  dispatch: Dispatch<Action>;
  /** The network's camera follows the trace. The checkbox is shown only when both are given. */
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
}

/** Play, Back, Next, Restart and Follow trace. On the Traces page they sit under the network (a sticky bar on narrow screens). */
export function TraceControls({ trace, session, dispatch, follow, onFollowChange }: ControlProps) {
  const last = trace.steps.length - 1;
  return <div className="tr-controls" role="group" aria-label="Trace playback">
    <div className="tr-controls-buttons">
      <button type="button" className="vd-button tr-play" onClick={() => dispatch({ type: 'toggle' })}>{session.playing ? 'Pause' : session.stepIndex === last ? 'Replay' : 'Play'}</button>
      <button type="button" className="vd-button" disabled={session.stepIndex === 0} onClick={() => dispatch({ type: 'seek', index: session.stepIndex - 1 })}>Back</button>
      <button type="button" className="vd-button" disabled={session.stepIndex === last} onClick={() => dispatch({ type: 'seek', index: session.stepIndex + 1 })}>Next</button>
      <button type="button" className="vd-button" onClick={() => dispatch({ type: 'restart' })}>Restart</button>
    </div>
    {follow !== undefined && onFollowChange && <label className="tr-follow"><input type="checkbox" checked={follow} onChange={event => onFollowChange(event.target.checked)}/> Follow trace</label>}
  </div>;
}

interface Props {
  trace: PreparedTrace;
  session: Session;
  selectedId: string;
  dispatch: Dispatch<Action>;
  selectEntry: (id: string) => void;
  /** False when the page places TraceControls elsewhere (under the network). Default true. */
  showControls?: boolean;
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
}

export default function TracePlayer({ trace, session, selectedId, dispatch, selectEntry, showControls = true, follow, onFollowChange }: Props) {
  const step = trace.steps[session.stepIndex];
  const total = trace.steps.length;
  return <section className="tr-step" aria-labelledby="tr-step-title">
    {trace.question && <p className="tr-question">{trace.question}</p>}
    <p className="tr-step-count vd-num">Step {session.stepIndex + 1} of {total}</p>
    <h2 id="tr-step-title" className="tr-step-title">{traceTitle(step.title)}</h2>
    <p className="vd-label tr-step-meta">{step.operation}, in {contextText(step.context)}.</p>
    <p className="tr-step-description">{step.description}</p>

    <div className="tr-fragment-block">
      <h3 className="tr-minor-head">Active fragment</h3>
      <p className="vd-string tr-fragment">{step.fragment.map((part, index) => part.entryId !== undefined
        ? <button type="button" className="vd-link-button vd-string tr-fragment-ref" key={index} aria-pressed={part.entryId === selectedId} onClick={() => selectEntry(part.entryId)}>{part.entryId}</button>
        : <span key={index}>{part.text}</span>)}</p>
      {step.settled && <p className="vd-label tr-settled">No open holes.</p>}
    </div>

    <div className="tr-entries">
      <h3 className="tr-minor-head">Entries in this step</h3>
      <ul>{step.relatedEntryIds.map(id => <li key={id}><button type="button" className="vd-string tr-entry" aria-pressed={id === selectedId} onClick={() => selectEntry(id)}>{id}</button></li>)}</ul>
    </div>

    <ol className="tr-steps" aria-label="Trace steps">{trace.steps.map((item, index) => <li key={item.id}>
      <button type="button" className={'tr-step-number vd-num' + (index < session.stepIndex ? ' is-visited' : '')} aria-current={index === session.stepIndex ? 'step' : undefined} aria-label={`Step ${index + 1}: ${traceTitle(item.title)}`} title={traceTitle(item.title)} onClick={() => dispatch({ type: 'seek', index })}><span>{index + 1}</span></button>
    </li>)}</ol>

    {showControls && <TraceControls trace={trace} session={session} dispatch={dispatch} follow={follow} onFollowChange={onFollowChange}/>}

    <p className="vd-label tr-caption">Select any step to inspect it. Exploring an entry pauses playback.</p>
    <details className="tr-details tr-about">
      <summary>About this demonstration</summary>
      <p>{trace.provenance}</p>
      <p>Playback does not execute the VD engine. Recall inserts literal definition text; it does not expand references inside that text. Settled holes do not establish physical validity.</p>
    </details>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{traceTitle(trace.title)}. Step {session.stepIndex + 1} of {total}: {traceTitle(step.title)}. {session.playing ? 'Playing.' : 'Paused.'} Selected entry: {selectedId}.</p>
  </section>;
}
