import { useState } from 'react';
import type { ReactNode } from 'react';
import { canIssue, openHoles, recalledText, suppliedText } from './record.ts';
import type { Command, Frame, Hole, Snapshot } from './record.ts';
import { EntryName, frameDomId } from './FrameTree.tsx';
import type { Selection } from './FrameTree.tsx';

interface ActionsProps {
  snapshot: Snapshot;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** Why commands cannot be sent now, or null when they can. */
  locked: string | null;
  busy: boolean;
  onCommand: (command: Command) => Promise<boolean>;
  sourceId: (index: number) => string | null;
}

/** The panel's heading takes focus after each step, so keyboard work carries on from the same place. */
export const ACTIONS_HEADING_ID = 'wk-actions-heading';
const Heading = ({ children }: { children: ReactNode }) =>
  <h2 id={ACTIONS_HEADING_ID} className="wk-actions-title" tabIndex={-1}>{children}</h2>;

/**
 * What can be done at the selected place. Every button sends one command to the engine; the engine
 * decides whether it is allowed and what it changes. The page only offers what the snapshot shows.
 */
export default function Actions(props: ActionsProps) {
  const { snapshot, selection } = props;
  const frame = selection ? snapshot.frames.find(item => item.id === selection.frameId) : undefined;
  if (selection?.kind === 'hole' && frame) {
    const hole = frame.holes[selection.position];
    if (hole) return hole.resolution === null
      ? <OpenHole key={`${snapshot.id}:${frame.id}#${hole.position}`} {...props} frame={frame} hole={hole}/>
      : <ClosedHole {...props} frame={frame} hole={hole}/>;
  }
  if (selection?.kind === 'frame' && frame) return <FrameActions key={`${snapshot.id}:${frame.id}`} {...props} frame={frame}/>;
  return <Overview {...props}/>;
}

function Locked({ locked }: { locked: string | null }) {
  return locked ? <p className="wk-locked vd-label" role="note">{locked}</p> : null;
}

function NoteField({ id, note, setNote, disabled }: { id: string; note: string; setNote: (value: string) => void; disabled: boolean }) {
  return <div className="wk-field">
    <label htmlFor={id}>Note on this step <span className="vd-label">(optional, kept in the record)</span></label>
    <input id={id} className="wk-input" value={note} maxLength={1024} disabled={disabled} onChange={event => setNote(event.target.value)}/>
  </div>;
}

const withNote = (command: Command, note: string): Command => note.trim() ? { ...command, note: note.trim() } : command;

