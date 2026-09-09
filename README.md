# VD website

A browser-based dictionary and prepared trace explorer for the Valid Dictionary project. The first prototype includes two dictionaries, three prepared demonstrations, a reference map, and linked entry inspection.

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

- Select Newton kinematics or Toy force.
- Select an entry in the list or map to see its definition, references, and incoming references.
- Choose a prepared demonstration. Play, pause, move between steps, or restart.
- Select a numbered step or a headword in its active fragment to inspect it.
- Browsing an entry pauses playback. Switching dictionaries preserves each dictionary's step and selection during the current visit. Reloading starts a fresh visit.

The map's lines denote headword references. They do not assert physical causation. All playback is marked **Prepared demonstration**. It does not execute the VD engine, calculate arithmetic, or certify equivalence. The kinematics example preserves literal substitution, even where the resulting prose is awkward.

## Project layout

```text
src/App.tsx               Interface and playback timer
src/styles.css           Responsive visual design and accessibility states
src/player.ts            Pure playback and selection state transitions
src/data/dictionaries.ts Source definitions and explicit references
src/data/traces.ts        Prepared steps, active fragments, and provenance
tests/player.test.ts      Cross-dictionary data and playback checks
docs/DATA_FORMAT.md       Provisional interface for examples and future output
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
