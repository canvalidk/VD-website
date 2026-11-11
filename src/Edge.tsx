import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react';
import type { Dictionary } from './data/dictionaries';
import { EDGE_HEIGHT, edgeFit, edgeHit, edgeLength, edgeModel, edgePositions, EDGE_SIZES } from './edgeModel';
import type { EdgeKind } from './edgeModel';

/**
 * The Edge: the dictionary seen side-on as its own append log, one stroke per entry in the order added.
 * Shown on the Dictionary and Traces pages, under the "According to" line.
 *
 * Stroke height and colour carry the role (groundwork short and grey, a headword defined again
 * medium and blue, the law full height and crimson). Entries not written yet follow the end as
 * dashed outlines. A selected entry gets an ink cap and its id; a selected headword's strokes are
 * joined by an ink bracket under the band; a selected law's strokes stay lit while the rest go pale;
 * a trace leaves a highlighter band under the entries it has visited and caps the current ones.
 *
 * One tab stop: a listbox whose active option moves with Left, Right, Home and End; Enter selects.
 */
export interface EdgeProps {
  dictionary: Dictionary;
  /** The selected headword; all of its entries are marked and joined by a bracket. */
  selectedHeadword?: string;
  /** One selected entry; it gets the ink cap. */
  selectedSourceId?: string | null;
  /** A selected law (index into dictionary.houses); its six strokes light. */
  selectedLaw?: number | null;
  /** Headwords a trace has visited so far, and the ones in the current step. */
  visitedHeadwords?: string[];
  currentHeadwords?: string[];
  onSelect?: (headword: string, sourceId: string) => void;
}

// Vertical geometry of the drawing, in px. Strokes stand on BASE.
const BASE = 48;
const HEIGHT = 80;
const CAP = 3, CAP_GAP = 2, LABEL_BASELINE = 12;
const NOTE_KEY = 'vd-edge-note-hidden';

const readHidden = () => { try { return window.sessionStorage.getItem(NOTE_KEY) === '1'; } catch { return false; } };
const writeHidden = (hidden: boolean) => { try { window.sessionStorage.setItem(NOTE_KEY, hidden ? '1' : '0'); } catch { /* storage unavailable */ } };

type Hover = { kind: 'stroke' | 'placeholder'; index: number };

