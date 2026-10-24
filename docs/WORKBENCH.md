# Local trace workbench

The workbench is the first interactive path from a human's demand to an inspectable saved VDfirst record. It is explicitly separate from prepared playback. There is no browser engine, automatic arithmetic, public upload, account or cloud storage.

## Interface

1. Start a demand against the exact three-definition correction dictionary. The demand and question/context can be edited before starting. The Python protocol also accepts other bounded dictionaries; the website's initial start form deliberately stays small.
2. Select a frame, then an unresolved hole. Candidate definitions and their parameter instantiations come from the engine. Expand a definition, recall its wording literally, or supply a response.
3. Record a reduction of any selected frame, reopen an existing reduction, or edit its literal strings while retaining its headword holes. Each action may include a note. Reopening invalidates dependent reductions while retaining their recorded claims.
4. Inspect the root result and partial prediction set, select claims for exact stimulus/response evidence, follow recorded dependencies, and inspect the event history. The selected frame does not change which root result is displayed.
5. Select earlier snapshots for read-only inspection. Return to the latest snapshot before continuing. History navigation never undoes a live trace operation.
6. Download the full record. Reopen a local file for offline display. Imported files cannot be continued until the engine validates the exact record by replay. A failed call or import does not replace the active record. Starting/opening another record preserves the old one in memory during that visit; downloads are needed to retain records across page reloads or closure.

The labels distinguish three separate questions: whether the engine reproduced a record consistently, whether its dependencies are fully tracked, and whether its scientific claims are true. All scientific claims in this protocol remain unchecked. Full prediction-set coverage remains false.

## Protocol v1

The website sends POST requests only to relative routes:

| Route | Request | Success |
| --- | --- | --- |
| `/api/workbench/start` | `{dictionary: {name, entries: [[headword, definition], ...]}, demand, context}` | `{record}` |
| `/api/workbench/command` | `{record, command}` | `{record}` |
| `/api/workbench/validate` | `{record}` | `{record}` |

The local bridge also exposes `GET /api/workbench/health`. Errors contain `{error: string}`. Vite's development proxy targets `http://127.0.0.1:8765`; the Python bridge binds only loopback and is stateless. The website never receives Python objects or executes supplied code. An imported file is sent to the bridge only when the user explicitly validates it. Subsequent commands include the validated record and are replay-validated again.

`TraceRecord` includes:

- `format: 'vd-trace-record'`, `version: 1`, a record ID and a full-record SHA-256.
- Producer name/protocol/engine fingerprint; dictionary name, ordered indexed entries and digest; original demand/context.
- Commands with operation, stable frame ID and exact operation fields, plus an optional note.
- Numbered event IDs, kind, detail and optional complete change evidence.
- `S0` followed by one snapshot per successful command. Each snapshot contains the root frame ID, event count, frame tree and schema-2 prediction set.

Frame IDs are original-hole paths: root `F`, its child at position 0 `F/0`, and so on. Each frame carries parent/address identity, render, overlay, source entry, headwords, literal strings and explicit hole/candidate information. Recall fills text literally; the website does not retokenize it. Existing entry IDs and exact source definitions remain visible.

The importer checks structural consistency, file size, finite/bounded JSON shape, frame links, candidates against dictionary text, claim/event bounds and support partitions. It preserves all source evidence, including fields it does not render. It does not independently calculate SHA-256 or replay commands. The visible unvalidated state remains until the bridge succeeds. Engine fingerprint changes can prevent older saved records from continuing; offline playback remains available. Digests and replay consistency are not proof of authorship.

## Current limits and next observations

The prototype starts only the correction dictionary, uses explicit manual operation controls and a JSON string-array editor for literal cleanup, and has no automatic durable save. It does not choose definitions for a user or verify interpreter responses. Full prediction families, alternative branches and disjunction semantics remain future work.

The presentation keeps frame work above root evidence: first make an operation concrete, then inspect its consequences. Separate snapshot navigation makes the distinction between viewing an old state and reopening a reduction visible. The same result/claims component serves both live records and prepared playback without changing their provenance labels.

Tests exercise the real nine-snapshot exported correction record, literal-only empty-dictionary records, malformed imports, frame identity, candidate fidelity, support states, preservation of unknown evidence and relative API/error handling. Desktop/mobile end-to-end checks are recorded in the change's review notes.
