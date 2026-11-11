import { useEffect, useState } from 'react';
import { dictionaries } from '../data/dictionaries';
import type { Entry } from '../data/dictionaries';
import Graph from '../Graph';
import HouseView, { lawName } from '../HouseView';
import Edge from '../Edge';
import { entryRoles, houseStatus, outline } from '../houses';
import { routeHash } from '../router';
import AccordingTo from './AccordingTo';
import { dictionaryName } from './format';
import type { ExplorerProps } from './types';

const roleName = { chimney: 'chimney', triplet: 'roof', wall: 'wall' };

/** Wide enough for the index to sit beside the map (matches the 760px breakpoint in dictionary.css). */
const WIDE = '(min-width: 761px)';
const isWide = () => typeof window === 'undefined' || !window.matchMedia || window.matchMedia(WIDE).matches;

/** Keep the address bar pointing at what is selected, without adding history entries. */
function reflect(params: Record<string, string | undefined>) {
  window.history.replaceState(null, '', routeHash('dictionary', params));
}

/** Every entry id of a headword, in the order the source gives them: "E3, E5". */
const entryIds = (entry: Entry) => [entry.sourceId, ...(entry.alternatives ?? []).map(item => item.sourceId)].join(', ');

export default function DictionaryPage({ state, dispatch, selectedSourceId, setSelectedSourceId }: ExplorerProps) {
  const [view, setView] = useState<'network' | 'table'>('network');
  const [selectedLaw, setSelectedLaw] = useState<number | null>(null);
  // The headword index is open beside the map on wide screens and closed under it on small ones.
  const [indexOpen, setIndexOpen] = useState(isWide);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia(WIDE);
    const sync = () => setIndexOpen(query.matches);
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const dictionary = dictionaries.find(item => item.id === state.dictionaryId) ?? dictionaries.find(item => item.id === 'newton-current')!;
  const session = state.sessions[dictionary.id];
  const selected = dictionary.entries.find(entry => entry.id === session.selectedEntryId) ?? dictionary.entries[0];
  const hasLaws = !!dictionary.houses?.length;
  const structure = hasLaws ? outline(dictionary) : undefined;
  const incoming = dictionary.entries.filter(entry => entry.references.includes(selected.id));
  const definitions = [{ sourceId: selected.sourceId, definition: selected.definition, references: selected.references }, ...(selected.alternatives ?? [])];
  const tableView = view === 'table' && hasLaws;
  const name = dictionaryName(dictionary);

  const selectEntry = (id: string, sourceId: string | null = null) => {
    dispatch({ type: 'entry', id }); setSelectedSourceId(sourceId); setSelectedLaw(null);
    reflect({ d: dictionary.id, entry: id, src: sourceId ?? undefined });
  };
  const openDictionary = (id: string) => {
    dispatch({ type: 'dictionary', id }); setSelectedSourceId(null); setSelectedLaw(null);
    reflect({ d: id });
  };
  // In the table, scroll to the law. In the network, select the top of its roof so the house comes into view.
  const showLaw = (index: number) => {
    const house = dictionary.houses?.[index];
    if (!house) return;
    if (tableView) window.requestAnimationFrame(() => { const law = document.getElementById(`house-${index}`); law?.scrollIntoView({ block: 'start' }); law?.focus({ preventScroll: true }); });
    else selectEntry(house.anchor, house.triplet[house.anchor]);
    setSelectedLaw(index);
  };

  const entryRow = (entry: Entry) => {
    const current = selected.id === entry.id;
    return <li key={entry.id}>
      <button className={'dict-index-row' + (current ? ' is-current' : '')} aria-current={current ? 'true' : undefined} onClick={() => selectEntry(entry.id)}>
        <span className="dict-index-word vd-string">{entry.id}</span>
        <span className="dict-index-id vd-string">{entryIds(entry)}</span>
      </button>
    </li>;
  };
  const group = (key: string, head: string, entries: Entry[]) => <div key={key} className="dict-group">
    <h3 className="dict-group-head">{head}</h3>
    <ul className="dict-rows">{entries.map(entryRow)}</ul>
  </div>;

  return <div className="page dict-page">
    <h1 id="page-title" tabIndex={-1} className="sr-only">Dictionary</h1>
    <AccordingTo dictionary={dictionary} onChange={openDictionary}/>
    <Edge dictionary={dictionary} selectedHeadword={selected.id} selectedSourceId={selectedSourceId} selectedLaw={selectedLaw} onSelect={(headword, sourceId) => selectEntry(headword, sourceId)}/>
    <div className="dict-layout">

      <section className="dict-main" aria-label="Dictionary map">
        {hasLaws && <div className="vd-segmented dict-view-picker" role="group" aria-label="Show the laws as">
          <button className="vd-button" aria-pressed={!tableView} onClick={() => setView('network')}>Network</button>
          <button className="vd-button" aria-pressed={tableView} onClick={() => setView('table')}>Laws as a table</button>
        </div>}
        {tableView
          ? <HouseView dictionary={dictionary} selectedHeadword={selected.id} selectedSourceId={selectedSourceId} activeIds={[]} onSelect={selectEntry} onLaw={showLaw}/>
          : <>
            <Graph dictionary={dictionary} selected={selected} selectedSourceId={selectedSourceId} stepIndex={0} playing={false} onSelect={(id, sourceId) => selectEntry(id, sourceId ?? null)} onPlayback={dispatch}/>
            <div className="dict-captions">
              <p className="vd-label">Select an entry to read it. Drag to pan; use Fit all to see everything.</p>
              <p className="vd-label">Lines are references between entries, not physical causes.</p>
            </div>
          </>}
      </section>

      <aside className="dict-inspector" aria-labelledby="dict-headword">
        <h2 id="dict-headword" className="dict-headword vd-string">{selected.id}</h2>
        {definitions.map(item => {
          const current = selectedSourceId === item.sourceId;
          const roles = entryRoles(dictionary.houses ?? [], item.sourceId);
          return <section key={item.sourceId} className={'dict-sense' + (current ? ' is-current' : '')} aria-label={`Entry ${item.sourceId}`}>
            <p className="dict-sense-head">
              <span className="dict-sense-id vd-string">{item.sourceId}</span>
              {roles.map(role => <button key={`${role.house}-${role.role}`} className="dict-role-link vd-link-button" onClick={() => showLaw(role.house)}>{roleName[role.role]} of Law {role.house + 1}</button>)}
            </p>
            <p className="dict-sense-string vd-string">{item.definition}</p>
            <p className="vd-label dict-according">According to {name}.</p>
          </section>;
        })}
        <h3 className="dict-refs-head">Refers to</h3>
        {selected.references.length
          ? <ul className="dict-refs">{selected.references.map(id => <li key={id}><button className="vd-string vd-link-button" onClick={() => selectEntry(id)}>{id}</button></li>)}</ul>
          : <p className="vd-label dict-refs-none">No other headwords.</p>}
        <h3 className="dict-refs-head">Referred to by</h3>
        {incoming.length
          ? <ul className="dict-refs">{incoming.map(entry => <li key={entry.id}><button className="vd-string vd-link-button" onClick={() => selectEntry(entry.id)}>{entry.id}</button></li>)}</ul>
          : <p className="vd-label dict-refs-none">No other headwords.</p>}
        <p className="vd-label dict-source">From {dictionaryName({ name: dictionary.source })}. Entry ids are the source's own.</p>
      </aside>

      <nav className="dict-index" aria-label={`Headwords in ${name}`}>
        {structure && <section className="dict-laws" aria-labelledby="dict-laws-title">
          <h2 id="dict-laws-title" className="dict-index-head">Laws</h2>
          <ul className="dict-rows">{structure.laws.map(law => {
            const status = houseStatus(dictionary.houses![law.house]);
            const current = selectedLaw === law.house;
            const missing = status.missing.length;
            return <li key={law.house}>
              <button className={'dict-law-row' + (current ? ' is-current' : '')} aria-current={current ? 'true' : undefined} onClick={() => showLaw(law.house)}>
                <span className="dict-law-name">{lawName(dictionary, law.house)}</span>
                <span className="dict-law-count vd-num" aria-hidden="true">{status.present}/{status.total}</span>
                <span className="sr-only">, {status.present} of {status.total} entries written</span>
                {!!missing && <span className="vd-label dict-law-note">{missing === 1 ? 'one entry not written yet' : `${missing} entries not written yet`}</span>}
              </button>
            </li>;
          })}</ul>
        </section>}
        <details className="dict-headwords" open={indexOpen} onToggle={event => setIndexOpen(event.currentTarget.open)}>
          <summary className="dict-index-head">All headwords ({dictionary.entries.length})</summary>
          {structure ? <>
            {!!structure.groundwork.length && group('groundwork', 'Degree 0', structure.groundwork)}
            {structure.laws.map(law => group(`law-${law.house}`, `Law ${law.house + 1}, degree ${dictionary.houses![law.house].degree}`, law.entries))}
            {structure.others.map(item => group(`degree-${item.degree}`, `Outside laws, degree ${item.degree}`, item.entries))}
          </> : <ul className="dict-rows">{dictionary.entries.map(entryRow)}</ul>}
        </details>
      </nav>
    </div>
  </div>;
}
