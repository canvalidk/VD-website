import { explorerNotes, ideas, lead, status } from './data/explanation';
import type { ExplanationAction } from './data/explanation';

export default function Explanation({ onAction }: { onAction: (action: ExplanationAction) => void }) {
  return <section id="explanation" className="explanation-section" aria-labelledby="explanation-title">
    <p className="eyebrow">01 / EXPLANATION</p>
    <div className="explanation-heading"><div><h1 id="explanation-title">Authority Dictionary</h1><p className="byline">by Can Valid Kohen</p></div><p className="explanation-lead">{lead}</p></div>
    <ol className="explanation-ideas">{ideas.map((idea, index) => <li key={idea.id} className="idea" aria-labelledby={`idea-${idea.id}`}>
      <div className="idea-heading"><span className="part-number">{String(index + 1).padStart(2, '0')}</span><h2 id={`idea-${idea.id}`}>{idea.title}</h2></div>
      <div className="idea-body">
        {idea.paragraphs.map(text => <p key={text}>{text}</p>)}
        <div className="idea-links">
          {idea.action && <button className="idea-action" onClick={() => onAction(idea.action!)}>{idea.action.label} <span aria-hidden="true">↓</span></button>}
          <a className="idea-source" href={idea.source.url} target="_blank" rel="noreferrer">Source note: {idea.source.title}<span aria-hidden="true"> ↗</span><span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </div>
    </li>)}</ol>
    <div className="explorer-notes" aria-label="Using the explorer"><h2>Using the explorer</h2><ul>{explorerNotes.map(text => <li key={text}>{text}</li>)}</ul><p className="status-note">{status}</p></div>
  </section>;
}
