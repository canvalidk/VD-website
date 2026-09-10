# Contributing

Use a branch and a pull request. Read `VD_WEBSITE_BRIEF.md`, `docs/DATA_FORMAT.md`, and `docs/SOURCES.md` before changing behavior or examples. These instructions apply equally to human contributors and coding assistants.

- Keep dictionary data, trace production, and presentation separate. Do not quietly introduce engine execution into the viewer.
- Preserve exact source definitions and original entry identifiers. Explain adaptations in `docs/SOURCES.md`.
- Distinguish literal text from explicit open headword references. Do not parse recalled text into fresh references.
- Distinguish prepared demonstrations from condensed recorded traces. Do not present interface highlights as formal VD semantics or arithmetic as engine-certified output. Track reference traversal explicitly and flatten only the recorded occurrence, never every use of a headword.
- Use semantic controls with keyboard focus, readable text, responsive layouts, and reduced-motion behavior. Playback starts only on user action.
- Keep dependencies standard, explicit, and locked. Never commit secrets, node_modules, or build output.
- Run `pnpm test` and `pnpm build` for logic or data changes. Verify relevant desktop/mobile interactions when making visual changes and record which checks were actually performed.
- Keep publication separate from contribution. The Pages workflow is manual and deploys reviewed main-branch source.

There is no required AI provider, editor, or plugin. Installation, tests, development, and build commands are documented in the README.
