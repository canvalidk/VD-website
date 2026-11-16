import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import * as bridge from '../workbench/bridge.ts';
import { BridgeError, recordDictionary } from '../workbench/bridge.ts';
import { MAX_COMMANDS, MAX_RECORD_BYTES, changedFrameId, describeCommand, describeParts, entryId, inspectRecord, openHoles, parseRecord, valueCommands } from '../workbench/record.ts';
import type { Command, Producer, TraceRecord } from '../workbench/record.ts';
import { doerSources, headwordsOf, sourceIdOf } from '../workbench/sources.ts';
import FrameTree from '../workbench/FrameTree.tsx';
import type { Selection } from '../workbench/FrameTree.tsx';
import Actions, { ACTIONS_HEADING_ID } from '../workbench/Actions.tsx';
import Ledger from '../workbench/Ledger.tsx';
import '../workshop.css';

/**
 * The workshop: local builds only, never in production. Its first tool is the trace doer: start a
 * trace from a dictionary and a demand, then take it one step at a time. The VDfirst engine does every
 * step, through its local bridge; the page holds the record the engine sends back and shows it.
 */

/** Where a record came from. Only records the engine made here are replayed on reload without asking. */
type Origin = 'engine' | 'file';
interface Session {
  record: TraceRecord;
  /** The engine made or replayed this record during this visit, so it can be continued. */
  live: boolean;
  origin: Origin;
  /** The file it was opened from, if any. */
  fileName?: string;
}
type Engine = { state: 'checking' } | { state: 'online'; producer: Producer } | { state: 'offline'; reason: string };

const STORAGE_KEY = 'vd-workshop-record';
/** The engine's refusals, in the page's words where the engine's are terse; otherwise as the engine said them. */
const errorText = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Something went wrong.';
  if (/record digest mismatch|dictionary digest mismatch/.test(message)) return 'The record was changed after the engine made it: its digest no longer matches. It can be read here, but the engine will not continue it.';
  if (/do not match command replay/.test(message)) return "Replaying the record's steps did not give the record back exactly, so the engine will not continue it.";
  return message;
};
const isFingerprint = (error: unknown) => error instanceof BridgeError && /fingerprint/.test(error.message);
const FINGERPRINT_TEXT = 'This record was made by a different version of the engine, so it can be read here but not continued. "Replay into a new record" carries its steps over to this engine, if this engine still accepts them.';

function restore(): Session | null {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!saved || typeof saved !== 'object') return null;
    const origin: Origin = saved.origin === 'engine' ? 'engine' : 'file';
    return { record: inspectRecord(saved.record), live: false, origin, fileName: typeof saved.fileName === 'string' ? saved.fileName : undefined };
  } catch { return null; }
}

const originText = (session: Session) => session.origin === 'file' ? `Opened from ${session.fileName ?? 'a file'}` : 'Made by the engine in this browser';
// A file states its own digest, so compare more than that before treating two records as one.
const sameRecord = (a: Session, b: Session) => a.record.sha256 === b.record.sha256
  && a.record.producer.engine_sha256 === b.record.producer.engine_sha256 && a.record.commands.length === b.record.commands.length;

