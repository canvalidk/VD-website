import type { ReactNode } from 'react';
import { ideas } from '../data/explanation';
import type { ExplanationAction } from '../data/explanation';
import { routeHash } from '../router';
import { CORRECTION_TRACE } from './TracesPage';

/** Where an idea's action leads. Actions are plain links, so they can be opened, copied and shared. */
export function actionHref(action: ExplanationAction): string {
  if (action.kind === 'correction') return routeHash('traces', { t: CORRECTION_TRACE });
  if (action.kind === 'trace') return routeHash('traces', { t: action.traceId });
  return routeHash('dictionary', { d: action.dictionaryId });
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Split a paragraph so the dictionary's own strings quoted in it (for example the dictionary name
 * "convention") are set in the dictionary's typeface. The wording itself is never changed.
 */
export function splitStrings(text: string, strings: string[] = []): { text: string; isString: boolean }[] {
  const wanted = strings.filter(item => item.length > 0);
  if (!wanted.length) return [{ text, isString: false }];
  const pattern = new RegExp(`(${wanted.map(escapeRegExp).join('|')})`, 'g');
  return text.split(pattern).filter(part => part.length > 0).map(part => ({ text: part, isString: wanted.includes(part) }));
}

function Paragraph({ text, strings }: { text: string; strings?: string[] }) {
  const parts: ReactNode[] = splitStrings(text, strings).map((part, index) =>
    part.isString ? <span key={index} className="vd-string ideas-term">{part.text}</span> : part.text);
  return <p>{parts}</p>;
}

export default function IdeasPage() {
  return <div className="page ideas-page">
    <div className="ideas-column">
      <h1 id="page-title" tabIndex={-1} className="page-title">Ideas</h1>
      <p className="vd-voice page-lead">Five ideas the dictionary rests on. Each is taken from a note in VD-docs at a fixed commit.</p>
      {ideas.map(idea => <section key={idea.id} className="ideas-idea" aria-labelledby={`idea-${idea.id}`}>
        <h2 id={`idea-${idea.id}`} className="ideas-title">{idea.title}</h2>
        <div className="vd-voice ideas-prose">{idea.paragraphs.map(text => <Paragraph key={text} text={text} strings={idea.strings}/>)}</div>
        <p className="ideas-source">
          <span className="ideas-source-label">Source:</span>{' '}
          <a href={idea.source.url} target="_blank" rel="noreferrer">{idea.source.title} (VD-docs)<span className="sr-only"> (opens in a new tab)</span></a>
        </p>
        {idea.action && <p className="ideas-action"><a href={actionHref(idea.action)}>{idea.action.label}</a></p>}
      </section>)}
    </div>
  </div>;
}
