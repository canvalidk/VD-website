import { useId, useState } from 'react';
import type { Dictionary } from './data/dictionaries';
import type { HousePart, HouseRole } from './houses';
import { dictionaryName } from './pages/format';
import { homeGroups, homeIncompleteLaw, homeLawWords, homeLog, homeOpening } from './homeFigure';
import type { HomeLogLine } from './homeFigure';

/**
 * The Introduction's one live picture: a real law-house drawn from its six entries, with the
 * entries listed as log lines in the order they were added. Log lines and slips are linked both
 * ways; selecting either shows the entry's exact string under the drawing. Static: no pan, zoom
 * or animation.
 */
export interface IntroHouseProps {
  dictionary: Dictionary;
  houseIndex: number;
  /** Builds the link that opens an entry on the Dictionary page. */
  dictionaryHref: (headword: string, sourceId: string) => string;
}

// Drawing geometry. Rows are fixed in pixels; columns are percentages of the drawing's width, so the
// roof spacing scales with the column and the slips (at most 36% wide) never leave it.
const TOP = 44, ROW = 108;
const rowY = (row: number) => TOP + row * ROW;
const colX = (col: number) => 50 + col * 31.5;
const HEIGHT = rowY(3) + TOP;

/** The house's links, by houseSlots() position: roof from the triplet, chimney and walls from same-headword pairs. */
const houseLinks: [number, number, 'roof' | 'rail'][] = [[1, 2, 'roof'], [1, 3, 'roof'], [2, 3, 'roof'], [0, 1, 'rail'], [2, 4, 'rail'], [3, 5, 'rail']];
const roleClass: Record<HouseRole, string> = { chimney: 'again', triplet: 'law', wall: 'again' };
const roleShort: Record<HouseRole, string> = { chimney: 'chimney', triplet: 'roof', wall: 'wall' };
/** The Edge's stroke code in miniature: medium blue for a word defined again, full crimson for the law. */
const strokeHeight: Record<HouseRole, number> = { chimney: 14, triplet: 22, wall: 14 };

function Stroke({ line }: { line: HomeLogLine }) {
  const height = strokeHeight[line.role];
  return <svg className="home-stroke" width="6" height="22" viewBox="0 0 6 22" aria-hidden="true" focusable="false">
    {line.id === null
      ? <rect className="home-stroke-unwritten" x="0.75" y={22 - height + 0.75} width="4.5" height={height - 1.5}/>
      : <rect className={`home-stroke-${roleClass[line.role]}`} x="0" y={22 - height} width="6" height={height}/>}
  </svg>;
}

function Link({ a, b, kind }: { a: HomeLogLine; b: HomeLogLine; kind: 'roof' | 'rail' }) {
  const ends = { y1: rowY(a.row), y2: rowY(b.row) };
  if (a.id === null || b.id === null) return <line className="home-link-unwritten" x1={`${colX(a.col)}%`} x2={`${colX(b.col)}%`} {...ends}/>;
  if (kind === 'roof') return <line className="home-link-roof" x1={`${colX(a.col)}%`} x2={`${colX(b.col)}%`} {...ends}/>;
  // Same headword, defined again: a double rail, two lines offset along the (horizontal) normal.
  return <svg x={`${colX(a.col)}%`} overflow="visible">
    <line className="home-link-rail" x1={-2.5} x2={-2.5} {...ends}/>
    <line className="home-link-rail" x1={2.5} x2={2.5} {...ends}/>
  </svg>;
}

/** The exact string. Inside a law entry, the other two law words are the roof: they select their own entries. */
function Parts({ parts, lawWords, onWord }: { parts: HousePart[]; lawWords: string[]; onWord: (headword: string) => void }) {
  return <>{parts.map((part, index) => part.headword !== undefined && !part.self && lawWords.includes(part.headword)
    ? <button key={index} type="button" className="home-word" onClick={() => onWord(part.headword!)}>{part.text}</button>
    : <span key={index}>{part.text}</span>)}</>;
}

/** Fallback when a definition has no exported parts: the dictionary's own string, with line wrapping collapsed. */
function definitionText(dictionary: Dictionary, sourceId: string): string {
  for (const entry of dictionary.entries) {
    if (entry.sourceId === sourceId) return entry.definition;
    const alternative = entry.alternatives?.find(item => item.sourceId === sourceId);
    if (alternative) return alternative.definition;
  }
  return '';
}

