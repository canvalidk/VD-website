import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import type { Dictionary, Entry } from './data/dictionaries';
import type { PreparedTrace } from './data/traces';
import type { Action } from './player';
import { boxExit, hyphenLines, railPair, referencePath } from './graphGeometry';
import type { Point } from './graphGeometry';
import { createGraphScene, fitCamera, keepTraceVisible, openingCamera } from './graphScene';
import type { Camera, GraphView, SceneNode } from './graphScene';
import { createLawScene } from './lawScene';
import { dictionaryName, traceTitle } from './pages/format';

interface Props {
  dictionary: Dictionary; selected: Entry; selectedSourceId: string | null; trace?: PreparedTrace; stepIndex: number; playing: boolean;
  onSelect: (id: string, sourceId?: string) => void; onPlayback: (action: Action) => void;
  /** Show the network's own Back, Play and Next strip under the panel while a trace is open. Defaults to true. */
  showPlayback?: boolean;
  /** Controlled follow-trace setting. When given, the page owns the checkbox and the toolbar does not draw one. */
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
  /** Drawn directly under the panel, before the legend: the Traces page puts its playback bar here. */
  controls?: ReactNode;
}

/** Rail spacing, centre to centre, and the radius of a given input's open circle. Mirrors --rail-gap in theme.css. */
const RAIL_GAP = 5, GIVEN_RADIUS = 4.5;
/** The site writes "E21, self-label", never with a middle dot. */
const commas = (text: string) => text.split(' · ').join(', ');

