import { useEffect, useReducer, useRef, useState } from 'react';
import { dictionaries } from './data/dictionaries';
import { traces } from './data/traces';
import { explorerReducer, initialState } from './player';
import type { ExplorerState } from './player';
import { routeHash, useRoute, workshopEnabled } from './router';
import type { Page } from './router';
import HomePage from './pages/HomePage';
import DictionaryPage from './pages/DictionaryPage';
import TracesPage, { openingStep } from './pages/TracesPage';
import IdeasPage from './pages/IdeasPage';
import WorkshopPage from './pages/WorkshopPage';

const pageTitles: Record<Page, string> = { home: 'Introduction', dictionary: 'Dictionary', traces: 'Traces', ideas: 'Ideas', workshop: 'Workshop' };
const navPages: Page[] = ['home', 'dictionary', 'traces', 'ideas'];

/** Visitors land on the current Newton draft rather than an empty picker. */
const opening = (state: ExplorerState) => explorerReducer(state, { type: 'dictionary', id: 'newton-current' });

export default function App() {
  const route = useRoute();
  const [state, dispatch] = useReducer(explorerReducer, initialState, opening);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [presentationVisit, setPresentationVisit] = useState(0);
  const session = state.sessions[state.dictionaryId];
  // An entry stays selected only while it is one of the selected headword's entries; stepping a trace or
  // switching dictionary moves the headword, and a stale entry must not stay marked.
  const selectedEntry = dictionaries.find(item => item.id === state.dictionaryId)?.entries.find(entry => entry.id === session?.selectedEntryId);
  const sourceInHeadword = !!selectedSourceId && !!selectedEntry && (selectedEntry.sourceId === selectedSourceId || !!selectedEntry.alternatives?.some(item => item.sourceId === selectedSourceId));
  const firstRender = useRef(true);
  const dev = import.meta.env.DEV;

  // Deep links: apply the address's dictionary, entry or trace to the shared explorer state.
  useEffect(() => {
    const { page, params } = route;
    if (page === 'dictionary') {
      const id = params.get('d');
      if (id && dictionaries.some(item => item.id === id) && id !== state.dictionaryId) { dispatch({ type: 'dictionary', id }); setSelectedSourceId(null); }
      const entry = params.get('entry');
      if (entry) { dispatch({ type: 'entry', id: entry }); setSelectedSourceId(params.get('src')); }
    }
    if (page === 'traces') {
      const trace = traces.find(item => item.id === params.get('t'));
      if (!trace) return;
      if (trace.dictionaryId !== state.dictionaryId) dispatch({ type: 'dictionary', id: trace.dictionaryId });
      const current = state.sessions[trace.dictionaryId];
      const step = Number(params.get('step'));
      const reopen = !params.has('step') && openingStep(trace) !== 0;
      if (current.traceId !== trace.id || reopen) {
        setSelectedSourceId(null);
        dispatch({ type: 'trace', id: trace.id });
        dispatch({ type: 'seek', index: Number.isInteger(step) && step >= 1 && step <= trace.steps.length ? step - 1 : openingStep(trace) });
        setSelectedClaimId(null);
        setPresentationVisit(visit => visit + 1);
      } else if (Number.isInteger(step) && step >= 1 && step <= trace.steps.length && step - 1 !== current.stepIndex) {
        dispatch({ type: 'seek', index: step - 1 });
      }
    }
    // Only a change of address should do this; state changes made on the page must not be undone.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);

  // Each page has a title; moving to a page moves focus to its heading and pauses any playback elsewhere.
  useEffect(() => {
    document.title = route.page === 'home' ? 'Authority Dictionary, by Can Valid Kohen' : `${pageTitles[route.page]}, Authority Dictionary`;
    if (route.page !== 'traces') dispatch({ type: 'pause' });
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo(0, 0);
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route.page]);

  useEffect(() => {
    if (!session?.playing) return;
    const timeout = window.setTimeout(() => dispatch({ type: 'tick' }), 3000);
    return () => window.clearTimeout(timeout);
  }, [session?.playing, session?.stepIndex, session?.traceId, state.dictionaryId]);

  useEffect(() => {
    const pauseIfHidden = () => { if (document.hidden) dispatch({ type: 'pause' }); };
    document.addEventListener('visibilitychange', pauseIfHidden);
    return () => document.removeEventListener('visibilitychange', pauseIfHidden);
  }, []);

  const explorer = { route, state, dispatch, selectedSourceId: sourceInHeadword ? selectedSourceId : null, setSelectedSourceId, selectedClaimId, setSelectedClaimId, presentationVisit };
  const skipToMain = (event: React.MouseEvent) => { event.preventDefault(); const main = document.getElementById('main'); main?.focus(); main?.scrollIntoView({ block: 'start' }); };

  return <>
    <a className="skip-link" href="#main" onClick={skipToMain}>Skip to content</a>
    <header className="running-head">
      <div className="running-head-inner">
        <a className="wordmark" href={routeHash('home')}><strong>Authority Dictionary</strong><span>by Can Valid Kohen</span></a>
        <nav className="site-nav" aria-label="Pages">
          {navPages.map(page => <a key={page} href={routeHash(page)} aria-current={route.page === page ? 'page' : undefined}>{pageTitles[page]}</a>)}
          {workshopEnabled(dev) && <a href={routeHash('workshop')} aria-current={route.page === 'workshop' ? 'page' : undefined}>Workshop <span className="vd-label">(local)</span></a>}
        </nav>
      </div>
    </header>
    <main id="main" tabIndex={-1}>
      {route.page === 'home' && <HomePage/>}
      {route.page === 'dictionary' && <DictionaryPage {...explorer}/>}
      {route.page === 'traces' && <TracesPage {...explorer}/>}
      {route.page === 'ideas' && <IdeasPage/>}
      {route.page === 'workshop' && <WorkshopPage/>}
    </main>
    <footer className="colophon">
      <div className="colophon-inner"><p>Authority Dictionary, by Can Valid Kohen. Research in progress: the dictionaries are drafts, and traces recorded elsewhere are only replayed here. Law-houses exported from VDfirst at 5a57790. Ideas text from VD-docs at 543df65.</p></div>
    </footer>
  </>;
}
