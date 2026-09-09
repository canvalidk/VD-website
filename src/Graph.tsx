import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent } from 'react';
import type { Dictionary, Entry } from './data/dictionaries';
import type { PreparedTrace } from './data/traces';
import type { Action } from './player';
import { referencePath } from './graphGeometry';
import { createGraphScene, fitCamera, keepTraceVisible } from './graphScene';
import type { Camera, GraphView } from './graphScene';

interface Props { dictionary: Dictionary; selected: Entry; trace?: PreparedTrace; stepIndex: number; playing: boolean; onSelect: (id: string) => void; onPlayback: (action: Action) => void }

export default function Graph({ dictionary, selected, trace, stepIndex, playing, onSelect, onPlayback }: Props) {
  const [view, setView] = useState<GraphView>('focused');
  const [follow, setFollow] = useState(true);
  const [viewport, setViewport] = useState({ width: 640, height: 450 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; camera: Camera } | null>(null);
  const scene = useMemo(() => createGraphScene(dictionary, selected.id, trace, stepIndex, view), [dictionary, selected.id, trace, stepIndex, view]);
  const step = trace?.steps[stepIndex];
  const layoutKey = [dictionary.id, view, trace?.id, ...scene.nodes.map(node => node.id)].join('|');
  const { width, height } = scene.bounds;
  const focus = scene.focusBounds;

  useLayoutEffect(() => {
    const element = viewportRef.current!;
    const measure = () => setViewport({ width: element.clientWidth, height: element.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    setCamera(fitCamera({ x: 0, y: 0, width, height }, viewport));
  }, [layoutKey, width, height, viewport]);

  useLayoutEffect(() => {
    if (!trace || follow) setCamera(previous => keepTraceVisible(previous, focus, viewport));
  }, [trace, stepIndex, follow, layoutKey, focus.x, focus.y, focus.width, focus.height, viewport]);

  function zoom(factor: number) {
    setCamera(previous => {
      const scale = Math.max(.1, Math.min(2.5, previous.scale * factor));
      return { scale, x: viewport.width / 2 - (viewport.width / 2 - previous.x) * scale / previous.scale,
        y: viewport.height / 2 - (viewport.height / 2 - previous.y) * scale / previous.scale };
    });
  }
  function beginPan(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    drag.current = { x: event.clientX, y: event.clientY, camera };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function pan(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    setCamera({ ...drag.current.camera, x: drag.current.camera.x + event.clientX - drag.current.x, y: drag.current.camera.y + event.clientY - drag.current.y });
  }
  function endPan() { drag.current = null; setDragging(false); }

  return <div className="graph-card">
    <div className="graph-heading"><div><p className="eyebrow">DICTIONARY NETWORK</p><h2>{view === 'full' ? 'The full dictionary' : trace ? 'Trace network' : 'Entry neighborhood'}</h2></div><span>{dictionary.definitionCount ?? dictionary.entries.length} entries · {dictionary.entries.length} headwords</span></div>
    <div className="graph-tools">
      <div className="graph-view-picker" role="group" aria-label="Network view"><button aria-pressed={view === 'focused'} onClick={() => setView('focused')}>Focused view</button><button aria-pressed={view === 'full'} onClick={() => setView('full')}>Full dictionary</button></div>
      <div className="graph-camera-controls"><button onClick={() => setCamera(fitCamera(scene.bounds, viewport))}>Fit all</button><button aria-label="Zoom out" disabled={camera.scale <= .1} onClick={() => zoom(1 / 1.25)}>−</button><output aria-label="Zoom level">{Math.round(camera.scale * 100)}%</output><button aria-label="Zoom in" disabled={camera.scale >= 2.5} onClick={() => zoom(1.25)}>+</button></div>
      {trace && <label className="graph-follow"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)}/> Follow trace</label>}
    </div>
    <div className={'graph-viewport' + (dragging ? ' is-dragging' : '')} ref={viewportRef} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan} role="group" aria-label={dictionary.name + ' reference map. Drag the background to pan; use zoom and Fit all to change the view.'}>
      <div className="graph-world" style={{ width, height, transform: 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.scale + ')' }}>
        <svg className="connections" viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
          <defs>{[['edge-arrow', '#92a8c5'], ['traversed-arrow', '#baf369'], ['input-arrow', '#77def1']].map(([id, color]) => <marker key={id} id={id} viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M 1 1 L 9 5 L 1 9 z" style={{ fill: color }}/></marker>)}</defs>
          {scene.edges.map(edge => {
            const { source, target } = edge;
            const classes = [edge.traversed ? 'traversed' : '', edge.bound ? 'input-edge' : '', edge.current || edge.currentInput ? 'current-edge' : '', source.id === selected.id || target.id === selected.id ? 'connected' : ''].join(' ');
            return source.id === target.id ? <path key={edge.id} className={classes} d={'M ' + (source.x - 30) + ' ' + (source.y - 25) + ' C ' + (source.x - 110) + ' ' + (source.y - 120) + ', ' + (source.x + 110) + ' ' + (source.y - 120) + ', ' + (source.x + 30) + ' ' + (source.y - 25)}/> :
              <path key={edge.id} className={classes} d={referencePath(source, target, !!target.entry?.references.includes(source.id)).path} markerMid={'url(#' + (edge.bound ? 'input' : edge.traversed ? 'traversed' : 'edge') + '-arrow)'}/>;
          })}
          {scene.occurrences.filter(node => node.visible).map(node => {
            const occurrence = scene.history.occurrences.find(item => item.id === node.id)!;
            const parent = scene.nodes.find(item => item.id === occurrence.parentEntryId)!;
            return <line key={node.id} className={'occurrence-edge ' + (node.flattened ? 'flattened-edge' : '')} x1={parent.x} y1={parent.y} x2={node.x} y2={node.y}/>;
          })}
        </svg>
        {[...scene.nodes, ...scene.occurrences.filter(node => node.visible)].map(node => <button key={node.id}
          className={['graph-node', !node.occurrence && node.id === selected.id ? 'selected' : '', node.active ? 'in-trace' : '', node.start ? 'start-node' : '', node.occurrence ? 'occurrence-node' : '', node.flattened ? 'flattened-node' : '', node.given ? 'given-node' : ''].join(' ')}
          style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onClick={() => onSelect(node.entryId)}
          onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setCamera(previous => keepTraceVisible(previous, { x: node.x - node.width / 2, y: node.y - node.height / 2 - 24, width: node.width, height: node.height + 24 }, viewport)); }}
          aria-pressed={!node.occurrence && node.id === selected.id} aria-label={node.label + (node.start ? ', trace start' : '') + (node.occurrence ? ', ' + node.caption + (node.flattened ? ', flattened occurrence' : ', open occurrence') : '') + (node.given ? ', given input: ' + node.given : '')}>
          {node.start && <span className="start-badge">START</span>}
          {node.active && <span key={step?.id} className="node-step-pulse" aria-hidden="true"/>}
          <span className="node-id">{node.occurrence ? node.flattened ? 'FLATTENED' : 'OPEN LABEL' : node.caption}{node.active && <span className="trace-node-mark" aria-hidden="true"/>}</span><span>{node.label}</span>
          {node.occurrence && <span className="occurrence-caption">{node.caption}</span>}{node.given && <span className="node-given">Given: {node.given}</span>}
        </button>)}
      </div>
    </div>
    {trace && step && <div className="graph-playback"><div role="group" aria-label="Network trace playback"><button aria-label="Previous trace step" disabled={stepIndex === 0} onClick={() => onPlayback({ type: 'seek', index: stepIndex - 1 })}>←</button><button className="graph-play" onClick={() => onPlayback({ type: 'toggle' })}>{playing ? 'Pause' : stepIndex === trace.steps.length - 1 ? 'Replay' : 'Play'}</button><button aria-label="Next trace step" disabled={stepIndex === trace.steps.length - 1} onClick={() => onPlayback({ type: 'seek', index: stepIndex + 1 })}>→</button></div><p aria-live="polite"><span>{stepIndex + 1} / {trace.steps.length} · {step.operation}</span>{step.title}</p></div>}
    <div className="graph-footer"><span><i className="legend-mark selected"/> Selected</span>{trace && <><span><i className="legend-mark start"/> Start</span><span><i className="legend-line traversed"/> Traversed</span>{trace.steps.some(item => item.boundInputs?.length) && <span><i className="legend-line given"/> Given input</span>}{!!trace.occurrences?.length && <span><i className="legend-mark flattened"/> Flattened occurrence</span>}</>}<span><i className="legend-line"/> Reference</span></div>
    <p className="map-note">{view === 'full' ? 'All headwords are shown. Select one to read every definition.' : scene.nodes.length + ' of ' + dictionary.entries.length + ' headwords shown. Switch to Full dictionary to see them all.'} Drag to pan or zoom for detail.{trace && ' Follow trace keeps the start, highlighted connections and flattened occurrences in view as you step.'}</p>
  </div>;
}
