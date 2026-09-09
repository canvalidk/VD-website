# Provisional viewer data boundary

This is a small display format for prepared examples and condensed recorded playback, not a serialization of the VD engine's internal state. Its types live with the data in `src/data/`.

## Dictionary

`Dictionary` contains a stable `id`, display names, a concise description, provenance text, and `entries`. Optional `status` and `definitionCount` distinguish dictionary versions. Each visible entry is one headword. Its first definition is stored directly, and `alternatives` retains additional definitions with their original source IDs and wording. `references` is the union of outgoing headword references across those definitions.

Each `Entry` contains:

| Field | Meaning |
| --- | --- |
| `id` | Headword string; unique within the dictionary |
| `sourceId` | Original entry identifier, including gaps in selected excerpts |
| `definition` | Exact literal source text |
| `references` | Explicit outgoing headword IDs in this excerpt |
| `x`, `y` | Percent positions for the illustrative map; presentation metadata only |

References are explicit. The website does not tokenize arbitrary dictionary text, resolve underscored calls, or infer missing references. Every referenced ID must exist in the same bundled dictionary. A future adapter should handle missing/outside-excerpt references explicitly before passing data to this viewer.

## Prepared trace

`PreparedTrace` has an `id`, `dictionaryId`, title, `kind: 'prepared' | 'recorded'`, provenance, and an ordered nonempty `steps` array. An optional `question` supplies the recorded run's context. The type name remains for compatibility; `kind` determines the visible provenance label. IDs are stable; steps are immutable.

Each `TraceStep` has a stable ID, short title, operation label, description, focus context, `relatedEntryIds`, an active `fragment`, and an optional `settled` flag.

```ts
fragment: [
  { text: '2 kg times ' },
  { entryId: 'acceleration' },
]
```

- A `text` part is literal, inert text. React escapes it. Never interpret it as HTML or automatically parse it into new headword references.
- An `entryId` part is an explicit open reference; it renders as an inspectable button.
- `relatedEntryIds` drives step highlights. Its first entry is selected when seeking to this step.
- `settled` means the displayed active fragment has no open holes. It is not a proof or a claim about all engine state.
- `context` describes the active frame. A step may show only a nested fragment, rather than the full accumulated root expression.
- Operation labels describe the prepared sequence. They are not commands sent to an engine.

## Network history and flattening

`startEntryId` identifies the trace origin and remains independent of the currently selected entry. Legacy prepared examples fall back to their first step's first related entry.

Each step's optional `traversedEdges` is a delta containing only the references actually followed at that stage. The viewer unions these deltas through the current step. Inspection, input injection, and merely exposing a reference do not imply traversal. Seeking backwards recomputes the union and removes later history. Reciprocal reference directions use distinct curved paths and directional midpoint arrows.

Optional trace-level `occurrences` identify self-label nodes separately from headword nodes: `id`, `entryId`, `parentEntryId`, `label`, `appearsAt`, and `flattenedAt`. The last two fields reference step IDs. The occurrence first appears open, then dims and gains a FLATTENED label at its actual flatten event. This does not flatten the dictionary definition or every occurrence of that headword. Recall, reduction, and settlement are not flattening. Earlier playback steps restore the earlier appearance.

For larger dictionaries, the graph shows the trace's headwords or the selected headword's immediate neighborhood; the full list of headwords and all their definitions remain browsable. Source archives retain entry-level occurrence and candidate-definition information that the aggregate headword network does not claim to represent.

## Playback state

`src/player.ts` owns selection, current trace, step index, and playing/paused state. Initial dictionary selection is empty and each session starts with no trace. Dictionaries without a compatible trace remain fully browsable. Clearing the dictionary pauses playback and hides the workspace. Each dictionary remembers a separate session until reload. Selecting an entry pauses playback without moving the step. Switching dictionaries pauses all sessions. Manual seeking also pauses. Replay from the final step starts at the beginning; restart returns to the first step and remains paused.

`App.tsx` supplies the timer, which dispatches the same state transitions used by buttons. There is no global keyboard shortcut to conflict with selects or text navigation. Native buttons and selects remain keyboard accessible. Playback pauses when the document is hidden.

## Future engine adapter

A later producer can turn real engine events into this ordered-step boundary. Before claiming engine provenance, inspect the actual output and extend the format for event identifiers, occurrence/frame identity, authoritative root state, unresolved work, and reduction/recognition provenance as needed. The current format intentionally lacks those guarantees. Do not relabel these prepared arrays as executed traces.

The checks in `tests/player.test.ts` also cover unpicked state, reciprocal path separation, chronological traversal, occurrence-scoped flattening, and preservation of all 71 imported Newton definitions against the checked-in source extracts.
