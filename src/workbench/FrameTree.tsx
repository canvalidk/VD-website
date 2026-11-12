import { childFrames, entryId, frameSegments, frameState, recalledText, suppliedText } from './record.ts';
import type { Frame, Hole, Snapshot } from './record.ts';

/** What is selected in the trace: one hole, or one frame as a whole. */
export type Selection = { kind: 'hole'; frameId: string; position: number } | { kind: 'frame'; frameId: string } | null;

export const frameDomId = (frameId: string) => `wk-frame-${frameId.replace(/\//g, '-')}`;
export const holeDomId = (frameId: string, position: number) => `${frameDomId(frameId)}-hole-${position}`;

/**
 * An entry named as the engine names it (E0, E1, ...), with the source's own id beside it where the
 * dictionary is one of the site's sources and the two differ.
 */
export function EntryName({ index, sourceId }: { index: number; sourceId: (index: number) => string | null }) {
  const own = sourceId(index);
  return <><span className="vd-string wk-entry-name">{entryId(index)}</span>{own && <span className="vd-label"> ({own} in the source)</span>}</>;
}

interface TreeProps {
  snapshot: Snapshot;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  /** The frame the viewed step changed, and that step's number: marked as where the trace has just been. */
  recent: { frameId: string; step: number } | null;
  sourceId: (index: number) => string | null;
}

/**
 * The trace as the engine holds it: the root frame, and under each filled hole the frame it opened.
 * Each frame shows its own wording with its holes in place. Nothing here is computed by the site:
 * holes, their states and their entries all come from the snapshot.
 */
export default function FrameTree({ snapshot, ...props }: TreeProps) {
  const root = snapshot.frames.find(frame => frame.id === 'F');
  if (!root) return null;
  return <div className="wk-tree-scroll">
    <ol className="wk-tree" aria-label="The trace, frame by frame">
      <FrameItem frame={root} snapshot={snapshot} depth={0} {...props}/>
    </ol>
  </div>;
}

function FrameItem({ frame, snapshot, selection, onSelect, recent, sourceId, depth }: TreeProps & { frame: Frame; depth: number }) {
  const parent = frame.parent_id ? snapshot.frames.find(item => item.id === frame.parent_id) : undefined;
  const via = parent && frame.via_position !== null ? parent.holes[frame.via_position] : undefined;
  const frameSelected = selection?.kind === 'frame' && selection.frameId === frame.id;
  const isRecent = recent?.frameId === frame.id;
  const origin = frame.id === 'F' ? 'The question'
    : via?.resolution === 'inject' ? <>Supplied for <span className="vd-string">{via.headword}</span></>
      : <>{frame.source_index !== null ? <EntryName index={frame.source_index} sourceId={sourceId}/> : 'An entry'} for <span className="vd-string">{via?.headword}</span></>;
  const children = childFrames(snapshot, frame);

  return <li className={'wk-frame' + (frame.reduced !== null ? ' is-reduced' : '') + (frameSelected ? ' is-selected' : '') + (depth >= 3 ? ' is-deep' : '')} id={frameDomId(frame.id)}>
    <div className="wk-frame-head">
      <button type="button" className="wk-frame-name" aria-pressed={frameSelected} onClick={() => onSelect(frameSelected ? null : { kind: 'frame', frameId: frame.id })}>
        <span className={'wk-frame-id' + (isRecent ? ' is-recent' : '')}>{frame.id === 'F' ? 'Root' : frame.id}</span>
        <span className="wk-frame-origin">{origin}</span>
      </button>
      <span className="wk-frame-state vd-label">{isRecent ? `changed at step ${recent!.step}; ` : ''}{frameState(frame)}</span>
    </div>
    {frame.reduced !== null && <p className="wk-reduced"><span className="vd-label">reduced to</span> <span className="vd-string">{frame.reduced}</span></p>}
    <p className="wk-wording vd-string">
      {frameSegments(frame).map((segment, i) => segment.kind === 'text'
        ? <span key={i}>{segment.text}</span>
        : <HoleChip key={i} frame={frame} hole={segment.hole} snapshot={snapshot} selection={selection} onSelect={onSelect} sourceId={sourceId}/>)}
    </p>
    {!!children.length && <ol className="wk-children">
      {children.map(child => <FrameItem key={child.id} frame={child} snapshot={snapshot} selection={selection} onSelect={onSelect} recent={recent} sourceId={sourceId} depth={depth + 1}/>)}
    </ol>}
  </li>;
}

interface ChipProps { frame: Frame; hole: Hole; snapshot: Snapshot; selection: Selection; onSelect: (selection: Selection) => void; sourceId: (index: number) => string | null }

/** One hole in a frame's wording. Each state has a word as well as a look; the accessible name starts with the visible text. */
function HoleChip({ frame, hole, snapshot, selection, onSelect }: ChipProps) {
  const selected = selection?.kind === 'hole' && selection.frameId === frame.id && selection.position === hole.position;
  const select = () => onSelect(selected ? null : { kind: 'hole', frameId: frame.id, position: hole.position });
  const common = { type: 'button' as const, id: holeDomId(frame.id, hole.position), 'aria-pressed': selected, onClick: select };
  const entry = hole.source_index !== null ? entryId(hole.source_index) : 'an entry';
  if (hole.resolution === null) {
    const fit = hole.candidates.length === 1 ? 'one entry fits' : `${hole.candidates.length} entries fit`;
    return <button {...common} className="wk-hole is-open" aria-label={`${hole.headword}, open, ${fit}`}>{hole.headword}</button>;
  }
  if (hole.resolution === 'recall') {
    const text = recalledText(snapshot, frame, hole) ?? hole.headword;
    return <button {...common} className="wk-hole is-recall" aria-label={`${text}, recalled from ${entry} for ${hole.headword}`}>
      <span className="wk-hole-word">{text}</span><span className="wk-hole-tag vd-label">recalled</span>
    </button>;
  }
  if (hole.resolution === 'flatten') {
    return <button {...common} className="wk-hole is-flatten" aria-label={`${hole.headword}, left as text`}>
      <span className="wk-hole-word">{hole.headword}</span><span className="wk-hole-tag vd-label">left as text</span>
    </button>;
  }
  if (hole.resolution === 'inject') {
    const supplied = suppliedText(snapshot, frame, hole) ?? hole.headword;
    return <button {...common} className="wk-hole is-inject" aria-label={`${supplied}, supplied for ${hole.headword}`}>
      <span className="wk-hole-word">{supplied}</span><span className="wk-hole-tag vd-label">supplied</span>
    </button>;
  }
  return <button {...common} className="wk-hole is-expand" aria-label={`${hole.headword}, expanded with ${entry} in ${hole.child_frame_id}`}>
    <span className="wk-hole-word">{hole.headword}</span><span className="wk-hole-tag vd-label">in {hole.child_frame_id}</span>
  </button>;
}
