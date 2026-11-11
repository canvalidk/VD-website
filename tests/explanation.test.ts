import assert from 'node:assert/strict';
import test from 'node:test';
import { ideas } from '../src/data/explanation.ts';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';

test('explanation links open dictionaries and traces that exist', () => {
  for (const idea of ideas) {
    const action = idea.action;
    if (!action) continue;
    if (action.kind === 'correction') { assert.ok(traces.some(trace => trace.id === 'force-correction')); continue; }
    assert.ok(dictionaries.some(dictionary => dictionary.id === action.dictionaryId), `${idea.id}: ${action.dictionaryId}`);
    if (action.kind === 'trace') assert.ok(traces.some(trace => trace.id === action.traceId && trace.dictionaryId === action.dictionaryId), `${idea.id}: ${action.traceId}`);
  }
});

test('every idea cites a VD-docs note at a fixed commit', () => {
  for (const idea of ideas) {
    assert.match(idea.source.url, /^https:\/\/github\.com\/canvalidk\/VD-docs\/blob\/[0-9a-f]{40}\/.+\.md$/, idea.id);
    assert.ok(idea.paragraphs.length > 0 && idea.paragraphs.every(text => text.trim().length > 0), idea.id);
  }
  assert.equal(new Set(ideas.map(idea => idea.id)).size, ideas.length);
});

test('the explanation does not claim the bundled Newton drafts define gravity', () => {
  // The commitments idea says the drafts have no gravity entry; keep that true.
  const newton = dictionaries.filter(dictionary => dictionary.id.startsWith('newton'));
  assert.ok(newton.length > 0);
  for (const dictionary of newton) assert.ok(dictionary.entries.every(entry => !/gravit/i.test(entry.id)), dictionary.id);
});

test('dictionary strings marked in an idea appear verbatim in its paragraphs', () => {
  // The Ideas page sets these in the dictionary's typeface; a hint that no longer matches the wording would silently do nothing.
  for (const idea of ideas) {
    for (const text of idea.strings ?? []) {
      assert.ok(text.trim().length > 0, idea.id);
      assert.ok(idea.paragraphs.some(paragraph => paragraph.includes(text)), `${idea.id}: ${text}`);
    }
  }
  assert.ok(ideas.some(idea => idea.strings?.includes('convention')));
});

test('idea titles and actions carry no numbering or arrow glyphs', () => {
  for (const idea of ideas) {
    assert.doesNotMatch(idea.title, /^\s*\d/, idea.id);
    for (const text of [idea.title, idea.source.title, idea.action?.label ?? '']) assert.doesNotMatch(text, /[←-⇿]/, idea.id);
  }
});
