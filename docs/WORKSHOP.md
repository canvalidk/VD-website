# Workshop: the trace doer

The Workshop page exists only in local builds (`pnpm dev`). Production builds never load its code. Its first tool is the trace doer: start a trace from a dictionary and a demand, then take it one step at a time. The VDfirst engine does every step and sends back the whole record each time; the page holds that record, shows it and sends the next command. The bridge itself keeps nothing.

## Running it

1. In a VDfirst checkout, run the bridge: `python workbench_server.py` (on Windows, `py -3 workbench_server.py`). It listens on 127.0.0.1:8765 and serves nothing else. The page is written for the engine with the brace convention (prediction-set schema 6, VDfirst PR #8, branch `claude/braces-and-replace-at-expansion`, until that is merged into `main`). An older engine still starts traces, but the page's "Give a value" and brace controls need schema 6.
2. In this checkout, run `pnpm dev` and open `#/workshop`.

Vite proxies `/api/workbench` to the bridge (`vite.config.ts`). The bridge accepts page origins on ports 5173 and 5174, so the dev server keeps to 5173 (`strictPort`). For another port, start the bridge with `--allow-origin http://127.0.0.1:PORT`.

## What it does

- **Start:** choose one of the site's dictionaries (the correction example, the current Newton draft, or the operational snapshot) and type a starting demand: a headword, or a sentence with headwords in it. The engine finds the headwords. The dictionary goes to the engine as exact text, in the order the entries were added (`src/workbench/sources.ts`).
- **The text:** the engine's text marks what has been dealt with. A bare headword is still to be expanded; braces stand round one that has been expanded (round its definition's text) or left unexpanded (round the headword). The trace view shows the same braces round its chips. The braces are plain text, and a filled headword's braces can be taken out or put back; that is recorded as a wording edit.
- **Holes:** each open headword offers the entries that fit it (from the engine), and these commands: expand an entry, recall an entry's wording as text, give a value, supply a fuller call, or leave the headword unexpanded.
  - **Give a value** never answers the bare headword. The page sends it as the engine takes it, in steps: expand the chosen entry, leave each headword in its text unexpanded, then replace the text with the value. So the record says the definition's wording means the same as the value. The steps are kept all together or not at all: the bridge keeps nothing, so the page keeps the new record only once the engine has taken every step, as the engine's own replacement does. A note goes on the step that replaces the text.
  - **Supply a fuller call** takes only a call of the same headword with at least as many arguments (the members acting on a body, the next value of a counter). The engine refuses anything else. It does not check that the arguments the demand already had are kept (VDfirst spec, provisional decision 9.6).
- **Braces:** a filled headword's panel can take its braces out or put them back. If its frame is reduced, the change is beneath the reduction: it does not show, and nothing is set aside, until the reduction is reopened. Otherwise any reduction above the frame that used its text is set aside.
- **Frames:** reduce a frame to a shorter wording that means the same, reopen a reduction, or edit the words between headwords.
- **Issue:** when nothing is open, issue the root's result. Issuing freezes it with the steps it rests on. A redo is issued again as a new result, and the earlier one keeps what it rested on.
- **Steps:** every step is listed, and named entries use the engine's own numbering (E0, E1, ...), as its statements do; where the dictionary is one of the site's sources, the source's own id is shown beside it. An earlier step can be viewed as it was. "New record from step N" replays the first N steps into a new record. The record that went further is left unchanged and stays under "Earlier this visit" for the rest of the visit.
- **The record:** what the root's result rests on now, the history, and the issued results, as the engine lists them. The page does not sort them into theory and members. That is a later layer (VDfirst PR #7, the hypothesis-set view, is outside the record).
- **Keeping work:** the open record is kept in this browser and comes back on reload. A record the engine made here is replayed by the engine on its own; one opened from a file waits for "Continue with the engine", so nothing from a file reaches the engine unasked. Records too large for the browser's storage (roughly 45 steps on the 45-entry dictionary) are not kept, and the page says so. Download keeps a record for good, as compact JSON. A downloaded record can be opened again: it can be read at once, and continued once the engine has replayed it.

## The record

`vd-trace-record` version 1, prediction-set schema 3 to 6. Types and shape checks are in `src/workbench/record.ts`. The client notes are in VDfirst `specs/2026-11-12-workbench-flatten-and-issue.md` section 10, `specs/2026-11-12-structured-arguments.md` section 11 and `specs/2026-11-15-braces-and-replacement-at-expansion.md` section 11. The page checks a record's shape for display only. Replay and digests are the engine's job.

Schema 6 adds `holes[].braced` (whether the text shows braces round a position) and the `braces` command (`position`, `shown`). Records of schema 3 to 5 are still read, in their own terms: in their text an open headword reads in braces, and a supplied input there may be a value, so the page names their kinds as they were then ("supplied input", "left as text").

A record carries the engine's fingerprint. Any change to the engine's source makes older records readable but not continuable. To carry one on, use "Replay into a new record": its steps are replayed into a new record by the current engine. That works only if the current engine still accepts every step. If the engine changes while a record is open, the next step is refused, and the page marks the record as needing a replay.

## Tests

`tests/workbench.test.ts` reads records made by the engine itself, from `tests/fixtures/workbench-*.json`. Regenerate them when VDfirst changes its record:

```
python tools/export_workbench_fixtures.py <VDfirst checkout> tests/fixtures
```

`workbench-fixtures.json` names the VDfirst commit they came from. `workbench-correction-schema5.json` is the correction record as VDfirst `7414a68` made it, before the brace convention. It is kept by hand, to test that older records are still read, and the script does not regenerate it.
