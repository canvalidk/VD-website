# Visual system

The site's look follows one idea: an Authority Dictionary is a named list of entries that only grows, and every claim is made according to it. The rules below are meant to be kept when the site changes. Tokens live in `src/theme.css`.

## Who is speaking shows in the type

| Typeface | Class | Used for |
| --- | --- | --- |
| Atkinson Hyperlegible Next | `.vd-string` | The dictionary's own strings only: headwords, entry ids, definitions, trace fragments, recorded results. Never transformed: no capitals, no ligatures, lines break only after an existing hyphen. |
| Literata | `.vd-voice`, `.vd-label` | The site's own voice: prose, captions, and italic labels such as "roof of Law 1", "recorded run", "not written yet". |
| Archivo | headings, controls | Page titles and headings (semi-condensed, bold), navigation, buttons, counts. |

There is no monospace and no all-caps text.

## Each colour has one meaning

| Token | Meaning |
| --- | --- |
| `--c-law` crimson | The law: roof links, the rule on a law entry, a law entry's stroke on the Edge. |
| `--c-again` blue | A headword defined again: chimney and wall links (drawn as a double rail), their rules and strokes. Also text links. |
| `--c-pencil`, dashed | Not written yet. Dashed lines and borders mean nothing else anywhere on the site. |
| `--c-highlight` yellow | Where a recorded trace has been. Always a band under ink, never text. |
| `--c-given` teal | A given input in a trace, ending in an open circle. |
| `--c-ink` | Text, the selected entry (an ink-filled slip), the focus ring, the current page. |

Colour is never the only cue: the roof is heavier, re-definition is doubled, unwritten is dashed, a given input ends in a circle, a flattened occurrence is hatched and labelled.

## The Edge

The one bold element. On the Dictionary and Traces pages, under the "According to" line, the dictionary is drawn side-on as its own append log: one stroke per entry, left to right in the order added. Stroke height and colour give the role (short grey: outside the laws; medium blue: a headword defined again; full crimson: a law entry). Entries not written yet follow the end as dashed outlines. It claims "in the order added" only for dictionaries exported from the engine; others say "in the order listed". It never animates.

## Layout rules

- One left edge per page; flush left, ragged right; nothing centred except text inside network slips.
- Hanging indents wherever a label explains a thing: doors, the trace register, the index.
- No card shadows, gradients, middle-dot meta strings, arrow glyphs, numbered markers on things that are not sequences, or entrance animations. Step numbers stay, because steps are a sequence.
- Every control is at least 44px tall, has the ink focus ring, and works at 390px wide.

The plan these rules come from was chosen from four independent directions and judged for distinctiveness, comprehension and buildability.
