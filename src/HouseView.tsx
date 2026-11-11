import type { Dictionary } from './data/dictionaries';
import type { House, HouseColumn, HousePart } from './houses';
import { houseColumns, houseHeadwords, houseStatus, lawLabel, usedBy } from './houses';

interface Props {
  dictionary: Dictionary;
  selectedHeadword: string;
  selectedSourceId: string | null;
  /** Headwords the current trace step involves, if a trace is open. */
  activeIds: string[];
  onSelect: (headword: string, sourceId: string) => void;
  onLaw: (index: number) => void;
}

const rows = [
  { key: 'before', label: 'Before', sub: 'Chimney' },
  { key: 'law', label: 'The law', sub: 'Triplet' },
  { key: 'after', label: 'After', sub: 'Walls' },
] as const;

function Parts({ parts, law }: { parts: HousePart[]; law: string[] }) {
  return <>{parts.map((part, index) => part.headword === undefined || part.self
    ? <span key={index}>{part.text}</span>
    : <span key={index} className={law.includes(part.headword) ? 'house-word law-word' : 'house-word'}>{part.text}</span>)}</>;
}

function Cell({ house, column, row, selectedSourceId, onSelect }: { house: House; column: HouseColumn; row: typeof rows[number]; selectedSourceId: string | null; onSelect: Props['onSelect'] }) {
  const id = column[row.key];
  if (id === undefined) return <div className="house-none" aria-hidden="true"/>;
  if (id === null) return <div className="house-missing"><span className="house-cell-role">{row.sub === 'Walls' ? 'Wall' : row.sub}</span>Not written yet</div>;
  const others = houseHeadwords(house).filter(headword => headword !== column.headword);
  return <button className={`house-cell${row.key === 'law' ? ' law' : ''}${selectedSourceId === id ? ' selected' : ''}`} aria-pressed={selectedSourceId === id} onClick={() => onSelect(column.headword, id)}>
    <span className="house-cell-id">{id}<span className="house-cell-role"> · {row.key === 'law' ? 'Triplet corner' : row.key === 'before' ? 'Chimney' : 'Wall'}</span></span>
    <span className="house-cell-text"><Parts parts={house.entries[id]} law={row.key === 'law' ? others : []}/></span>
  </button>;
}

export default function HouseView({ dictionary, selectedHeadword, selectedSourceId, activeIds, onSelect, onLaw }: Props) {
  const houses = dictionary.houses ?? [];
  return <section id="house-view" className="house-view" aria-label="Laws in this dictionary">
    <div className="house-intro"><p className="eyebrow">LAWS · {houses.length}</p><p>Each law is three headwords that define each other. Read across a row to compare the three; read down a column to follow one headword. Select an entry to read it in full.</p></div>
    {houses.map((house, index) => {
      const columns = houseColumns(house);
      const status = houseStatus(house);
      const links = usedBy(dictionary, index);
      return <article className="house" id={`house-${index}`} key={index} aria-labelledby={`house-title-${index}`}>
        <header className="house-heading">
          <div><p className="eyebrow">LAW {index + 1}</p><h3 id={`house-title-${index}`}>{dictionary.lawTitles?.[index] ?? houseHeadwords(house).join(' · ')}</h3></div>
          <span className={`house-status${status.missing.length ? ' incomplete' : ''}`}>{status.present} of {status.total} entries{status.missing.length ? ` · ${status.missing.length === 1 ? `one ${status.missing[0].role}` : `${status.missing.length} entries`} not written yet` : ''}</span>
        </header>
        <div className="house-grid">
          <div className="house-rowlabels" aria-hidden="true"><div/>{rows.map(row => <div className={`house-rowlabel ${row.key}`} key={row.key}><strong>{row.label}</strong><span>{row.sub}</span></div>)}</div>
          {columns.map(column => <div className="house-column" key={column.headword}>
            <div className={`house-headword${activeIds.includes(column.headword) ? ' active' : ''}${selectedHeadword === column.headword ? ' selected' : ''}`}><strong>{column.headword}</strong><span>{column.born ? 'Born in this law' : 'Already defined'}{activeIds.includes(column.headword) && <em> · in this step</em>}</span></div>
            {rows.map(row => <Cell key={row.key} house={house} column={column} row={row} selectedSourceId={selectedSourceId} onSelect={onSelect}/>)}
          </div>)}
        </div>
        {!!links.length && <p className="house-links">{links.map(link => <span key={link.house}><button onClick={() => onLaw(link.house)}>{lawLabel(dictionary, link.house)}</button> uses {link.headwords.join(', ')}.</span>)}</p>}
      </article>;
    })}
    <p className="house-footnote">According to {dictionary.name}. Laws are detected by the VDfirst engine from the entries; this site only displays them. Highlighted words are headwords the entry refers to.</p>
  </section>;
}