function Overview({ snapshot, onSelect, locked, busy, onCommand }: ActionsProps) {
  const open = openHoles(snapshot);
  const issuable = canIssue(snapshot);
  return <div className="wk-actions">
    <Heading>What to do next</Heading>
    {open.length
      ? <>
        <p className="vd-voice">{open.length === 1 ? 'One headword is' : `${open.length} headwords are`} open. Choose one in the trace to see the entries that fit it, or start with the first.</p>
        <button type="button" className="vd-button" onClick={() => onSelect({ kind: 'hole', frameId: open[0].frame.id, position: open[0].hole.position })}>
          Go to <span className="vd-string">{open[0].hole.headword}</span>
        </button>
      </>
      : <p className="vd-voice">No headword is open. Reduce a frame to a result, or issue the root's result as the answer.</p>}
    <IssueBlock snapshot={snapshot} issuable={issuable} locked={locked} busy={busy} onCommand={onCommand}/>
    <p className="vd-label wk-hint">Choose a frame's name to reduce it, reopen it or edit its wording.</p>
  </div>;
}

function IssueBlock({ snapshot, issuable, locked, busy, onCommand }: { snapshot: Snapshot; issuable: boolean; locked: string | null; busy: boolean; onCommand: (command: Command) => Promise<boolean> }) {
  return <section className="wk-block" aria-labelledby="wk-issue-title">
    <h3 id="wk-issue-title">Issue the result</h3>
    <p className="wk-result"><span className="vd-label">the root reads</span> <span className="vd-string">{snapshot.prediction_set.result}</span></p>
    <p className="vd-label">Issuing freezes this result with the steps it rests on. Later steps can still be taken; a redo is issued again as a new result.</p>
    <Locked locked={locked}/>
    {!issuable && <p className="vd-label">The engine issues only when no headword is open.</p>}
    <button type="button" className="vd-button" disabled={!!locked || busy || !issuable} onClick={() => void onCommand({ operation: 'issue', frame_id: 'F' })}>Issue this result</button>
  </section>;
}

function OpenHole({ frame, hole, locked, busy, onCommand, sourceId }: ActionsProps & { frame: Frame; hole: Hole }) {
  const [response, setResponse] = useState('');
  const [note, setNote] = useState('');
  const disabled = !!locked || busy;
  const send = (command: Command) => onCommand(withNote(command, note));
  const where = frame.id === 'F' ? 'the root' : frame.id;
  return <div className="wk-actions">
    <Heading><span className="vd-string">{hole.headword}</span></Heading>
    <p className="vd-label">open, in {where}</p>
    <Locked locked={locked}/>

    <section className="wk-block" aria-labelledby="wk-entries-title">
      <h3 id="wk-entries-title">{hole.candidates.length ? `Entries that fit (${hole.candidates.length})` : 'No entry fits'}</h3>
      {!hole.candidates.length && <p className="vd-label">The dictionary has no entry that fits this headword here. Supply a response, or leave it as text.</p>}
      <ol className="wk-candidates">
        {hole.candidates.map(candidate => <li key={candidate.entry_index} className="wk-candidate">
          <p className="wk-candidate-head"><EntryName index={candidate.entry_index} sourceId={sourceId}/> <span className="vd-string wk-candidate-word">{candidate.headword}</span></p>
          <p className="vd-string wk-definition">{candidate.instantiated_definition}</p>
          {candidate.instantiated_definition !== candidate.definition && <p className="wk-as-written"><span className="vd-label">as written</span> <span className="vd-string">{candidate.definition}</span></p>}
          <div className="wk-buttons">
            <button type="button" className="vd-button" disabled={disabled} onClick={() => void send({ operation: 'expand', frame_id: frame.id, position: hole.position, entry_index: candidate.entry_index })}>Expand</button>
            <button type="button" className="vd-button" disabled={disabled} onClick={() => void send({ operation: 'recall', frame_id: frame.id, position: hole.position, entry_index: candidate.entry_index })}>Recall as text</button>
          </div>
        </li>)}
      </ol>
      {!!hole.candidates.length && <p className="vd-label wk-hint">Expand opens the definition as a new frame whose headwords can be followed. Recall puts its wording in place as plain text.</p>}
    </section>

    <section className="wk-block" aria-labelledby="wk-supply-title">
      <h3 id="wk-supply-title">Supply a response</h3>
      <form onSubmit={event => { event.preventDefault(); if (response.trim()) void send({ operation: 'inject', frame_id: frame.id, position: hole.position, response }); }}>
        <div className="wk-field">
          <label htmlFor="wk-response">Response for <span className="vd-string">{hole.headword}</span></label>
          <textarea id="wk-response" className="wk-input" rows={2} maxLength={4096} value={response} disabled={disabled} onChange={event => setResponse(event.target.value)}/>
        </div>
        <p className="vd-label">From outside the dictionary: a value, a reading, a measured input. Headwords in it become open in turn.</p>
        <button type="submit" className="vd-button" disabled={disabled || !response.trim()}>Record the response</button>
      </form>
    </section>

    <section className="wk-block" aria-labelledby="wk-flatten-title">
      <h3 id="wk-flatten-title">Leave it as text</h3>
      <p className="vd-label">No entry is applied; the headword stays as written. That is a reading, and it is recorded.</p>
      <button type="button" className="vd-button" disabled={disabled} onClick={() => void send({ operation: 'flatten', frame_id: frame.id, position: hole.position })}>Leave as text</button>
    </section>

    <NoteField id="wk-note-hole" note={note} setNote={setNote} disabled={disabled}/>
  </div>;
}

function ClosedHole({ snapshot, frame, hole, onSelect, sourceId }: ActionsProps & { frame: Frame; hole: Hole }) {
  const entry = hole.source_index !== null ? <EntryName index={hole.source_index} sourceId={sourceId}/> : 'an entry';
  const child = hole.child_frame_id;
  const goToChild = () => {
    if (!child) return;
    onSelect({ kind: 'frame', frameId: child });
    window.requestAnimationFrame(() => document.getElementById(frameDomId(child))?.scrollIntoView({ block: 'nearest' }));
  };
  const said = {
    expand: <>Expanded with {entry}. Its definition is frame {child}.</>,
    recall: <>Recalled from {entry}: <span className="vd-string">{recalledText(snapshot, frame, hole) ?? ''}</span></>,
    inject: <>Supplied: <span className="vd-string">{suppliedText(snapshot, frame, hole) ?? ''}</span>. It is frame {child}.</>,
    flatten: <>Left as text: no entry applied.</>,
  }[hole.resolution!];
  return <div className="wk-actions">
    <Heading><span className="vd-string">{hole.headword}</span></Heading>
    <p className="vd-label">in {frame.id === 'F' ? 'the root' : frame.id}</p>
    <p className="vd-voice">{said}</p>
    <p className="vd-label">A filled headword stays filled: the record only grows. To change what follows from it, reopen a reduction above it, or start a new record from an earlier step.</p>
    {child && <button type="button" className="vd-button" onClick={goToChild}>Go to {child}</button>}
  </div>;
}

function FrameActions({ snapshot, frame, locked, busy, onCommand }: ActionsProps & { frame: Frame }) {
  const [response, setResponse] = useState('');
  const [note, setNote] = useState('');
  const [wording, setWording] = useState(frame.latents);
  const disabled = !!locked || busy;
  const send = (command: Command) => onCommand(withNote(command, note));
  const isRoot = frame.id === 'F';
  const reworded = wording.some((item, i) => item !== frame.latents[i]);
  return <div className="wk-actions">
    <Heading>{isRoot ? 'The root' : `Frame ${frame.id}`}</Heading>
    <p className="wk-result"><span className="vd-label">reads now</span> <span className="vd-string">{frame.render}</span></p>
    <Locked locked={locked}/>

    {frame.reduced !== null
      ? <section className="wk-block" aria-labelledby="wk-reopen-title">
        <h3 id="wk-reopen-title">Reopen</h3>
        <p className="vd-label">Reduced to <span className="vd-string">{frame.reduced}</span>. Reopening sets this reduction aside, and any reduction that used it; they stay in the record as history.</p>
        <button type="button" className="vd-button" disabled={disabled} onClick={() => void send({ operation: 'reopen', frame_id: frame.id })}>Reopen this frame</button>
      </section>
      : <section className="wk-block" aria-labelledby="wk-reduce-title">
        <h3 id="wk-reduce-title">Reduce</h3>
        <form onSubmit={event => { event.preventDefault(); if (response.trim()) void send({ operation: 'reduce', frame_id: frame.id, response }); }}>
          <div className="wk-field">
            <label htmlFor="wk-reduction">Same meaning, said shorter</label>
            <textarea id="wk-reduction" className="wk-input" rows={2} maxLength={4096} value={response} disabled={disabled || !frame.resolved} onChange={event => setResponse(event.target.value)}/>
          </div>
          {!frame.resolved && <p className="vd-label">Fill every headword under this frame first.</p>}
          <p className="vd-label">A reduction says the new wording means the same as the frame's reading. It is your claim; the engine records it and does not check it. Any reduction on a frame above this one is set aside, and stays in the record as history.</p>
          <button type="submit" className="vd-button" disabled={disabled || !frame.resolved || !response.trim()}>Record the reduction</button>
        </form>
      </section>}

    <section className="wk-block" aria-labelledby="wk-wording-title">
      <h3 id="wk-wording-title">Edit the wording</h3>
      <p className="vd-label">Change only the words between the headwords; the headwords stay in place. The new wording is recorded as your claim that it means the same as the old, and the engine does not check it. Any reduction on this frame or above it is set aside, and stays in the record as history.</p>
      <div className="wk-wording-editor">
        {wording.map((piece, i) => <div key={i} className="wk-wording-piece">
          <label className="sr-only" htmlFor={`wk-piece-${i}`}>{i === 0 ? 'Words before the first headword' : `Words after ${frame.headwords[i - 1]}`}</label>
          <input id={`wk-piece-${i}`} className="wk-input vd-string" value={piece} disabled={disabled}
            onChange={event => setWording(items => items.map((item, n) => n === i ? event.target.value : item))}/>
          {i < frame.headwords.length && <span className="wk-piece-headword vd-string">{frame.headwords[i]}</span>}
        </div>)}
      </div>
      <div className="wk-buttons">
        <button type="button" className="vd-button" disabled={disabled || !reworded} onClick={() => void send({ operation: 'clean', frame_id: frame.id, latents: wording })}>Record the new wording</button>
        {reworded && <button type="button" className="vd-button" disabled={busy} onClick={() => setWording(frame.latents)}>Undo changes</button>}
      </div>
    </section>

    {isRoot && <IssueBlock snapshot={snapshot} issuable={canIssue(snapshot)} locked={locked} busy={busy} onCommand={onCommand}/>}
    <NoteField id="wk-note-frame" note={note} setNote={setNote} disabled={disabled}/>
  </div>;
}
