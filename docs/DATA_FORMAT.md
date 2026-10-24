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
| `x`, `y` | Legacy illustrative positions; the current viewer computes its own stable layout |

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

Each step's optional `boundInputs` is a delta of `{ from, to, value }` records for supplied values. The viewer accumulates these separately, draws cyan dashed connections, and adds the value to the target headword node. Binding an input does not imply that its dictionary definition was followed. Rewinding removes later bindings.

Optional trace-level `occurrences` identify self-label nodes separately from headword nodes: `id`, `entryId`, `parentEntryId`, `label`, `appearsAt`, and `flattenedAt`. The last two fields reference step IDs. The occurrence first appears open, then dims and gains a FLATTENED label at its actual flatten event. This does not flatten the dictionary definition or every occurrence of that headword. Recall, reduction, and settlement are not flattening. Earlier playback steps restore the earlier appearance.

Focused view shows the trace's complete participant set or the selected headword's immediate neighborhood. Full dictionary shows all headwords. Both views use identical trace history and occurrence state; changing the view never resets playback. Definitions sharing a headword remain grouped and individually readable in the inspector. Source archives retain entry-level occurrence and candidate-definition information that the aggregate headword network does not claim to represent.

`graphScene.ts` computes stable positions and reserves occurrence slots beside trace participants. Fit all includes the whole scene; zoom and pan allow closer inspection. With Follow trace enabled, every step keeps the starting node, current participants, cumulative traversed/input connection endpoints, visible occurrences, and selected headword inside the viewport. The camera reduces zoom if needed to fit that set. Network-local controls use the same reducer as the detailed player. Reduced-motion preferences suppress movement and pulses while preserving visual state.

## Playback state

`src/player.ts` owns selection, current trace, step index, and playing/paused state. Initial dictionary selection is empty and each session starts with no trace. Dictionaries without a compatible trace remain fully browsable. Clearing the dictionary pauses playback and hides the workspace. Each dictionary remembers a separate session until reload. Selecting an entry pauses playback without moving the step. Switching dictionaries pauses all sessions. Manual seeking also pauses. Replay from the final step starts at the beginning; restart returns to the first step and remains paused.

`App.tsx` supplies the timer, which dispatches the same state transitions used by buttons. There is no global keyboard shortcut to conflict with selects or text navigation. Native buttons and selects remain keyboard accessible. Playback pauses when the document is hidden.

## Recorded root results and partial prediction sets

`TraceStep.predictionSet` optionally carries a VDfirst schema-2 frozen snapshot. It is the authoritative **root** render and is independent of `fragment`, which may be nested. `snapshotLabel` supplies a compact stage name; trace-level `scriptedResponses` distinguishes scripted interpreter responses. Neither field changes the engine evidence.

`src/predictions.ts` describes the consumed subset of the export. Original claim IDs, statements, classifications, verification fields and evidence are retained. Current support uses `current_prediction_ids`; history uses `historical_prediction_ids` only when `dependency_selection_complete` is true. Otherwise excluded claims remain unknown. `coverage_complete` is a different field and stays false in this example.

Evidence dependencies are transitive event indexes. The viewer looks up claims by `event_index` and presents a flat support set. A source definition link is made only from an explicit `before.source_index`, matched to the dictionary's source ID. No dictionary matching is inferred from stimulus strings or categories. Original frame renderings stay inert text.

The correction adapter maps five exported snapshots to five display stages. It is not a general trace-event importer. Existing playbacks have no prediction sets until a producer supplies them; the viewer does not synthesize them from stage descriptions. See [the presentation study](RESULT_PRESENTATION.md).

## Live workbench record

The explicit Workbench section consumes `vd-trace-record` version 1 from the local VDfirst bridge. This is separate from the older prepared-step boundary. `traceRecord.ts` structurally checks imports, then adapts their already supplied frozen prediction snapshots for the result view. It does not generate events, parse prose into holes, or calculate candidate definitions. Frames, addresses, open holes, candidates and instantiated definition wording are all engine output.

Each record carries its exact ordered dictionary entries and digest, original question/context, engine fingerprint, append-only commands/events, stable frame identities, an initial snapshot and one snapshot per successful command, and a full-record digest. Earlier snapshots remain read-only. Importing a file performs bounded structural checks in the browser; it does not validate those digests or replay the commands. Explicit engine validation must succeed before continuation, and the engine validates the supplied record again for every command. No scientific claim gains verified status through consistency validation.

Unknown evidence fields are preserved in the record and its downloaded JSON. Evidence is displayed as escaped text. The importer rejects unsupported versions, bad identities or tree links, inconsistent root renders, invalid support groups, unsupported verification states and files over 8 MiB. Empty dictionaries and literal-only traces are valid. [WORKBENCH.md](WORKBENCH.md) gives the API and interaction boundary.

## Prepared playback adapter

The correction example supplies authoritative root snapshots and claim evidence; the older fragment-only examples do not. The workbench record now carries general event identifiers, frame identity and unresolved work separately. It does not retroactively fill those gaps in the older prepared playbacks. Do not relabel prepared arrays as executed traces.

The checks in `tests/` cover unpicked state, reciprocal path separation, chronological traversal and input binding, occurrence-scoped flattening, full dictionary membership, stable non-overlapping layouts, camera visibility at every step in both views, and preservation of all 71 imported Newton definitions and the new transcript against their checked-in sources.
