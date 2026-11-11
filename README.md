# Authority Dictionary

**by Can Valid Kohen**

A website for the Valid Dictionary project: a physical theory written as a named dictionary that only grows. It has four pages: an Introduction with one live law-house, the Dictionary (its network nested by degree, each law drawn by its own links), Traces (recorded runs replayed step by step, with their commitments), and Ideas (the five ideas the project rests on). The current Newton draft opens preselected. Dictionaries, laws and traces come from the VDfirst engine and VD-Newton; the site never runs the engine.

## Run locally

Install Node.js 22.13 or later and pnpm 11.19.0. From this repository:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite. No API keys, account, backend, or AI-specific tools are required. Fonts use Google Fonts when available, with local system fallbacks.

```sh
pnpm test       # Data integrity and playback behavior
pnpm build      # TypeScript check and production build
pnpm preview    # Serve the production build locally
```

## Explore

The site has four pages, reached from the running head. Addresses are hash routes, so any page, dictionary, entry or trace can be linked directly.

- **Introduction** (`#/`): what an Authority Dictionary is, beside one live picture, Law 1 of the current Newton draft drawn as a house from its six entries. Select an entry in the drawing or the list to read its exact string.
- **Dictionary** (`#/dictionary?d=newton-current&entry=inertial-frame&src=E5`): the network, nested by degree, with each law drawn by its own links. The roof is the three law entries referring to each other; the chimney and walls are double rails joining two entries of one headword; dashed means not written yet. **Laws as a table** shows the same houses as a grid. The left index lists the laws and every headword by degree; the right column reads the selected entry as a dictionary entry, ending "According to" its dictionary.
- **Traces** (`#/traces?t=newton-ii-recorded&step=4`): a register of recorded runs and prepared demonstrations, replayed step by step on the network. A yellow band marks where the trace has been; given inputs are teal and end in a circle. Where a step carries recorded commitments, **Result and commitments** lists them. **A corrected mistake** (`#/traces?t=force-correction`) shows two derivations: one reaches 12 N and stays on record as issued, and a new one reaches 10 N.
- **Ideas** (`#/ideas`): the five ideas the project rests on, each with the VD-docs note it comes from.
- **Workshop** (`#/workshop`): local development builds only, never in a production build. Reserved for tools that work on the dictionaries directly.

On the Dictionary and Traces pages, **the Edge** under the "According to" line is the dictionary seen side-on: one stroke per entry, in the order added for dictionaries exported from the engine and in the order listed for the small examples. A short grey stroke is an entry outside the laws, a medium blue one a headword defined again (a chimney or wall), a full crimson one a law entry. Selecting an entry, headword or law marks its strokes; a trace leaves a yellow band under the entries it has visited. Use the arrow keys to move along it and Enter to select.

The site never runs the VD engine. Lines are references between entries, not physical causes. Prepared demonstrations and recorded runs are labelled as such.

The map's lines denote headword references. They do not assert physical causation. Prepared examples and recorded playback have distinct labels. The website does not execute the VD engine or perform the recorded arithmetic. The Newton II run's arithmetic reductions were supplied by its interpreter. The kinematics example preserves literal substitution, even where the resulting prose is awkward.

The current Newton Design 2.1 draft has 26 definitions across 21 headwords and is unfinished. The operational snapshot has 45 definitions across 34 headwords and is the exact dictionary used by both saved Newton II runs. These are separate versions; recorded traces are only offered for their matching snapshot. Multiple definitions for a headword are preserved in the inspector.

## Project layout

```text
src/App.tsx               Shell, routing, shared explorer state and playback timer
src/router.ts             Hash routes; the workshop exists only in development builds
src/pages/HomePage.tsx    Introduction
src/pages/DictionaryPage.tsx  Index, network or laws table, entry inspector
src/pages/TracesPage.tsx  Trace register, playback, result and commitments
src/pages/IdeasPage.tsx   The five ideas (text in src/data/explanation.ts)
src/pages/WorkshopPage.tsx  Local-only shell
src/pages/AccordingTo.tsx The "According to [dictionary]" line and count sentence
src/pages/format.ts       Display names and count sentences
src/IntroHouse.tsx        The Introduction's house figure (logic in src/homeFigure.ts)
src/Edge.tsx              The Edge (logic in src/edgeModel.ts)
src/Graph.tsx             The network: law structure, focused and full views, trace overlay
src/lawScene.ts           Law-structure layout: definition nodes, nested degree frames, house links
src/graphScene.ts         Focused/full layouts and trace-following camera geometry
src/graphGeometry.ts      Reference paths, double rails, box exits, hyphen-only line breaks
src/TracePlayer.tsx       Step panel and playback controls
src/ResultView.tsx        Root result, commitments, claim inspector, derivations
src/HouseView.tsx         Laws as a table
src/houses.ts             Pure helpers over exported houses (columns, status, roles, outline)
src/predictions.ts        Pure relevance and recorded-support selectors
src/derivations.ts        Groups snapshots into derivations; a corrected derivation is a new one
src/traceGraph.ts         Step-derived start, traversal, input, and flatten state
src/player.ts             Pure playback and selection state transitions
src/theme.css             Design tokens, type roles, controls and shell
src/{network,edge,dictionary,traces,home,ideas}.css   Styles per area
src/data/*-houses.json    Law-houses exported from the VDfirst engine
src/data/correction*      Pinned VDfirst export and explicit display adapter
src/data/dictionaries.ts  Source definitions and explicit references
src/data/traces.ts        Trace contract and prepared examples
src/data/newton-*.ts      Current draft, operational snapshot, and recorded traces
tools/export_houses.py    Re-export houses from a VDfirst checkout (needs Python and networkx)
tests/*.test.ts           Data, layout, routing, playback and source-fidelity checks
docs/DATA_FORMAT.md       Data formats and the law-structure layout
docs/DESIGN.md            The visual system: type roles, colour meanings, the Edge
docs/SOURCES.md           Source selection and semantic limitations
VD_WEBSITE_BRIEF.md       Original agreed product brief
```

## Hosting

The site builds to `dist/` and is portable to any static host. Relative asset paths support both a repository subpath and a custom domain.

`.github/workflows/check.yml` validates pull requests and main-branch changes. `.github/workflows/pages.yml` provides a **manual** GitHub Pages deployment of the main branch. To publish after review:

1. Merge the reviewed prototype into `main`.
2. In repository Settings → Pages, choose GitHub Actions as the source. The account must support Pages for a private repository; repository visibility remains a separate decision.
3. Run **Publish website** from the main branch in Actions.

GitHub Pages can make the built website public even while the source repository remains private. Publication is a deliberate step; opening or merging a pull request does not run this deployment workflow.

The deployment workflow follows the [Vite static deployment guide](https://vite.dev/guide/static-deploy.html#github-pages). No Sites service or proprietary deployment tooling is required.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md). The original brief's engine execution, uploads, saved traces, accounts, and external-agent APIs remain future scope.
