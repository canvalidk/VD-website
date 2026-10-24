import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { correctionSource } from './data/correction';
import ResultView, { ClaimInspector } from './ResultView';
import { MAX_RECORD_BYTES, parseRecord, recordPlayback, requestWorkbench } from './traceRecord';
import type { TraceRecord, WorkbenchCommand, WorkbenchFrame } from './traceRecord';

interface Session { record: TraceRecord; validated: boolean; label: string }
const initialContext = 'For cart at time 0, supply mass 2 kg and acceleration 5 m/s^2. Interpreter responses are supplied by the user.';
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The action could not be completed. Your record is unchanged.';

export default function Workbench() {
  const [session, setSession] = useState<Session | null>(null);
  const [archive, setArchive] = useState<Session[]>([]);
  const [demand, setDemand] = useState('force_cart_0');
  const [context, setContext] = useState(initialContext);
  const [snapshotIndex, setSnapshotIndex] = useState(0);
  const [frameId, setFrameId] = useState('F');
  const [claimId, setClaimId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const record = session?.record;
  const snapshot = record?.snapshots[snapshotIndex];
  const frame = snapshot?.frames.find(item => item.id === frameId) ?? snapshot?.frames.find(item => item.id === 'F');
  const predictionSet = snapshot?.prediction_set;
  const claim = predictionSet?.predictions.find(item => item.id === claimId)
    ?? predictionSet?.predictions.find(item => item.id === predictionSet.current_prediction_ids.at(-1))
    ?? predictionSet?.predictions.at(-1);
  const playback = useMemo(() => record ? recordPlayback(record) : null, [record]);
  const latest = !!record && snapshotIndex === record.snapshots.length - 1;
  const canEdit = !!session?.validated && latest && !busy;
  const sourceEntry = claim?.evidence.before.source_index === null ? undefined : record?.dictionary.entries.find(item => item.index === claim?.evidence.before.source_index);

  const openSession = (next: Session, keepPrevious = true) => {
    if (session && keepPrevious) setArchive(items => [...items, session]);
    setSession(next); setSnapshotIndex(next.record.snapshots.length - 1); setFrameId('F'); setClaimId(null); setError('');
  };
  const seek = (index: number) => { setSnapshotIndex(index); setClaimId(null); setError(''); };
  const selectClaim = (id: string, reveal = true) => {
    setClaimId(id);
    if (reveal && window.matchMedia('(max-width: 760px)').matches) window.requestAnimationFrame(() => {
      const inspector = document.getElementById('wb-claim-inspector'); inspector?.focus({ preventScroll: true }); inspector?.scrollIntoView({ block: 'start' });
    });
  };
  async function start(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try {
      const next = await requestWorkbench('start', { dictionary: correctionSource.dictionary, demand, context });
      openSession({ record: next, validated: true, label: 'Started here' });
      setNotice('Trace started by the local engine. Choose an open hole to continue.');
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  async function validate() {
    if (!record || busy) return;
    setBusy(true); setError('');
    try {
      const next = await requestWorkbench('validate', { record });
      setSession({ record: next, validated: true, label: session!.label });
      setNotice('The local engine reproduced this record and checked its consistency. Scientific claims remain unchecked.');
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  async function command(command: WorkbenchCommand) {
    if (!record || !canEdit) return false;
    setBusy(true); setError('');
    try {
      const next = await requestWorkbench('command', { record, command });
      setSession({ record: next, validated: true, label: session!.label });
      setSnapshotIndex(next.snapshots.length - 1); setClaimId(null);
      setNotice(`Saved ${next.snapshots.at(-1)!.title}. Earlier snapshots are still available.`);
      return true;
    } catch (error) { setError(errorText(error)); return false; }
    finally { setBusy(false); }
  }
  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    setBusy(true); setError('');
    try {
      if (file.size > MAX_RECORD_BYTES) throw new Error('The record exceeds the 8 MiB local-file limit.');
      const next = parseRecord(await file.text());
      openSession({ record: next, validated: false, label: file.name });
      setNotice('Opened in this browser only. Engine consistency has not been validated; no file was sent to the engine.');
    } catch (error) { setError(errorText(error)); }
    finally { setBusy(false); }
  }
  function download() {
    if (!record) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `vd-trace-${record.record_id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Downloaded the complete record, including every saved snapshot and the exact dictionary.');
  }

  const startForm = <form className="wb-start-form" onSubmit={start}>
    <div><label htmlFor="wb-demand">Demand</label><input id="wb-demand" required maxLength={4096} value={demand} onChange={event => setDemand(event.target.value)} disabled={busy}/></div>
    <div><label htmlFor="wb-context">Question and supplied context</label><textarea id="wb-context" rows={3} maxLength={4096} value={context} onChange={event => setContext(event.target.value)} disabled={busy}/></div>
    <details className="wb-dictionary"><summary>Exact dictionary · {correctionSource.dictionary.entries.length} definitions</summary>{correctionSource.dictionary.entries.map(([headword, definition], index) => <div key={index}><span>E{index} · {headword}</span><p>{definition}</p></div>)}</details>
    <button className="wb-primary" disabled={busy || !demand.trim()} type="submit">{busy ? 'Working…' : 'Start a new trace'} <span aria-hidden="true">↗</span></button>
  </form>;

  return <section id="workbench" className="workbench-section" aria-labelledby="workbench-title">
    <div className="wb-heading"><div><p className="eyebrow">03 / WORKBENCH</p><h2 id="workbench-title">Run a trace. Keep the record.</h2><p>Choose definitions, supply responses, and inspect what your result depends on.</p></div><span className="wb-experimental">Local workbench · experimental</span></div>
    <div className="wb-toolbar"><label className={'wb-file-button' + (busy ? ' disabled' : '')}>Open saved record<input type="file" accept=".json,application/json" disabled={busy} onChange={importFile}/></label>{record && <button disabled={busy} onClick={download}>Download full record ↓</button>}<span>Files open locally. Download to keep your work after closing this page.</span></div>
    {error && <div className="wb-error" role="alert"><strong>Could not complete that action</strong><p>{error}</p><p>Your previous record and entered response are still available.</p></div>}
    <p className="wb-notice" role="status" aria-live="polite">{notice || 'Start with the three-definition force example, or reopen a saved trace.'}</p>
    {!record ? <div className="wb-welcome"><div><p className="eyebrow">A SMALL WORKING DICTIONARY</p><h3>From force_cart_0 to a result you can inspect.</h3><p>Expand the force definition, supply the mass and acceleration, then record your calculation. Reopen a reduction to make a correction and follow the change in support.</p><p>Responses come from you. The engine records them; arithmetic and meaning claims remain unchecked.</p></div>{startForm}</div> : <>
      <div className={'wb-validation ' + (session?.validated ? ' validated' : '')}><div><strong>{session?.validated ? 'Engine consistency validated' : 'Saved playback · engine consistency unvalidated'}</strong><p>{session?.validated ? 'This record was reproduced by the local engine. Claims remain unchecked; this is no scientific verdict.' : 'The browser checked the file structure only. Saved text and evidence have not been reproduced by the engine.'}</p></div>{!session?.validated && <button className="wb-primary" disabled={busy} onClick={validate}>Validate with local engine</button>}</div>
      <details className="wb-record-info"><summary>Question, exact dictionary and record identity</summary><p><strong>{record.question.demand}</strong></p><p>{record.question.context || 'No additional context supplied.'}</p><dl><div><dt>Record</dt><dd>{record.record_id}</dd></div><div><dt>Dictionary</dt><dd>{record.dictionary.name}</dd></div><div><dt>Dictionary SHA-256</dt><dd>{record.dictionary.sha256}</dd></div><div><dt>Engine SHA-256</dt><dd>{record.producer.engine_sha256}</dd></div><div><dt>Record SHA-256</dt><dd>{record.sha256}</dd></div></dl><div className="wb-dictionary">{record.dictionary.entries.map(entry => <div key={entry.index} id={`wb-entry-${entry.index}`}><span>E{entry.index} · {entry.headword}</span><p>{entry.definition}</p></div>)}</div><p className="wb-small">Digests help detect changed records. Consistency validation does not establish authorship or the truth of responses.</p></details>
      <div className="wb-snapshot-bar"><button disabled={busy || snapshotIndex === 0} onClick={() => seek(snapshotIndex - 1)} aria-label="Previous saved snapshot">←</button><div><label htmlFor="wb-snapshot">Saved snapshot</label><select id="wb-snapshot" value={snapshotIndex} disabled={busy} onChange={event => seek(Number(event.target.value))}>{record.snapshots.map((item, index) => <option key={item.id} value={index}>{item.id} · {item.title}{index === record.snapshots.length - 1 ? ' · latest' : ''}</option>)}</select></div><button disabled={busy || latest} onClick={() => seek(snapshotIndex + 1)} aria-label="Next saved snapshot">→</button>{!latest && <button className="wb-latest" disabled={busy} onClick={() => seek(record.snapshots.length - 1)}>Return to latest to continue ↗</button>}</div>
      {!latest && <p className="wb-history-note">Earlier snapshot · read-only. Moving through history does not undo recorded operations.</p>}
      <div className="wb-working-layout">
        <section className="wb-frames" aria-labelledby="wb-frames-title"><div className="section-label"><h3 id="wb-frames-title">Trace frames</h3><span>{snapshot!.frames.length}</span></div><p className="wb-small">Choose where to work. The result and prediction set always refer to the root.</p><div className="wb-frame-list">{snapshot!.frames.map(item => <button key={item.id} aria-pressed={item.id === frame?.id} onClick={() => setFrameId(item.id)} disabled={busy} style={{ paddingLeft: `${12 + Math.min(item.address.length, 5) * 10}px` }}><span>{item.id === 'F' ? 'Root · F' : item.id}<small>{item.reduced !== null ? 'reduced' : item.resolved ? 'settled' : 'open'}</small></span><strong>{item.render}</strong></button>)}</div></section>
        {frame && <FrameEditor key={`${record.record_id}-${frame.id}-${snapshot!.id}`} frame={frame} canEdit={canEdit} busy={busy} unvalidated={!session?.validated} latest={latest} onCommand={command} onChild={setFrameId}/>}
      </div>
      <div className="wb-result-layout"><div>{playback && <ResultView trace={playback} index={snapshotIndex} claim={claim} onClaim={selectClaim} onSeek={seek} showStages={false} idPrefix="wb-"/>}</div>{claim && predictionSet ? <ClaimInspector snapshot={predictionSet} claim={claim} onClaim={selectClaim} sourceId={sourceEntry ? `E${sourceEntry.index} · ${sourceEntry.headword}` : undefined} onSource={() => { const target = sourceEntry && document.getElementById(`wb-entry-${sourceEntry.index}`); const details = target?.closest('details'); if (details) details.open = true; target && target.scrollIntoView({ block: 'center' }); }} idPrefix="wb-"/> : <aside className="wb-no-claims"><h3>No recorded claims yet</h3><p>Supplied inputs, reductions and literal edits will appear here when the engine records them.</p></aside>}</div>
      <details className="wb-events"><summary>Exact event history through {snapshot!.id} · {snapshot!.event_count} events</summary><ol>{record.events.slice(0, snapshot!.event_count).map(event => <li key={event.id}><span>{event.id} · {event.kind}</span><p>{event.detail}</p>{event.change && <details><summary>Recorded change evidence</summary><pre>{JSON.stringify(event.change, null, 2)}</pre></details>}</li>)}</ol></details>
      <details className="wb-new"><summary>Start another trace</summary><p className="wb-small">Your present record stays available in this visit. Download it to keep it after closing the page.</p>{startForm}</details>
    </>}
    {!!archive.length && <details className="wb-archive"><summary>Other records opened this visit · {archive.length}</summary><div>{archive.map((item, index) => <button key={index} disabled={busy} onClick={() => { setArchive(items => items.filter((_, n) => n !== index)); openSession(item); setNotice('Returned to a record kept in this visit.'); }}><strong>{item.record.question.demand}</strong><span>{item.record.snapshots.at(-1)!.prediction_set.result}</span><small>{item.label} · {item.validated ? 'engine validated' : 'unvalidated playback'}</small></button>)}</div></details>}
    <details className="wb-connection"><summary>Local connection help</summary><p>Live operations need VDfirst running on this computer. Saved records can be inspected without it.</p><ol><li>In your VDfirst checkout, run <code>python workbench_server.py --port 8765</code>.</li><li>In the website checkout, run <code>pnpm dev</code> and open the printed local address.</li><li>Start a trace or choose <strong>Validate with local engine</strong> for an imported record.</li></ol><p>The bridge defaults to website ports 5173 and 5174. For a different local port, pass its origin using <code>--allow-origin</code>. No accounts, public upload or cloud storage are used.</p></details>
  </section>;
}

interface EditorProps { frame: WorkbenchFrame; canEdit: boolean; busy: boolean; unvalidated: boolean; latest: boolean; onCommand: (command: WorkbenchCommand) => Promise<boolean>; onChild: (id: string) => void }
function FrameEditor({ frame, canEdit, busy, unvalidated, latest, onCommand, onChild }: EditorProps) {
  const openHoles = frame.holes.filter(item => item.resolution === null);
  const [position, setPosition] = useState(openHoles[0]?.position ?? 0);
  const hole = openHoles.find(item => item.position === position) ?? openHoles[0];
  const [candidateIndex, setCandidateIndex] = useState(hole?.candidates[0]?.entry_index ?? 0);
  const candidate = hole?.candidates.find(item => item.entry_index === candidateIndex) ?? hole?.candidates[0];
  const [action, setAction] = useState<'hole' | 'reduce' | 'clean'>('hole');
  const [response, setResponse] = useState('');
  const [note, setNote] = useState('');
  const [latents, setLatents] = useState(JSON.stringify(frame.latents, null, 2));
  const [localError, setLocalError] = useState('');
  async function send(fields: Omit<WorkbenchCommand, 'frame_id'>) {
    setLocalError('');
    await onCommand({ ...fields, frame_id: frame.id, ...(note.trim() ? { note } : {}) });
  }
  function clean() {
    let parsed: unknown;
    try { parsed = JSON.parse(latents); } catch { setLocalError('Enter a JSON array of literal strings. Your edits have been kept.'); return; }
    if (!Array.isArray(parsed) || parsed.length !== frame.latents.length || !parsed.every(item => typeof item === 'string')) { setLocalError(`Keep exactly ${frame.latents.length} literal strings. Headword holes stay in place.`); return; }
    void send({ operation: 'clean', latents: parsed });
  }
  return <section className="wb-editor" aria-labelledby="wb-frame-title"><div className="section-label"><h3 id="wb-frame-title">{frame.id === 'F' ? 'Root frame' : `Frame ${frame.id}`}</h3><span>{frame.source_index === null ? 'No dictionary source' : `Source E${frame.source_index}`}</span></div><div className="wb-frame-render">{frame.render}</div>
    {!canEdit && <p className="wb-edit-note">{busy ? 'Waiting for the local engine…' : !latest ? 'This saved frame is read-only. Return to the latest snapshot to continue.' : unvalidated ? 'Validate the imported record with the local engine before continuing.' : ''}</p>}
    {!!frame.holes.filter(item => item.child_frame_id).length && <div className="wb-children">{frame.holes.filter(item => item.child_frame_id).map(item => <button key={item.position} disabled={busy} onClick={() => onChild(item.child_frame_id!)}>Inspect {item.headword} <span>{item.child_frame_id} ↗</span></button>)}</div>}
    <div className="wb-action-tabs" aria-label="Frame action"><button aria-pressed={action === 'hole'} disabled={busy} onClick={() => setAction('hole')}>Open holes <span>{openHoles.length}</span></button><button aria-pressed={action === 'reduce'} disabled={busy} onClick={() => setAction('reduce')}>Reduction</button><button aria-pressed={action === 'clean'} disabled={busy} onClick={() => setAction('clean')}>Literal prose</button></div>
    {action === 'hole' && (hole ? <div className="wb-hole-actions"><label htmlFor="wb-hole">Choose an open hole</label><select id="wb-hole" disabled={!canEdit} value={hole.position} onChange={event => { setPosition(Number(event.target.value)); setResponse(''); }}>{openHoles.map(item => <option key={item.position} value={item.position}>{item.position} · {item.headword}</option>)}</select>
      {candidate ? <div className="wb-candidate"><label htmlFor="wb-candidate">Choose a definition</label><select id="wb-candidate" disabled={!canEdit} value={candidate.entry_index} onChange={event => setCandidateIndex(Number(event.target.value))}>{hole.candidates.map(item => <option key={item.entry_index} value={item.entry_index}>E{item.entry_index} · {item.headword}</option>)}</select><p className="eyebrow">INSTANTIATED DEFINITION</p><p className="wb-definition-text">{candidate.instantiated_definition}</p><div className="wb-button-row"><button className="wb-primary" disabled={!canEdit} onClick={() => void send({ operation: 'expand', position: hole.position, entry_index: candidate.entry_index })}>Expand definition</button><button disabled={!canEdit} onClick={() => void send({ operation: 'recall', position: hole.position, entry_index: candidate.entry_index })}>Recall as literal text</button></div><p className="wb-small">Expansion exposes references. Recall inserts the instantiated wording literally.</p></div> : <p className="wb-small">No matching definition is available for this hole. You can supply a response below.</p>}
      <div className="wb-input-action"><label htmlFor="wb-input">Supply a response for {hole.headword}</label><textarea id="wb-input" value={response} onChange={event => setResponse(event.target.value)} disabled={!canEdit} maxLength={4096} rows={2} placeholder="Enter the supplied value or wording"/><button disabled={!canEdit || !response.trim()} onClick={() => void send({ operation: 'inject', position: hole.position, response })}>Record supplied input</button><p className="wb-small">The engine records the response and its obligation. It does not verify that it is an appropriate input.</p></div>
    </div> : <p className="wb-small wb-settled">No open holes in this frame. You can inspect children, record a reduction, or edit literal prose.</p>)}
    {action === 'reduce' && <div className="wb-reduction"><p className="wb-small">Record a response to the displayed frame. This creates an unchecked meaning-preservation claim.</p>{!frame.resolved && <p className="wb-edit-note">Resolve this frame’s remaining child demands before recording a reduction.</p>}<label htmlFor="wb-reduction">Your reduction response</label><textarea id="wb-reduction" value={response} onChange={event => setResponse(event.target.value)} disabled={!canEdit || !frame.resolved} maxLength={4096} rows={2} placeholder="For example, 10 N"/><button className="wb-primary" disabled={!canEdit || !frame.resolved || !response.trim()} onClick={() => void send({ operation: 'reduce', response })}>Record reduction</button>{frame.reduced !== null && <div className="wb-reopen"><p>The current reduction overlays the earlier calculation. Reopen it to make a fresh response to that calculation. Dependent reductions will also reopen; history stays recorded.</p><button disabled={!canEdit} onClick={() => void send({ operation: 'reopen' })}>Reopen this reduction</button></div>}</div>}
    {action === 'clean' && <div className="wb-literal"><p className="wb-small">Edit literal wording around this frame’s {frame.headwords.length} headword holes. Keep the {frame.latents.length} separate strings in their original order.</p><label htmlFor="wb-latents">Literal prose · JSON string array</label><textarea id="wb-latents" value={latents} onChange={event => setLatents(event.target.value)} disabled={!canEdit} rows={Math.min(10, frame.latents.length + 2)}/><button disabled={!canEdit} onClick={clean}>Record literal edit</button>{frame.reduced !== null && <p className="wb-small">This frame currently has a reduction overlay. Literal edits underneath become visible when it is reopened.</p>}</div>}
    <div className="wb-note-field"><label htmlFor="wb-note">Optional note for the next operation</label><input id="wb-note" value={note} onChange={event => setNote(event.target.value)} disabled={!canEdit} maxLength={1024}/></div>{localError && <p className="wb-local-error" role="alert">{localError}</p>}
  </section>;
}
