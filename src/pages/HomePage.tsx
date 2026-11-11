import { dictionaries } from '../data/dictionaries';
import IntroHouse from '../IntroHouse';
import { routeHash } from '../router';
import { CORRECTION_TRACE } from './TracesPage';

/** Each door says what it will have you do. */
const doors = [
  { label: 'Dictionary', href: routeHash('dictionary', { d: 'newton-current' }), gloss: 'Open the Newton drafts and read any entry; each law is drawn as a house, nested by degree.' },
  { label: 'Traces', href: routeHash('traces', { t: 'newton-ii-recorded' }), gloss: 'Replay a recorded trace step by step, from the question to its answer.' },
  { label: 'A corrected mistake', href: routeHash('traces', { t: CORRECTION_TRACE }), gloss: 'Compare two derivations. One reaches 12 N; a new one reaches 10 N. The first stays on record as issued.' },
  { label: 'Ideas', href: routeHash('ideas'), gloss: 'Read the five ideas the project rests on, each with the note it comes from.' },
];

export default function HomePage() {
  const draft = dictionaries.find(item => item.id === 'newton-current')!;
  return <div className="page page-narrow home-page">
    <div className="home-top">
      <div className="home-text">
        <h1 id="page-title" tabIndex={-1} className="home-title">Physics, written as a dictionary that only grows.</h1>
        <div className="vd-voice home-prose">
          <p>An Authority Dictionary is a named list of entries. Each entry pairs a headword with an exact string. Entries are added and never changed. Every claim made with the dictionary is a claim according to it.</p>
          <p>In it, a physical law is three headwords, each defined by the other two. Three more entries tie the law to the rest of the dictionary: six in all, a law-house.</p>
          <p>The house here is a real one, the first law of the current draft of Newton's mechanics. The draft is unfinished.</p>
        </div>
      </div>
      <IntroHouse dictionary={draft} houseIndex={0} dictionaryHref={(headword, sourceId) => routeHash('dictionary', { d: draft.id, entry: headword, src: sourceId })}/>
    </div>
    <nav className="home-doors" aria-label="Where to go next">
      <ul className="home-door-list">
        {doors.map(door => <li key={door.label}>
          <a className="home-door" href={door.href}>
            <span className="home-door-label">{door.label}</span>
            <span className="home-door-gloss">{door.gloss}</span>
          </a>
        </li>)}
      </ul>
    </nav>
    <p className="vd-voice home-exit">A sign's meaning is what it makes people do and think. Whether the exit is really there is its accuracy. <a href={routeHash('ideas')}>More in Ideas.</a></p>
  </div>;
}
