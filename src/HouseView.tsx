import type { Dictionary } from './data/dictionaries';
import type { House, HouseColumn, HousePart } from './houses';
import { houseColumns, houseHeadwords, houseStatus, usedBy } from './houses';
import { dictionaryName } from './pages/format';

interface Props {
  dictionary: Dictionary;
  selectedHeadword: string;
  selectedSourceId: string | null;
  /** Headwords the current trace step involves, if a trace is open. */
  activeIds: string[];
  onSelect: (headword: string, sourceId: string) => void;
  onLaw: (index: number) => void;
}

/** "Law 1 (Newton I)", or "Law 1" when the law has no title. Commas and brackets, never middle dots. */
export function lawName(dictionary: Pick<Dictionary, 'lawTitles'>, index: number): string {
  const title = dictionary.lawTitles?.[index];
  return title ? `Law ${index + 1} (${title})` : `Law ${index + 1}`;
}

const rows = [
  { key: 'before', label: 'Before', role: 'the chimney' },
  { key: 'law', label: 'The law', role: 'the roof' },
  { key: 'after', label: 'After', role: 'the walls' },
] as const;
type Row = typeof rows[number];

/** The exact string, with the headwords it refers to underlined; the other two law words in blue. */
function Parts({ parts, law }: { parts: HousePart[]; law: string[] }) {
  return <>{parts.map((part, index) => part.headword === undefined || part.self
    ? <span key={index}>{part.text}</span>
    : <span key={index} className={law.includes(part.headword) ? 'dict-house-word is-law' : 'dict-house-word'}>{part.text}</span>)}</>;
}

/** One slot of a law: an entry button, a "not written yet" slot, or nothing (a slot this headword never has). */
function Cell({ house, column, row, selectedSourceId, onSelect, withRole }: { house: House; column: HouseColumn; row: Row; selectedSourceId: string | null; onSelect: Props['onSelect']; withRole?: boolean }) {
  const id = column[row.key];
  const role = withRole ? <span className="dict-house-cell-role">{row.label}</span> : null;
  if (id === undefined) return null;
  if (id === null) return <div className="dict-house-missing">{role}<span className="vd-label">not written yet</span></div>;
  const others = houseHeadwords(house).filter(headword => headword !== column.headword);
  const current = selectedSourceId === id;
  return <button className={'dict-house-cell' + (current ? ' is-current' : '')} aria-pressed={current} onClick={() => onSelect(column.headword, id)}>
    {role}
    <span className="dict-house-cell-id vd-string">{id}</span>
    <span className="dict-house-cell-text vd-string"><Parts parts={house.entries[id]} law={row.key === 'law' ? others : []}/></span>
  </button>;
}

function ColumnHead({ column, selectedHeadword, activeIds }: { column: HouseColumn; selectedHeadword: string; activeIds: string[] }) {
  const active = activeIds.includes(column.headword);
  return <>
    <span className={'dict-house-headword vd-string' + (active ? ' is-active' : '')}>{column.headword}</span>
    <span className="dict-house-born vd-label">{column.born ? 'new in this law' : 'already defined'}{active && ', in this step'}{selectedHeadword === column.headword && <span className="sr-only">, selected</span>}</span>
  </>;
}

export default function HouseView({ dictionary, selectedHeadword, selectedSourceId, activeIds, onSelect, onLaw }: Props) {
  const houses = dictionary.houses ?? [];
  return <section id="house-view" className="dict-houses" aria-label="Laws in this dictionary">
    <p className="vd-label dict-houses-intro">Each law is three headwords that define each other. Read across a row to compare the three; read down a column to follow one headword. Select an entry to read it in full.</p>
    {houses.map((house, index) => {
      const columns = houseColumns(house);
      const status = houseStatus(house);
      const links = usedBy(dictionary, index);
      const titleId = `house-title-${index}`;
      const caption = `${lawName(dictionary, index)}, degree ${house.degree}`;
      return <article className="dict-house" id={`house-${index}`} tabIndex={-1} key={index} aria-labelledby={titleId}>
        <h3 id={titleId} className="dict-house-caption">{caption}</h3>

        {/* Wide containers: a table. Narrow containers: the same slots stacked per headword. One of the two is display: none. */}
        <table className="dict-house-table" aria-labelledby={titleId}>
          <thead>
            <tr>
              <td/>
              {columns.map(column => <th scope="col" key={column.headword} className={selectedHeadword === column.headword ? 'is-current' : undefined}><ColumnHead column={column} selectedHeadword={selectedHeadword} activeIds={activeIds}/></th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => <tr key={row.key} className={`dict-house-row-${row.key}`}>
              <th scope="row"><span className="dict-house-rowlabel">{row.label}</span><span className="vd-label dict-house-rowrole">{row.role}</span></th>
              {columns.map(column => <td key={column.headword}><Cell house={house} column={column} row={row} selectedSourceId={selectedSourceId} onSelect={onSelect}/></td>)}
            </tr>)}
          </tbody>
        </table>

        <div className="dict-house-stack">
          {columns.map(column => <section key={column.headword} className={'dict-house-stack-column' + (selectedHeadword === column.headword ? ' is-current' : '')} aria-label={column.headword}>
            <p className="dict-house-stack-head"><ColumnHead column={column} selectedHeadword={selectedHeadword} activeIds={activeIds}/></p>
            {rows.filter(row => column[row.key] !== undefined).map(row => <div key={row.key} className={`dict-house-stack-slot dict-house-row-${row.key}`}>
              <Cell house={house} column={column} row={row} selectedSourceId={selectedSourceId} onSelect={onSelect} withRole/>
            </div>)}
          </section>)}
        </div>

        <p className="dict-house-status">
          {status.present} of {status.total} entries written.
          {status.missing.map(item => <span key={`${item.role}-${item.headword}`}> The {item.role} of <span className="vd-string">{item.headword}</span> is not written yet.</span>)}
        </p>
        {!!links.length && <ul className="dict-house-links">{links.map(link => <li key={link.house}>
          <button className="vd-link-button" onClick={() => onLaw(link.house)}>{lawName(dictionary, link.house)}</button> uses {link.headwords.map((headword, at) => <span key={headword}>{at > 0 && ', '}<span className="vd-string">{headword}</span></span>)}.
        </li>)}</ul>}
      </article>;
    })}
    <p className="vd-label dict-houses-note">According to {dictionaryName(dictionary)}. Laws are detected by the VDfirst engine from the entries; this site only displays them. Underlined words are headwords the entry refers to; in the law row, the other two law words are in blue.</p>
  </section>;
}