export default function Graph({ dictionary, selected, selectedSourceId, trace, stepIndex, playing, onSelect, onPlayback, showPlayback = true, follow: followProp, onFollowChange, controls }: Props) {
  // null means automatic: law structure where the dictionary has laws, the trace's own network while a trace is open.
  const [chosenView, setChosenView] = useState<GraphView | null>(null);
  const [ownFollow, setOwnFollow] = useState(true);
  const follow = followProp ?? ownFollow;
  const setFollow = (value: boolean) => { if (onFollowChange) onFollowChange(value); else setOwnFollow(value); };
  const [viewport, setViewport] = useState({ width: 640, height: 450 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; camera: Camera } | null>(null);
  // Marker ids must be unique in the document; useId's own characters are not safe inside url(#...).
  const uid = 'net' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const hasLaws = !!dictionary.houses?.length && !!dictionary.structure;
  const view: GraphView = chosenView && (chosenView !== 'structure' || hasLaws) ? chosenView : trace ? 'focused' : hasLaws ? 'structure' : 'focused';
  const structured = view === 'structure';
  const scene = useMemo(() => structured ? createLawScene(dictionary, selected.id, selectedSourceId, trace, stepIndex) : createGraphScene(dictionary, selected.id, trace, stepIndex, view),
    [dictionary, selected.id, selectedSourceId, trace, stepIndex, view, structured]);
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
    const bounds = { x: 0, y: 0, width, height };
    setCamera(structured ? openingCamera(bounds, viewport) : fitCamera(bounds, viewport));
  }, [layoutKey, width, height, viewport, structured]);

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

  const marker = (name: 'ref' | 'ink' | 'trace') => `url(#${uid}-${name})`;
  // Selection keeps the selected entry's houses at full weight; links of the other houses step back.
  const anyHouseSelected = scene.houseLinks.some(link => link.connected);
  const placeholderAt = (point: Point) => scene.placeholders.find(slot => slot.x === point.x && slot.y === point.y);
  // Trace overlay: one list for both scenes. Headword views put trace state on edges, the law structure on separate links.
  const overlay = [
    ...scene.edges.filter(edge => edge.traversed || edge.bound).map(edge => ({ id: edge.id, source: edge.source as Point, target: edge.target as Point,
      box: { width: edge.target.width, height: edge.target.height }, reciprocal: edge.reciprocal, bound: edge.bound, traversed: edge.traversed, current: edge.bound ? edge.currentInput : edge.current, loop: edge.source.id === edge.target.id })),
    ...scene.links.map(link => ({ id: link.id, source: link.source, target: link.target, box: link.targetBox, reciprocal: false, bound: link.bound, traversed: link.traversed,
      current: link.bound ? link.currentInput : link.current, loop: false })),
  ];
  const loopPath = (node: Point) => `M ${node.x - 30} ${node.y - 25} C ${node.x - 110} ${node.y - 120}, ${node.x + 110} ${node.y - 120}, ${node.x + 30} ${node.y - 25}`;
  const overlayPath = (item: typeof overlay[number]) => item.loop ? loopPath(item.source) : referencePath(item.source, item.target, item.reciprocal).path;
  const traced = overlay.filter(item => item.traversed && !item.bound);
  const given = overlay.filter(item => item.bound);
  const hasGiven = !!trace?.steps.some(item => item.boundInputs?.length);
  const visibleOccurrences = scene.occurrences.filter(node => node.visible);

  const heading = structured ? 'Laws and groundwork' : view === 'full' ? 'The full dictionary' : trace ? 'Trace network' : 'Entry neighbourhood';
  const nodeLabel = (node: SceneNode) => node.label + (node.sourceId ? ', entry ' + node.caption : '') + (node.roles ? ', ' + node.roles : '') + (node.start ? ', trace start' : '')
    + (node.active && trace ? `, step ${stepIndex + 1}` : node.visited ? ', visited by the trace' : '')
    + (node.occurrence ? ', ' + commas(node.caption) + (node.flattened ? ', flattened occurrence' : ', open occurrence') : '') + (node.given ? ', given input: ' + node.given : '');
  const legend: { sample: ReactNode; text: string }[] = [
    ...(structured ? [
      { sample: <line x1="2" y1="8" x2="34" y2="8" className="net-roof"/>, text: 'Roof: the three law entries refer to each other.' },
      { sample: <>{railPair({ x: 2, y: 8 }, { x: 34, y: 8 }, RAIL_GAP).map((rail, index) => <line key={index} {...rail} className="net-rail"/>)}</>, text: 'Double rail: the same headword, defined again.' },
      ...(scene.placeholders.length ? [{ sample: <line x1="2" y1="8" x2="34" y2="8" className="net-unwritten"/>, text: 'Dashed: not written yet.' }] : []),
    ] : []),
    { sample: <path d="M 2 8 L 18 8 L 34 8" className="net-ref" markerMid={marker('ref')}/>, text: 'Thin line: one entry refers to another.' },
    ...(trace ? [{ sample: <><line x1="4" y1="8" x2="32" y2="8" className="net-band"/><line x1="4" y1="8" x2="32" y2="8" className="net-trace"/></>, text: 'Yellow band: where the trace has been.' }] : []),
    ...(trace && hasGiven ? [{ sample: <><line x1="2" y1="8" x2={34 - 2 * GIVEN_RADIUS} y2="8" className="net-given"/><circle cx={34 - GIVEN_RADIUS} cy="8" r={GIVEN_RADIUS - 1} className="net-given-end"/></>, text: 'Teal with a circle: a given input.' }] : []),
  ];
  const note = structured
    ? 'Every entry is one slip. Degrees nest: each degree’s tray sits inside the one before it. The chimney stands above a law and the walls hang below it. Thin lines are other references, drawn to the nearest entry of the headword referred to.'
      + (trace ? ' A recorded trace names headwords, so its path is drawn between the closest entries of each pair.' : '')
    : view === 'full' ? 'All headwords are shown. Select one to read every definition.'
    : `${scene.nodes.length} of ${dictionary.entries.length} headwords are shown. Full dictionary shows them all.`
      + (trace ? ' Follow trace keeps the start, the highlighted connections and any flattened occurrences in view as you step.' : '');

  return <div className={'net' + (trace ? ' net-has-trace' : '')}>
    <h2 className="sr-only">{heading}</h2>
    <div className="net-tools">
      <div className="vd-segmented net-views" role="group" aria-label="Network view">
        {hasLaws && <button className="vd-button" aria-pressed={structured} onClick={() => setChosenView('structure')}>Law structure</button>}
        <button className="vd-button" aria-pressed={view === 'focused'} onClick={() => setChosenView('focused')}>Focused</button>
        <button className="vd-button" aria-pressed={view === 'full'} onClick={() => setChosenView('full')}>Full dictionary</button>
      </div>
      <div className="net-camera" role="group" aria-label="Zoom">
        <button className="vd-button" onClick={() => setCamera(fitCamera(scene.bounds, viewport))}>Fit all</button>
        <button className="vd-button net-zoom-step" aria-label="Zoom out" disabled={camera.scale <= .1} onClick={() => zoom(1 / 1.25)}>&minus;</button>
        <output className="net-zoom-level vd-num" aria-label="Zoom level">{Math.round(camera.scale * 100)}%</output>
        <button className="vd-button net-zoom-step" aria-label="Zoom in" disabled={camera.scale >= 2.5} onClick={() => zoom(1.25)}>+</button>
      </div>
      {trace && followProp === undefined && <label className="net-follow"><input type="checkbox" checked={follow} onChange={event => setFollow(event.target.checked)}/>Follow trace</label>}
    </div>

    <div className={'net-viewport' + (structured ? ' is-structure' : '') + (dragging ? ' is-dragging' : '')} ref={viewportRef} onPointerDown={beginPan} onPointerMove={pan} onPointerUp={endPan} onPointerCancel={endPan} onLostPointerCapture={endPan}
      role="group" aria-label={dictionaryName(dictionary) + (structured ? ' law structure map.' : ' reference map.') + ' Drag the background to pan; use zoom and Fit all to change the view.'}>
      <div className="net-world" style={{ width, height, transform: 'translate(' + camera.x + 'px, ' + camera.y + 'px) scale(' + camera.scale + ')' }}>
        <svg className="net-lines" viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true">
          <defs>
            {(['ref', 'ink', 'trace'] as const).map(name => <marker key={name} id={`${uid}-${name}`} className={`net-marker-${name}`} viewBox="0 0 10 10" refX="5" refY="5" markerUnits="userSpaceOnUse" markerWidth={name === 'ref' ? 9 : 11} markerHeight={name === 'ref' ? 9 : 11} orient="auto"><path d="M 1 1 L 9 5 L 1 9 z"/></marker>)}
          </defs>

          {scene.frames.map(frame => <g key={frame.degree} className={'net-frame net-tray-' + Math.min(frame.degree, 4)}>
            <rect x={frame.x} y={frame.y} width={frame.width} height={frame.height} rx="6"/>
            <text x={frame.x + 16} y={frame.y + 27}><tspan className="net-frame-degree">Degree {frame.degree}</tspan><tspan className="net-frame-note" dx="10">{frame.note}</tspan></text>
          </g>)}
          {scene.houseLabels.map(label => <text key={label.index} className="net-house-label" x={label.x} y={label.y}>
            <tspan className="net-house-law">{label.label}{label.title ? `, ${label.title}` : ''}</tspan>
            {label.anchor && hyphenLines(label.anchor, 18).map((line, index) => <tspan key={index} className="net-house-anchor" x={label.x} dy="17">{line}</tspan>)}
          </text>)}

          {scene.edges.filter(edge => !edge.traversed && !edge.bound).map(edge => {
            const loop = edge.source.id === edge.target.id;
            return <path key={edge.id} className={'net-ref' + (edge.connected ? ' is-connected' : '') + (structured && !edge.connected ? ' is-quiet' : '')}
              d={loop ? loopPath(edge.source) : referencePath(edge.source, edge.target, edge.reciprocal).path} markerMid={loop ? undefined : marker(edge.connected ? 'ink' : 'ref')}/>;
          })}

          {scene.houseLinks.map(link => {
            const dim = anyHouseSelected && !link.connected ? ' is-dim' : '';
            if (link.unwritten) {
              // Stop a link at the border of its unwritten slot: the slot has no fill, so the line must not run inside it.
              const slot = placeholderAt(link.target) ?? placeholderAt(link.source);
              const [from, to] = slot && slot.x === link.source.x && slot.y === link.source.y ? [link.target, link.source] : [link.source, link.target];
              const end = slot ? boxExit(from, to, slot.width / 2, slot.height / 2) : to;
              return <line key={link.id} className={'net-unwritten' + dim} x1={from.x} y1={from.y} x2={end.x} y2={end.y}/>;
            }
            if (link.kind === 'roof') return <line key={link.id} className={'net-roof' + dim} x1={link.source.x} y1={link.source.y} x2={link.target.x} y2={link.target.y}/>;
            return <g key={link.id} className={'net-rails' + dim}>{railPair(link.source, link.target, RAIL_GAP).map((rail, index) => <line key={index} className="net-rail" {...rail}/>)}</g>;
          })}

          {scene.placeholders.map(slot => <rect key={slot.id} className="net-placeholder-frame" x={slot.x - slot.width / 2} y={slot.y - slot.height / 2} width={slot.width} height={slot.height} rx="2"/>)}
          {visibleOccurrences.filter(node => node.parent).map(node => <line key={node.id} className="net-occurrence-line" x1={node.parent!.x} y1={node.parent!.y} x2={node.x} y2={node.y}/>)}

          {/* The highlighter goes down first, under every ink line. */}
          {traced.map(item => <path key={'band-' + item.id} className="net-band" d={overlayPath(item)}/>)}
          {traced.map(item => <path key={item.id} className={'net-trace' + (item.current ? ' is-current' : '')} d={overlayPath(item)} markerMid={item.loop ? undefined : marker('trace')}/>)}
          {given.map(item => {
            const { approach, path } = referencePath(item.source, item.target, item.reciprocal);
            const box = item.box ?? { width: 0, height: 0 };
            const end = boxExit(approach, item.target, box.width / 2, box.height / 2, GIVEN_RADIUS + 1);
            return <g key={item.id} className={'net-given-link' + (item.current ? ' is-current' : '')}>
              <path className="net-given" d={item.loop ? loopPath(item.source) : path}/>
              {!item.loop && <circle className="net-given-end" cx={end.x} cy={end.y} r={GIVEN_RADIUS}/>}
            </g>;
          })}
        </svg>

        {scene.placeholders.map(slot => <div key={slot.id} className="net-placeholder" style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height }}>
          <span className="net-placeholder-text">{slot.role ? `${slot.role === 'wall' ? 'A wall' : 'A chimney'}, not written yet` : 'Not written yet'}</span>
          {slot.headword && <span className="vd-string net-placeholder-word">{slot.headword}</span>}
        </div>)}

        {[...scene.nodes, ...visibleOccurrences].map(node => {
          const current = node.active && !!trace;
          const classes = ['net-slip', node.roleKind ? 'net-role-' + node.roleKind : '', node.selected ? 'is-selected' : '', current ? 'is-current' : node.visited ? 'is-visited' : '',
            node.start ? 'is-start' : '', node.occurrence ? 'is-occurrence' : '', node.flattened ? 'is-flattened' : '', node.given ? 'is-given' : ''].filter(Boolean).join(' ');
          // In the headword views a headword with several definitions shows a count, which is the site's wording, not the dictionary's.
          const countCaption = !node.sourceId && !node.occurrence && !!node.entry?.alternatives?.length;
          return <button key={node.id} className={classes}
            style={{ left: node.x, top: node.y, width: node.width, height: node.height }} onClick={() => onSelect(node.entryId, node.sourceId)} title={node.roles}
            onFocus={event => { if (event.currentTarget.matches(':focus-visible')) setCamera(previous => keepTraceVisible(previous, { x: node.x - node.width / 2, y: node.y - node.height / 2 - 24, width: node.width, height: node.height + 24 }, viewport)); }}
            aria-pressed={node.selected} aria-label={nodeLabel(node)}>
            {node.start && <span className="net-tag net-tag-start" aria-hidden="true">start</span>}
            {current && <span className="net-tag net-tag-step vd-num" aria-hidden="true">step {stepIndex + 1}</span>}
            <span className={'net-slip-id ' + (countCaption ? 'vd-ui' : 'vd-string')}>{node.occurrence ? commas(node.caption) : node.caption}</span>
            <span className="net-slip-word vd-string">{node.label}</span>
            {node.occurrence && <span className="net-slip-state">{node.flattened ? 'flattened' : 'open'}</span>}
            {node.given && <span className="net-tag net-tag-given" aria-hidden="true"><span className="net-tag-given-word">given:</span> <span className="vd-string">{node.given}</span></span>}
          </button>;
        })}
      </div>
    </div>

    {controls}
    {trace && step && showPlayback && <div className="net-playback">
      <div className="net-playback-buttons" role="group" aria-label="Network trace playback">
        <button className="vd-button" disabled={stepIndex === 0} onClick={() => onPlayback({ type: 'seek', index: stepIndex - 1 })}>Back</button>
        <button className="vd-button net-play" onClick={() => onPlayback({ type: 'toggle' })}>{playing ? 'Pause' : stepIndex === trace.steps.length - 1 ? 'Replay' : 'Play'}</button>
        <button className="vd-button" disabled={stepIndex === trace.steps.length - 1} onClick={() => onPlayback({ type: 'seek', index: stepIndex + 1 })}>Next</button>
      </div>
      <p className="net-playback-step"><span className="net-playback-count vd-num">Step {stepIndex + 1} of {trace.steps.length}</span> <span className="net-playback-title">{traceTitle(step.title)}</span></p>
    </div>}

    <ul className="net-legend">
      {legend.map(item => <li key={item.text}><svg className="net-sample" viewBox="0 0 36 16" width="36" height="16" aria-hidden="true">{item.sample}</svg><span>{item.text}</span></li>)}
      {trace && !!scene.occurrences.length && <li><span className="net-sample net-sample-hatch" aria-hidden="true"/><span>Hatched strip: an occurrence that has been flattened. The entry itself is unchanged.</span></li>}
    </ul>
    <p className="net-note">{note}</p>
  </div>;
}
