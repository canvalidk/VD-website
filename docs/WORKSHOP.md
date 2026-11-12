# Workshop: the trace doer

The Workshop page exists only in local builds (`pnpm dev`). Production builds never load its code. Its first tool is the trace doer: start a trace from a dictionary and a demand, then take it one step at a time. The VDfirst engine does every step and sends back the whole record each time; the page holds that record, shows it and sends the next command. The bridge itself keeps nothing.

## Running it

1. In a VDfirst checkout at `main`, run the bridge: `python workbench_server.py` (on Windows, `py -3 workbench_server.py`). It listens on 127.0.0.1:8765 and serves nothing else.
2. In this checkout, run `pnpm dev` and open `#/workshop`.

Vite proxies `/api/workbench` to the bridge (`vite.config.ts`). The bridge accepts page origins on ports 5173 and 5174, so the dev server keeps to 5173 (`strictPort`). For another port, start the bridge with `--allow-origin http://127.0.0.1:PORT`.

## What it does

- **Start:** choose one of the site's dictionaries (the correction example, the current Newton draft, or the operational snapshot) and type a starting demand: a headword, or a sentence with headwords in it. The engine finds the headwords. The dictionary goes to the engine as exact text, in the order the entries were added (`src/workbench/sources.ts`).
- **Holes:** each open headword offers the entries that fit it (from the engine), and four commands: expand an entry, recall an entry's wording as text, supply a response, or leave the headword as text.
- **Frames:** reduce a frame to a shorter wording that means the same, reopen a reduction, or edit the words between headwords.
- **Issue:** when nothing is open, issue the root's result. Issuing freezes it with the steps it rests on. A redo is issued again as a new result, and the earlier one keeps what it rested on.
- **Steps:** every step is listed, and named entries use the engine's own numbering (E0, E1, ...), as its statements do; where the dictionary is one of the site's sources, the source's own id is shown beside it. An earlier step can be viewed as it was. "New record from step N" replays the first N steps into a new record. The record that went further is left unchanged and stays under "Earlier this visit" for the rest of the visit.
- **The record:** what the root's result rests on now, the history, and the issued results, as the engine lists them. The page does not sort them into theory and members. That is a later layer (VDfirst PR #7, the hypothesis-set view, is outside the record).
- **Keeping work:** the open record is kept in this browser and comes back on reload. A record the engine made here is replayed by the engine on its own; one opened from a file waits for "Continue with the engine", so nothing from a file reaches the engine unasked. Records too large for the browser's storage (roughly 45 steps on the 45-entry dictionary) are not kept, and the page says so. Download keeps a record for good, as compact JSON. A downloaded record can be opened again: it can be read at once, and continued once the engine has replayed it.

## The record

`vd-trace-record` version 1, prediction-set schema 3 to 5. Types and shape checks are in `src/workbench/record.ts`. The client notes are in VDfirst `specs/2026-11-12-workbench-flatten-and-issue.md` section 10 and `specs/2026-11-12-structured-arguments.md` section 11. The page checks a record's shape for display only. Replay and digests are the engine's job.

A record carries the engine's fingerprint. Any change to the engine's source makes older records readable but not continuable. To carry one on, use "Replay into a new record": its steps are replayed into a new record by the current engine. That works only if the current engine still accepts every step. If the engine changes while a record is open, the next step is refused, and the page marks the record as needing a replay.

## Tests

`tests/workbench.test.ts` reads records made by the engine itself, from `tests/fixtures/workbench-*.json`. Regenerate them when VDfirst changes its record:

```
python tools/export_workbench_fixtures.py <VDfirst checkout> tests/fixtures
```

`workbench-fixtures.json` names the VDfirst commit they came from.
