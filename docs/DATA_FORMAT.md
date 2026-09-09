# Provisional viewer data boundary

This is a small display format for prepared examples, not a serialization of the VD engine's internal state. Its types live with the data in `src/data/`.

## Dictionary

`Dictionary` contains a stable `id`, display names, a concise description, provenance text, and `entries`.

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

`PreparedTrace` has an `id`, `dictionaryId`, title, `kind: 'prepared'`, provenance, and an ordered nonempty `steps` array. IDs are stable; steps are immutable.

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

## Playback state

`src/player.ts` owns selection, current trace, step index, and playing/paused state. Each dictionary remembers a separate session until reload. Selecting an entry pauses playback without moving the step. Switching dictionaries pauses both sessions. Manual seeking also pauses. Replay from the final step starts at the beginning; restart returns to the first step and remains paused.

`App.tsx` supplies the timer, which dispatches the same state transitions used by buttons. There is no global keyboard shortcut to conflict with selects or text navigation. Native buttons and selects remain keyboard accessible. Playback pauses when the document is hidden.

## Future engine adapter

A later producer can turn real engine events into this ordered-step boundary. Before claiming engine provenance, inspect the actual output and extend the format for event identifiers, occurrence/frame identity, authoritative root state, unresolved work, and reduction/recognition provenance as needed. The current format intentionally lacks those guarantees. Do not relabel these prepared arrays as executed traces.

The checks in `tests/player.test.ts` catch dangling references, duplicate IDs, settled fragments containing holes, cross-dictionary selections, playback boundary errors, and lost visitor position.
