import type { Dictionary, Entry } from './data/dictionaries';
import type { PreparedTrace } from './data/traces';
import { edgeId, traceGraphState } from './traceGraph';
import { referencePath } from './graphGeometry';

interface Props { dictionary: Dictionary; selected: Entry; trace?: PreparedTrace; stepIndex: number; onSelect: (id: string) => void }

export default function Graph({ dictionary, selected, trace, stepIndex, onSelect }: Props) {
  const history = traceGraphState(trace, stepIndex);
  const step = trace?.steps[stepIndex];
  const large = dictionary.entries.length > 10;
  const visibleIds = new Set(trace ? trace.steps.flatMap(item => item.relatedEntryIds) :
    [selected.id, ...selected.references, ...dictionary.entries.filter(item => item.references.includes(selected.id)).map(item => item.id)]);
  visibleIds.add(selected.id);
  const entries = large ? dictionary.entries.filter(item => visibleIds.has(item.id)) : dictionary.entries;
  const columns = entries.length > 9 ? 4 : 3;
  const rows = Math.ceil(entries.length / columns);
  const hasOccurrences = !!trace?.occurrences?.length;
  const nodes = entries.map((entry, index) => ({
    ...entry,
    x: large ? entries.length === 1 ? 50 : entries.length === 2 ? 25 + index * 50 : 14 + (index % columns) * (72 / (columns - 1)) : entry.x,
    y: large ? entries.length <= 3 ? 43 : 16 + Math.floor(index / columns) * ((hasOccurrences ? 42 : 66) / Math.max(1, rows - 1)) : entry.y,
  }));
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const edges = nodes.flatMap(source => source.references.filter(id => nodeMap.has(id)).map(id => ({ source, target: nodeMap.get(id)! })))
    .sort((a, b) => Number(history.traversed.has(edgeId(a.source.id, a.target.id))) - Number(history.traversed.has(edgeId(b.source.id, b.target.id))));
  const totalEdges = dictionary.entries.reduce((total, entry) => total + entry.references.length, 0);

  return <div className="graph-card">
    <div className="graph-heading"><div><p className="eyebrow">DICTIONARY NETWORK</p><h2>{large ? trace ? 'Trace network' : 'Entry neighborhood' : 'Reference map'}</h2></div><span>{large ? nodes.length + ' / ' + dictionary.entries.length + ' headwords' : totalEdges + ' connections'}</span></div>
    <div className="graph-scroll" tabIndex={large ? 0 : undefined} aria-label={large ? 'Scrollable network' : undefined}>
      <div className={'graph-canvas' + (large ? ' graph-large' : '')} style={large ? { minWidth: columns === 4 ? 850 : 640, height: hasOccurrences ? 550 : Math.max(400, rows * 145) } : undefined} role="group" aria-label={dictionary.name + ' reference map'}>
        <svg className="connections" viewBox="0 0 1000 660" preserveAspectRatio="none" aria-hidden="true">
          <defs>{[['edge-arrow', '#92a8c5'], ['traversed-arrow', '#baf369']].map(([id, color]) => <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 1 1 L 9 5 L 1 9 z" style={{ fill: color }}/></marker>)}</defs>
          {edges.map(({source, target}) => {
            const traversed = history.traversed.has(edgeId(source.id, target.id));
            const classes = [traversed ? 'traversed' : '', source.id === selected.id || target.id === selected.id ? 'connected' : ''].join(' ');
            const x1 = source.x * 10, y1 = source.y * 6.6, x2 = target.x * 10, y2 = target.y * 6.6;
            return source.id === target.id ? <path key={edgeId(source.id, target.id)} className={classes} d={'M ' + (x1 - 30) + ' ' + (y1 - 25) + ' C ' + (x1 - 110) + ' ' + (y1 - 120) + ', ' + (x1 + 110) + ' ' + (y1 - 120) + ', ' + (x1 + 30) + ' ' + (y1 - 25)}/> :
              <path key={edgeId(source.id, target.id)} className={classes} d={referencePath({ x: x1, y: y1 }, { x: x2, y: y2 }, target.references.includes(source.id)).path} markerMid={traversed ? 'url(#traversed-arrow)' : 'url(#edge-arrow)'}/>;
          })}
          {history.occurrences.map((occurrence, index) => {
            const parent = nodeMap.get(occurrence.parentEntryId);
            if (!parent) return null;
            const endX = history.occurrences.length === 1 ? 270 : 270 + index * 460;
            return <line key={occurrence.id} className={'occurrence-edge ' + (occurrence.flattened ? 'flattened-edge' : '')} x1={parent.x * 10} y1={parent.y * 6.6} x2={endX} y2={570}/>;
          })}
        </svg>
        {nodes.map(entry => <button key={entry.id} className={['graph-node', entry.id === selected.id ? 'selected' : '', step?.relatedEntryIds.includes(entry.id) ? 'in-trace' : '', entry.id === history.startEntryId ? 'start-node' : ''].join(' ')} style={{left: entry.x + '%', top: entry.y + '%'}} onClick={() => onSelect(entry.id)} aria-pressed={entry.id === selected.id} aria-label={entry.id + (entry.id === history.startEntryId ? ', trace start' : '')}>
          {entry.id === history.startEntryId && <span className="start-badge">START</span>}
          <span className="node-id">{entry.alternatives?.length ? (entry.alternatives.length + 1) + ' definitions' : entry.sourceId}{step?.relatedEntryIds.includes(entry.id) && <span className="trace-node-mark" aria-hidden="true"/>}</span><span>{entry.id}</span>
        </button>)}
        {history.occurrences.map((occurrence, index) => <button key={occurrence.id} className={'graph-node occurrence-node ' + (occurrence.flattened ? 'flattened-node' : '')} style={{left: (27 + index * 46) + '%', top: '86.4%'}} onClick={() => onSelect(occurrence.entryId)} aria-label={occurrence.entryId + ', ' + occurrence.label + (occurrence.flattened ? ', flattened occurrence' : ', open occurrence')}><span className="node-id">{occurrence.flattened ? 'FLATTENED' : 'OPEN LABEL'}</span><span>{occurrence.entryId}</span><span className="occurrence-caption">{occurrence.label}</span></button>)}
      </div>
    </div>
    <div className="graph-footer"><span><i className="legend-mark selected"/> Selected</span>{trace && <><span><i className="legend-mark start"/> Start</span><span><i className="legend-line traversed"/> Traversed</span>{hasOccurrences && <span><i className="legend-mark flattened"/> Flattened occurrence</span>}</>}<span><i className="legend-line"/> Reference</span></div>
    {large && <p className="map-note">{trace ? 'Shows the headwords in this trace and your selected entry.' : 'Select any entry to explore its immediate references.'} Scroll the network to see more.</p>}
  </div>;
}