export default function Edge({ dictionary, selectedHeadword, selectedSourceId = null, selectedLaw = null, visitedHeadwords, currentHeadwords, onSelect }: EdgeProps) {
  const uid = useId();
  const model = useMemo(() => edgeModel(dictionary), [dictionary]);
  const { strokes, placeholders } = model;

  // Fit to the width available: measured, never stretched, never wider than the page.
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => setWidth(stage.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [strokes.length > 0]);
  const size = edgeFit(strokes.length, placeholders.length, width);
  const { xs, placeholderXs, step, length } = edgePositions(strokes.length, placeholders.length, size);
  const scrolls = width !== null && edgeLength(strokes.length, placeholders.length, EDGE_SIZES[EDGE_SIZES.length - 1]) > width;
  const drawWidth = Math.max(length, 40);

  // What is selected, marked, lit and visited.
  const headwordStrokes = strokes.flatMap((stroke, index) => stroke.headword === selectedHeadword ? [index] : []);
  const bySource = selectedSourceId ? strokes.findIndex(stroke => stroke.sourceId === selectedSourceId) : -1;
  const selectedIndex = bySource >= 0 ? bySource : headwordStrokes.length === 1 ? headwordStrokes[0] : -1;
  const house = selectedLaw !== null ? dictionary.houses?.[selectedLaw] : undefined;
  const lawIds = house ? new Set([house.chimney, ...Object.values(house.triplet), ...Object.values(house.walls)].filter((id): id is string => id !== null)) : null;
  const visited = new Set(visitedHeadwords ?? []);
  const current = new Set(currentHeadwords ?? []);

  // The roving active option follows the selection whenever the selection changes.
  const selectionKey = `${dictionary.id}|${selectedHeadword ?? ''}|${selectedSourceId ?? ''}`;
  const fallback = selectedIndex >= 0 ? selectedIndex : headwordStrokes[0] ?? 0;
  const [active, setActive] = useState(fallback);
  const [syncedTo, setSyncedTo] = useState(selectionKey);
  const [hover, setHover] = useState<Hover | null>(null);
  if (syncedTo !== selectionKey) { setSyncedTo(selectionKey); setActive(fallback); setHover(null); }
  const activeIndex = Math.min(active, Math.max(0, strokes.length - 1));

  const [focused, setFocused] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [noteHidden, setNoteHidden] = useState(readHidden);
  const tip: Hover | null = hover ?? (focused && keyboard && strokes.length ? { kind: 'stroke', index: activeIndex } : null);

  // Place the tooltip slip under its stroke, kept inside the stage.
  const tipRef = useRef<HTMLDivElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const tipX = tip ? (tip.kind === 'stroke' ? xs[tip.index] : placeholderXs[tip.index]) + size.stroke / 2 : 0;
  useLayoutEffect(() => {
    const slip = tipRef.current, stage = stageRef.current;
    if (!slip || !stage) return;
    const scroll = bandRef.current?.scrollLeft ?? 0;
    const room = stage.clientWidth, own = slip.offsetWidth;
    slip.style.left = `${Math.max(0, Math.min(room - own, tipX - scroll - own / 2))}px`;
  });

  if (!strokes.length && !placeholders.length) return null;

  const select = (index: number) => { const stroke = strokes[index]; if (stroke) onSelect?.(stroke.headword, stroke.sourceId); };
  const hitAt = (event: PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>) => {
    const svg = event.currentTarget.querySelector('svg');
    if (!svg) return null;
    return edgeHit(event.clientX - svg.getBoundingClientRect().left, strokes.length, placeholders.length, size);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = strokes.length - 1;
    const move = (index: number) => { event.preventDefault(); setHover(null); setKeyboard(true); setActive(Math.max(0, Math.min(last, index))); };
    switch (event.key) {
      case 'ArrowLeft': move(activeIndex - 1); break;
      case 'ArrowRight': move(activeIndex + 1); break;
      case 'Home': move(0); break;
      case 'End': move(last); break;
      case 'Enter': case ' ': event.preventDefault(); select(activeIndex); break;
    }
  };

  const kindClass = (kind: EdgeKind, pale: boolean) => `edge-stroke edge-stroke--${kind}${pale ? ' is-pale' : ''}`;
  const top = (kind: EdgeKind) => BASE - EDGE_HEIGHT[kind];
  const capped = strokes.flatMap((stroke, index) => index === selectedIndex || current.has(stroke.headword) ? [index] : []);
  const marked = headwordStrokes.map(index => xs[index] + size.stroke / 2);
  // The selected id sits over its stroke, flush with the stroke at either end of the Edge.
  const labelAt = (index: number): { x: number; anchor: 'start' | 'middle' | 'end' } => { const centre = xs[index] + size.stroke / 2; return centre < 24 ? { x: xs[index], anchor: 'start' } : centre > drawWidth - 24 ? { x: xs[index] + size.stroke, anchor: 'end' } : { x: centre, anchor: 'middle' }; };
  const optionId = (index: number) => `${uid}-option-${index}`;
  const captionId = `${uid}-caption`, helpId = `${uid}-help`;
  const tipStroke = tip?.kind === 'stroke' ? strokes[tip.index] : undefined;
  const tipPlaceholder = tip?.kind === 'placeholder' ? placeholders[tip.index] : undefined;
  const hideNote = (hidden: boolean) => { setNoteHidden(hidden); writeHidden(hidden); };

  return <figure className="edge">
    <div className="edge-stage" ref={stageRef}>
      <div
        ref={bandRef}
        className={'edge-band' + (scrolls ? ' edge-band--scroll' : '')}
        role="listbox"
        tabIndex={strokes.length ? 0 : -1}
        aria-label={model.listLabel}
        aria-describedby={`${captionId} ${helpId}`}
        aria-orientation="horizontal"
        aria-activedescendant={strokes.length ? optionId(activeIndex) : undefined}
        onKeyDown={onKeyDown}
        onFocus={event => { setFocused(true); setKeyboard(event.currentTarget.matches(':focus-visible')); }}
        onBlur={() => { setFocused(false); setKeyboard(false); setHover(null); }}
        onPointerMove={event => {
          const hit = hitAt(event);
          if (hit?.kind !== hover?.kind || hit?.index !== hover?.index) setHover(hit);
          if (hit?.kind === 'stroke' && hit.index !== activeIndex) setActive(hit.index);
        }}
        onPointerLeave={event => { if (event.pointerType === 'mouse') setHover(null); }}
        onClick={event => {
          const hit = hitAt(event);
          if (!hit) return;
          setKeyboard(false);
          setHover(hit);
          if (hit.kind === 'stroke') { setActive(hit.index); select(hit.index); }
        }}
      >
        <svg className="edge-drawing" width={drawWidth} height={HEIGHT} viewBox={`0 0 ${drawWidth} ${HEIGHT}`} aria-hidden="true" focusable="false">
          {/* Where the trace has been: a highlighter band at the base, under the strokes. */}
          {strokes.map((stroke, index) => visited.has(stroke.headword) &&
            <rect key={`band-${index}`} className="edge-visited" x={xs[index] - size.gap / 2} y={BASE - 2} width={step} height={6}/>)}

          {strokes.map((stroke, index) => <rect key={stroke.sourceId} className={kindClass(stroke.kind, !!lawIds && !lawIds.has(stroke.sourceId))}
            x={xs[index]} y={top(stroke.kind)} width={size.stroke} height={EDGE_HEIGHT[stroke.kind]}/>)}

          {/* Not written yet: dashed outlines at the height the role would have, set apart after the end. */}
          {placeholders.map((placeholder, index) => <rect key={`${placeholder.house}-${placeholder.role}-${placeholder.headword}`}
            className={'edge-unwritten' + (lawIds && placeholder.house !== selectedLaw ? ' is-pale' : '')}
            x={placeholderXs[index] + 0.75} y={top(placeholder.kind) + 0.75} width={size.stroke - 1.5} height={EDGE_HEIGHT[placeholder.kind] - 1.5}/>)}

          {/* Ink caps: the selected entry, and the entries of the current trace step. */}
          {capped.map(index => <rect key={`cap-${index}`} className="edge-cap" x={xs[index]} y={top(strokes[index].kind) - CAP_GAP - CAP} width={size.stroke} height={CAP}/>)}
          {selectedIndex >= 0 && <g className="edge-selected">
            <text className="edge-id vd-string" x={labelAt(selectedIndex).x} y={LABEL_BASELINE}
              textAnchor={labelAt(selectedIndex).anchor}>{strokes[selectedIndex].sourceId}</text>
            {top(strokes[selectedIndex].kind) - CAP_GAP - CAP > LABEL_BASELINE + 4 && <line className="edge-leader"
              x1={xs[selectedIndex] + size.stroke / 2} x2={xs[selectedIndex] + size.stroke / 2} y1={LABEL_BASELINE + 3} y2={top(strokes[selectedIndex].kind) - CAP_GAP - CAP}/>}
          </g>}

          {/* The selected headword: every one of its entries, joined by a bracket under the band. */}
          {marked.length > 0 && <g className="edge-bracket">
            {marked.map(x => <line key={x} x1={x} x2={x} y1={BASE + 6} y2={BASE + 12}/>)}
            {marked.length > 1 && <line x1={marked[0] - 0.75} x2={marked.at(-1)! + 0.75} y1={BASE + 12} y2={BASE + 12}/>}
          </g>}

          {/* The keyboard's place, while the band has focus. */}
          {focused && keyboard && !hover && strokes.length > 0 && <rect className="edge-cursor" x={xs[activeIndex] - 2} y={top(strokes[activeIndex].kind) - 2} width={size.stroke + 4} height={EDGE_HEIGHT[strokes[activeIndex].kind] + 4}/>}

          {/* The first and newest ids. */}
          {model.first && <text className="edge-end vd-string" x={0} y={BASE + 27} textAnchor="start">{model.first}</text>}
          {model.newest && strokes.length > 1 && <text className="edge-end vd-string" x={xs[strokes.length - 1] + size.stroke} y={BASE + 27} textAnchor="end">{model.newest}</text>}
        </svg>
        {strokes.map((stroke, index) => <div key={stroke.sourceId} id={optionId(index)} role="option" className="edge-option"
          aria-selected={index === selectedIndex} aria-label={stroke.label}
          style={{ left: xs[index] - size.gap / 2, width: step }}/>)}
      </div>

      {(tipStroke || tipPlaceholder) && <div ref={tipRef} className="edge-tip" aria-hidden="true">
        {tipStroke && <>
          <span className="edge-tip-id vd-string">{tipStroke.sourceId}</span>
          <span className="edge-tip-headword vd-string">{tipStroke.headword}</span>
          {tipStroke.roleText && <span className="edge-tip-role vd-label">{tipStroke.roleText}</span>}
        </>}
        {tipPlaceholder && <>
          <span className="edge-tip-role vd-label">not written yet</span>
          <span className="edge-tip-headword vd-string">{tipPlaceholder.headword}</span>
          <span className="edge-tip-role vd-label">{tipPlaceholder.roleText}</span>
        </>}
      </div>}
    </div>

    <figcaption className="edge-caption">
      <span id={captionId} className={noteHidden ? 'sr-only' : 'vd-label edge-caption-text'}>
        {model.caption}{model.placeholderNote ? ` ${model.placeholderNote}` : ''}
      </span>
      <span id={helpId} className="sr-only">Use the left and right arrow keys to move between entries, Home and End to jump to either end, and Enter to select one.{placeholders.length ? ` After the newest entry: ${placeholders.map(item => item.label).join('; ')}.` : ''}</span>
      <button type="button" className="vd-link-button edge-caption-toggle" aria-expanded={!noteHidden} onClick={() => hideNote(!noteHidden)}>
        {noteHidden ? 'What is this band?' : 'Hide this note'}
      </button>
    </figcaption>
  </figure>;
}