export default function IntroHouse({ dictionary, houseIndex, dictionaryHref }: IntroHouseProps) {
  const uid = useId();
  const lines = homeLog(dictionary, houseIndex);
  const [selected, setSelected] = useState<string | null>(() => homeOpening(dictionary, houseIndex));
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  if (!lines.length) return null;

  const linked = hovered ?? focused;
  const slots = [...lines].sort((a, b) => a.row - b.row || a.col - b.col);
  const current = lines.find(line => line.id !== null && line.id === selected) ?? lines.find(line => line.id !== null)!;
  const lawWords = homeLawWords(dictionary, houseIndex, current);
  const selectWord = (headword: string) => {
    const target = lines.find(line => line.role === 'triplet' && line.headword === headword);
    if (target?.id) { setSelected(target.id); window.requestAnimationFrame(() => document.getElementById(`${uid}-slip-${target.key}`)?.focus()); }
  };
  const incomplete = homeIncompleteLaw(dictionary, houseIndex);
  const missingHere = lines.filter(line => line.id === null).length;
  const name = dictionaryName(dictionary);
  const linking = (key: string) => ({
    onMouseEnter: () => setHovered(key),
    onMouseLeave: () => setHovered(null),
    onFocus: () => setFocused(key),
    onBlur: () => setFocused(null),
  });

  return <figure className="home-figure" aria-labelledby={`${uid}-caption`}>
    <div className="home-figure-panel">
      <div className="home-drawing" role="group" aria-label={`Law ${houseIndex + 1} drawn as a house`} style={{ height: HEIGHT }}>
        <svg className="home-lines" width="100%" height={HEIGHT} aria-hidden="true" focusable="false">
          {houseLinks.map(([from, to, kind]) => slots[from] && slots[to] && <Link key={`${from}-${to}`} a={slots[from]} b={slots[to]} kind={kind}/>)}
        </svg>
        {slots.map(line => {
          const place = { left: `${colX(line.col)}%`, top: rowY(line.row) };
          if (line.id === null) return <div key={line.key} className="home-slip home-slip-missing" style={place}>
            <span className="vd-string home-slip-headword">{line.headword}</span>
            <span className="vd-label home-slip-note">not written yet</span>
          </div>;
          return <button key={line.key} id={`${uid}-slip-${line.key}`} type="button" style={place}
            className={`home-slip home-slip-${roleClass[line.role]}${linked === line.key ? ' is-linked' : ''}`}
            aria-pressed={current.id === line.id} onClick={() => setSelected(line.id)} {...linking(line.key)}>
            <span className="vd-string home-slip-id">{line.id}</span>
            <span className="vd-string home-slip-headword">{line.headword}</span>
            <span className="sr-only">, {roleShort[line.role]}</span>
          </button>;
        })}
      </div>

      <div className="home-reading" aria-live="polite">
        <p className="home-reading-head">
          <span className="vd-string home-reading-id">{current.id}</span>{' '}
          <span className="vd-string home-reading-headword">{current.headword}</span>{' '}
          <span className="vd-label home-reading-role">{current.roleLabel}</span>
        </p>
        <p className="vd-string home-reading-string">
          {current.parts
            ? <Parts parts={current.parts} lawWords={lawWords} onWord={selectWord}/>
            : definitionText(dictionary, current.id!)}
        </p>
        <p className="vd-label home-reading-according">According to {name}.</p>
        <p className="home-reading-open"><a href={dictionaryHref(current.headword, current.id!)}>Open {current.id} in the dictionary</a></p>
      </div>

      <div className="home-log">
        {homeGroups.map(group => {
          const items = lines.filter(line => line.group === group.key);
          if (!items.length) return null;
          return <div className={`home-log-group home-log-${group.key}`} key={group.key} role="group" aria-labelledby={`${uid}-${group.key}`}>
            <p className="home-log-head" id={`${uid}-${group.key}`}>{group.label}</p>
            <ul className="home-log-lines">
              {items.map(line => {
                const content = <>
                  <Stroke line={line}/>
                  <span className={`vd-string home-log-id${line.id === null ? ' home-log-none' : ''}`}>{line.id ?? ''}</span>
                  <span className="vd-string home-log-headword">{line.headword}</span>
                  <span className="vd-label home-log-role">{line.roleLabel}{line.id === null ? ', not written yet' : ''}</span>
                </>;
                return <li className="home-log-line" key={line.key}>
                  {line.id === null
                    ? <div className="home-log-entry home-log-missing">{content}</div>
                    : <button type="button" className={`home-log-entry${linked === line.key ? ' is-linked' : ''}`} aria-pressed={current.id === line.id}
                        onClick={() => setSelected(line.id)} {...linking(line.key)}>{content}</button>}
                </li>;
              })}
            </ul>
          </div>;
        })}
      </div>

    </div>

    <figcaption className="home-caption" id={`${uid}-caption`}>
      Law {houseIndex + 1} of {name}. Six entries, in the order they were added{missingHere ? `; ${missingHere === 1 ? 'one is' : `${missingHere} are`} not written yet` : ''}.
      The three law entries refer to each other and make the roof. Lines are references between entries, not physical causes.
      Select an entry to read its exact string.
      {incomplete && <> The {incomplete.ordinal} law in this draft is still missing {incomplete.missing === 1 ? `one ${incomplete.role}` : `${incomplete.missing} entries`}: <a href={dictionaryHref(incomplete.headword, incomplete.sourceId)}>see it in the dictionary</a>.</>}
    </figcaption>
  </figure>;
}