export default function WorkshopPage() {
  const [engine, setEngine] = useState<Engine>({ state: 'checking' });
  const [session, setSession] = useState<Session | null>(restore);
  const [view, setView] = useState(() => (session?.record.snapshots.length ?? 1) - 1);
  const [selection, setSelection] = useState<Selection>(null);
  const [starting, setStarting] = useState(!session);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Records set aside in this visit, newest first, so opening or starting another never loses the one before.
  const [shelf, setShelf] = useState<Session[]>([]);
  // Whether the open record is kept in this browser: large records do not fit in its storage.
  const [kept, setKept] = useState(true);
  const revalidated = useRef(false);
  const [focusActions, setFocusActions] = useState(0);

  const record = session?.record;
  const snapshot = record?.snapshots[view] ?? record?.snapshots.at(-1);
  const latest = !!record && view === record.snapshots.length - 1;
  const sourceId = record ? sourceIdOf(record) : () => null;

  const checkEngine = useCallback(async () => {
    setEngine({ state: 'checking' });
    try { setEngine({ state: 'online', producer: await bridge.health() }); }
    catch (cause) { setEngine({ state: 'offline', reason: errorText(cause) }); }
  }, []);
  useEffect(() => { void checkEngine(); }, [checkEngine]);

  // Keep the open record in this browser, so a reload does not lose work. Say so when it does not fit.
  useEffect(() => {
    try {
      if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ origin: session.origin, fileName: session.fileName, record: session.record }));
      else window.localStorage.removeItem(STORAGE_KEY);
      setKept(true);
    } catch {
      // Storage full or blocked. Never leave an older record behind to come back on reload.
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* blocked entirely */ }
      setKept(false);
    }
  }, [session]);

  // After a step, focus moves to the actions panel's heading, so keyboard work carries on from there.
  useEffect(() => {
    // Runs after the new panel is in the page; no animation frame, which a background tab may never run.
    if (focusActions) document.getElementById(ACTIONS_HEADING_ID)?.focus({ preventScroll: true });
  }, [focusActions]);

  const open = (next: Session, message: string) => {
    if (session && !sameRecord(session, next)) {
      const set = session;
      setShelf(items => [set, ...items.filter(item => !sameRecord(item, set) && !sameRecord(item, next))].slice(0, 8));
    } else setShelf(items => items.filter(item => !sameRecord(item, next)));
    setSession(next); setView(next.record.snapshots.length - 1); setSelection(null); setStarting(false); setError(''); setNotice(message);
    setFocusActions(count => count + 1);
  };

  // A kept or opened record is shown at once and continued only after the engine replays it. A record
  // the engine made in this browser is replayed on its own once the engine is up; a file waits to be asked.
  const validate = useCallback(async (current: Session) => {
    setBusy(true); setError('');
    try {
      const replayed = await bridge.validate(current.record);
      setSession(now => now && sameRecord(now, current) ? { ...now, record: replayed, live: true } : now);
      setNotice('The engine replayed this record step by step and can continue it.');
    } catch (cause) {
      if (cause instanceof BridgeError && cause.offline) void checkEngine();
      setError(isFingerprint(cause) ? FINGERPRINT_TEXT : errorText(cause));
    } finally { setBusy(false); }
  }, [checkEngine]);
  useEffect(() => {
    if (engine.state === 'online' && session && !session.live && session.origin === 'engine' && !revalidated.current) {
      revalidated.current = true;
      void validate(session);
    }
  }, [engine, session, validate]);

  /**
   * Send one command, then any that follow from the record it produced, as one action: the record is
   * kept only if the engine takes every step. If one is refused, the record is as it was.
   */
  async function runSteps(first: Command, then: (record: TraceRecord) => Command[], describe: (from: number, to: number) => string): Promise<boolean> {
    if (!session || !session.live || !latest || busy) return false;
    const current = session;
    setBusy(true); setError('');
    try {
      const next = await bridge.commandSteps(current.record, first, then);
      setSession({ ...current, record: next });
      setView(next.snapshots.length - 1);
      setNotice(describe(current.record.commands.length + 1, next.commands.length));
      setSelection(nextSelection(next, first));
      setFocusActions(count => count + 1);
      return true;
    } catch (cause) {
      if (cause instanceof BridgeError && cause.offline) void checkEngine();
      if (isFingerprint(cause)) {
        // The engine changed under the page: this record can no longer be continued by it.
        setSession({ ...current, live: false });
        void checkEngine();
        setError(FINGERPRINT_TEXT);
      } else setError(errorText(cause));
      return false;
    } finally { setBusy(false); }
  }

  const run = (command: Command) => {
    const before = session?.record.snapshots.at(-1);
    return runSteps(command, () => [], from => `Step ${from}: ${describeCommand(command, before)}.`);
  };

  /**
   * Give a value for an open headword, as the engine takes one: expand it with the chosen entry, leave
   * the headwords in the definition's text unexpanded, and replace that text with the value. The
   * record then says the definition's wording means the same as the value, not the bare headword.
   * All or nothing, as the engine's own replacement is. A note goes on the step that replaces the text.
   */
  const giveValue = (frameId: string, position: number, entryIndex: number, value: string, note: string) => {
    const expand: Command = { operation: 'expand', frame_id: frameId, position, entry_index: entryIndex };
    return runSteps(expand,
      record => valueCommands(record.snapshots.at(-1)!, `${frameId}/${position}`, value)
        .map(command => command.operation === 'reduce' && note.trim() ? { ...command, note: note.trim() } : command),
      (from, to) => `Steps ${from} to ${to}: the text of ${entryId(entryIndex)} was replaced by ${value}.`);
  };

  /** A new record that repeats the first `count` steps of the open one; the open one is set aside unchanged. */
  async function replayInto(count: number) {
    if (!record || busy) return;
    setBusy(true); setError('');
    try {
      const next = await bridge.restartFrom(record, count, recordDictionary(record));
      const what = count === record.commands.length ? 'every step' : count === 1 ? 'the first step' : `the first ${count} steps`;
      open({ record: next, live: true, origin: 'engine' }, `A new record with ${what} of the last one. The last one is unchanged, under Earlier this visit.`);
    } catch (cause) {
      if (cause instanceof BridgeError && cause.offline) void checkEngine();
      setError(`The engine could not replay those steps into a new record. ${errorText(cause)}`);
    } finally { setBusy(false); }
  }

  async function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    // A record is at most 8 MiB as compact JSON; allow some room for a file saved with indentation.
    if (file.size > MAX_RECORD_BYTES * 2) { setError(`${file.name} is ${Math.round(file.size / 1048576)} MiB, too large to be a record.`); return; }
    try {
      const next = parseRecord(await file.text());
      open({ record: next, live: false, origin: 'file', fileName: file.name }, `Opened ${file.name}. It can be read now; continuing it asks the engine to replay it first.`);
    } catch (cause) { setError(`${file.name} could not be opened. ${errorText(cause)}`); }
  }

  function download() {
    if (!record) return;
    const name = record.question.demand.replace(/[^A-Za-z0-9_-]+/g, '-').slice(0, 48) || 'trace';
    // Compact, as the engine measures it, so any record the engine accepts can be opened again.
    const url = URL.createObjectURL(new Blob([JSON.stringify(record) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = `vd-trace-${name}-${record.record_id.slice(0, 8)}-step-${record.commands.length}.json`; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const online = engine.state === 'online';
  const full = !!record && record.commands.length >= MAX_COMMANDS;
  const locked = !session ? 'No record is open.'
    : !latest ? 'This is an earlier step, shown as it was. Go to the latest step to continue, or replay the steps up to here into a new record.'
      : !online ? 'The engine is not connected, so the record can be read but not continued.'
        : !session.live ? 'Continuing this record needs the engine to replay it first.'
          : full ? `A record holds at most ${MAX_COMMANDS} steps. Start a new record to go on.`
            : null;

  return <div className="page workshop-page">
    <h1 id="page-title" tabIndex={-1} className="page-title">Workshop</h1>
    <p className="vd-voice page-lead">Local builds only. Take a trace one step at a time: the VDfirst engine does each step, and the page holds the record it sends back.</p>

    <EngineLine engine={engine} onCheck={checkEngine} record={record}/>

    <p className="wk-notice vd-label" role="status" aria-live="polite">{notice}</p>
    {error && <div className="wk-error" role="alert"><p><strong>That did not go through.</strong> {error}</p><p className="vd-label">The record is as it was.</p></div>}

    {(starting || !record) && <StartForm busy={busy} online={online} canCancel={!!record} onCancel={() => setStarting(false)} onOpenFile={openFile}
      onStart={async (source, demand, context) => {
        setBusy(true); setError('');
        try { open({ record: await bridge.start(source, demand, context), live: true, origin: 'engine' }, 'Started. Choose an open headword to take the first step.'); }
        catch (cause) { if (cause instanceof BridgeError && cause.offline) void checkEngine(); setError(errorText(cause)); }
        finally { setBusy(false); }
      }}/>}

    {session && record && snapshot && !starting && <div className="wk-layout">
      <nav className="wk-steps" aria-label="Steps of this record">
        <h2 className="wk-side-title">Steps</h2>
        <ol className="wk-step-nav">
          {record.snapshots.map((item, i) => <li key={item.id}>
            <button type="button" className="wk-step-button" aria-current={i === view ? 'step' : undefined} onClick={() => { setView(i); setSelection(null); }}>
              <span className="wk-step-number vd-num">{i}</span>
              <span>{i === 0
                ? <>Started from <span className="vd-string">{record.question.demand}</span></>
                : describeParts(record.commands[i - 1], record.snapshots[i - 1], entryId).map((part, n) => typeof part === 'string' ? <span key={n}>{part}</span> : <span key={n} className="vd-string">{part.string}</span>)}</span>
            </button>
          </li>)}
        </ol>
        <div className="wk-side-actions">
          {!latest && <button type="button" className="vd-button" onClick={() => { setView(record.snapshots.length - 1); setSelection(null); }}>Go to the latest step</button>}
          {(!latest || !session.live) && <button type="button" className="vd-button" disabled={!online || busy} onClick={() => void replayInto(view)}>
            {latest ? 'Replay into a new record' : `New record from step ${view}`}
          </button>}
          {!session.live && <button type="button" className="vd-button" disabled={!online || busy} onClick={() => void validate(session)}>Continue with the engine</button>}
        </div>
        <div className="wk-side-actions">
          <button type="button" className="vd-button" onClick={download}>Download the record</button>
          <button type="button" className="vd-button" disabled={busy} onClick={() => { setStarting(true); setError(''); }}>Start another trace</button>
        </div>
        <p className="vd-label wk-hint">{originText(session)}. {session.live ? 'The engine can continue it.' : 'Not yet replayed by the engine.'}</p>
        {kept
          ? <p className="vd-label wk-hint">Kept in this browser until another record replaces it. Download it to keep it for good.</p>
          : <p className="wk-warning" role="status">This record is too large to keep in this browser. A reload will lose it: download it to keep it.</p>}
        {!!shelf.length && <div className="wk-shelf">
          <h3>Earlier this visit</h3>
          <ul>{shelf.map(item => <li key={item.record.sha256}>
            <button type="button" className="wk-shelf-button" disabled={busy} onClick={() => open(item, 'Back to an earlier record from this visit.')}>
              <span className="vd-string">{item.record.question.demand}</span>
              <span className="vd-label">{item.record.commands.length} {item.record.commands.length === 1 ? 'step' : 'steps'}; {originText(item).toLowerCase()}</span>
            </button>
          </li>)}</ul>
          <p className="vd-label wk-hint">Only for this visit; a reload keeps just the open record.</p>
        </div>}
      </nav>

      <div className="wk-main">
        <header className="wk-question">
          <p className="vd-label">According to <span className="vd-string">{record.dictionary.name}</span>, starting from</p>
          <p className="wk-demand vd-string">{record.question.demand}</p>
          {record.question.context && <p className="vd-voice wk-context">{record.question.context}</p>}
          <p className="wk-result"><span className="vd-label">{latest ? 'the root reads' : `the root read, at step ${view}`}</span> <span className="vd-string">{snapshot.prediction_set.result}</span></p>
          <p className="vd-label">{openHoles(snapshot).length ? `${openHoles(snapshot).length} open` : 'Nothing open'}; {snapshot.frames.length} {snapshot.frames.length === 1 ? 'frame' : 'frames'}; {record.commands.length} of {MAX_COMMANDS} steps used.</p>
        </header>
        <FrameTree snapshot={snapshot} selection={selection} onSelect={setSelection} sourceId={sourceId}
          recent={view > 0 ? { frameId: changedFrameId(record, view)!, step: view } : null}/>
        <Ledger record={record} snapshot={snapshot}/>
      </div>

      <aside className="wk-inspector" aria-label="Actions" aria-busy={busy}>
        <Actions snapshot={snapshot} selection={selection} onSelect={next => { setSelection(next); setFocusActions(count => count + 1); }} locked={locked} busy={busy} onCommand={run} onValue={giveValue} sourceId={sourceId}/>
      </aside>
    </div>}
  </div>;
}

/**
 * After a step, keep working where it leads: the first open headword in the frame it opened, else the
 * next open one. A braces step opens nothing, so the hole it changed stays selected.
 */
function nextSelection(record: TraceRecord, command: Command): Selection {
  if (command.operation === 'braces' && command.position !== undefined) return { kind: 'hole', frameId: command.frame_id, position: command.position };
  const snapshot = record.snapshots.at(-1)!;
  const open = openHoles(snapshot);
  if (!open.length) return null;
  const childId = command.position !== undefined ? `${command.frame_id}/${command.position}` : null;
  const target = open.find(item => item.frame.id === childId) ?? open.find(item => item.frame.id === command.frame_id) ?? open[0];
  return { kind: 'hole', frameId: target.frame.id, position: target.hole.position };
}

function EngineLine({ engine, onCheck, record }: { engine: Engine; onCheck: () => void; record?: TraceRecord }) {
  if (engine.state === 'checking') return <p className="wk-engine vd-label" aria-live="polite">Looking for the local engine.</p>;
  if (engine.state === 'online') {
    const same = !record || record.producer.engine_sha256 === engine.producer.engine_sha256;
    return <p className="wk-engine is-online">
      <span>Engine connected, fingerprint <span className="wk-code">{engine.producer.engine_sha256.slice(0, 12)}</span>.</span>
      {!same && <span className="vd-label"> The open record was made by another version of the engine.</span>}
      <button type="button" className="vd-link-button wk-recheck" onClick={onCheck}>Check again</button>
    </p>;
  }
  return <div className="wk-engine is-offline">
    <p><strong>The engine is not connected.</strong> Records can be read, but not started or continued.</p>
    <p className="vd-voice">In a VDfirst checkout, run <kbd className="wk-command">python workbench_server.py</kbd> (on Windows, <kbd className="wk-command">py -3 workbench_server.py</kbd>). It listens on this computer only, at port 8765.</p>
    <button type="button" className="vd-button" onClick={onCheck}>Check again</button>
  </div>;
}

interface StartProps {
  busy: boolean; online: boolean; canCancel: boolean;
  onStart: (dictionary: typeof doerSources[number]['dictionary'], demand: string, context: string) => Promise<void>;
  onCancel: () => void; onOpenFile: (event: ChangeEvent<HTMLInputElement>) => void;
}

function StartForm({ busy, online, canCancel, onStart, onCancel, onOpenFile }: StartProps) {
  const [sourceId, setSourceId] = useState(doerSources[0].id);
  const source = doerSources.find(item => item.id === sourceId)!;
  const [demand, setDemand] = useState(source.demand);
  const [context, setContext] = useState(source.context);
  const choose = (id: string) => {
    const next = doerSources.find(item => item.id === id)!;
    setSourceId(id); setDemand(next.demand); setContext(next.context);
  };
  const submit = (event: FormEvent) => { event.preventDefault(); if (demand.trim()) void onStart(source.dictionary, demand, context); };
  return <section className="wk-start" aria-labelledby="wk-start-title">
    <h2 id="wk-start-title">Start a trace</h2>
    <form onSubmit={submit} className="wk-start-form">
      <div className="wk-field">
        <label htmlFor="wk-source">Dictionary</label>
        <select id="wk-source" className="vd-select" value={sourceId} disabled={busy} onChange={event => choose(event.target.value)}>
          {doerSources.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      <div className="wk-field">
        <label htmlFor="wk-demand">Starting demand</label>
        <input id="wk-demand" className="wk-input vd-string" list="wk-headwords" required maxLength={4096} value={demand} disabled={busy} onChange={event => setDemand(event.target.value)}/>
        <datalist id="wk-headwords">{headwordsOf(source).map(headword => <option key={headword} value={headword}/>)}</datalist>
        <p className="vd-label">A headword, or a sentence with headwords in it. The engine finds the headwords; parameters go after an underscore, as in <span className="vd-string">force_cart_0</span>.</p>
      </div>
      <div className="wk-field">
        <label htmlFor="wk-context">Context <span className="vd-label">(optional, kept in the record)</span></label>
        <textarea id="wk-context" className="wk-input" rows={2} maxLength={8192} value={context} disabled={busy} onChange={event => setContext(event.target.value)}/>
      </div>
      <div className="wk-buttons">
        <button type="submit" className="vd-button wk-primary" disabled={busy || !online || !demand.trim()}>{busy ? 'Starting' : 'Start'}</button>
        {canCancel && <button type="button" className="vd-button" disabled={busy} onClick={onCancel}>Back to the open record</button>}
      </div>
      {!online && <p className="vd-label">Starting needs the engine.</p>}
    </form>
    <div className="wk-field wk-open-file">
      <label htmlFor="wk-file">Or open a saved record</label>
      <input id="wk-file" type="file" accept=".json,application/json" disabled={busy} onChange={onOpenFile}/>
    </div>
    <details className="wk-details">
      <summary>The {source.dictionary.entries.length} entries of {source.dictionary.name}</summary>
      <ol className="wk-entry-list">{source.dictionary.entries.map(([headword, definition], i) => <li key={i}>
        <span className="vd-string wk-entry-name">{entryId(i)}</span>{source.sourceIds[i] !== entryId(i) && <span className="vd-label"> ({source.sourceIds[i]} in the source)</span>} <span className="vd-string wk-entry-head">{headword}</span>
        <p className="vd-string">{definition}</p>
      </li>)}</ol>
    </details>
  </section>;
}
