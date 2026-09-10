import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dictionaries } from '../src/data/dictionaries.ts';
import { traces } from '../src/data/traces.ts';
import { traceGraphState, edgeId } from '../src/traceGraph.ts';
import { createGraphScene, fitCamera, keepTraceVisible } from '../src/graphScene.ts';
import type { Bounds, Camera, Viewport } from '../src/graphScene.ts';
import { referencePath } from '../src/graphGeometry.ts';

const given = traces.find(trace => trace.id === 'newton-ii-given-inputs')!;

test('given-inputs replay preserves the source and the three bindings without inventing traversals', () => {
  const archive = readFileSync(new URL('../docs/newton-ii-given-inputs-source.txt', import.meta.url));
  assert.equal(createHash('sha256').update(archive).digest('hex'), '1c205f50c996105e9d06ae66455278e9d5a3e453f3acc574850192dea8fcc5bb');
  assert.ok(archive.toString().startsWith('QUESTION: ' + given.question));
  assert.equal(given.steps.length, 7);
  assert.deepEqual(given.steps.map(step => step.operation), ['Start', 'Expand', 'Input', 'Flatten', 'Input', 'Input', 'Reduce']);
  assert.deepEqual(given.steps.flatMap(step => step.boundInputs ?? []), [
    { from: 'inertial-acceleration', to: 'point-particle', value: 'p1' },
    { from: 'inertial-acceleration', to: 'net-force', value: '(6, 0, 0) N' },
    { from: 'inertial-acceleration', to: 'inertial-mass', value: '2 kg' },
  ]);
  assert.equal(traceGraphState(given, 6).traversed.size, 0);
  assert.equal(given.steps[5].fragment.map(part => part.text).join(''), 'For a p1, inertial-acceleration equals (6,0,0) N divided by 2 kg: a = F/m.');
  assert.deepEqual(given.steps[6].fragment, [{ text: '(3, 0, 0) m/s^2' }]);
  assert.ok(archive.toString().includes('\n(3, 0, 0) m/s^2'));
});

test('seeking backwards removes later inputs and restores the open self-label', () => {
  assert.equal(traceGraphState(given, 6).boundInputs.size, 3);
  assert.deepEqual([...traceGraphState(given, 2).boundInputs.keys()], [edgeId('inertial-acceleration', 'point-particle')]);
  assert.equal(traceGraphState(given, 2).occurrences[0].flattened, false);
  assert.equal(traceGraphState(given, 3).occurrences[0].flattened, true);
  assert.equal(traceGraphState(given, 1).boundInputs.size, 0);
  assert.equal(traceGraphState(given, 0).occurrences.length, 0);
});

function assertVisible(bounds: Bounds, camera: Camera, viewport: Viewport) {
  const epsilon = 1e-7;
  assert.ok(bounds.x * camera.scale + camera.x >= 18 - epsilon, 'left is visible');
  assert.ok(bounds.y * camera.scale + camera.y >= 22 - epsilon, 'top is visible');
  assert.ok((bounds.x + bounds.width) * camera.scale + camera.x <= viewport.width - 18 + epsilon, 'right is visible');
  assert.ok((bounds.y + bounds.height) * camera.scale + camera.y <= viewport.height - 22 + epsilon, 'bottom is visible');
}

test('both views retain all trace animations at every step and full view includes every headword', () => {
  for (const trace of traces) {
    const dictionary = dictionaries.find(item => item.id === trace.dictionaryId)!;
    for (let index = 0; index < trace.steps.length; index++) {
      const selected = trace.steps[index].relatedEntryIds[0];
      const focused = createGraphScene(dictionary, selected, trace, index, 'focused');
      const full = createGraphScene(dictionary, selected, trace, index, 'full');
      assert.deepEqual(focused.history, full.history);
      assert.deepEqual(new Set(full.nodes.map(node => node.id)), new Set(dictionary.entries.map(entry => entry.id)));
      for (const scene of [focused, full]) {
        assert.equal(scene.nodes.filter(node => node.start).length, 1);
        assert.ok(scene.nodes.find(node => node.start)?.id === scene.history.startEntryId);
        for (const key of [...scene.history.traversed, ...scene.history.boundInputs.keys()]) assert.ok(scene.edges.some(edge => edge.id === key), trace.id + ': missing animated edge');
        for (const input of scene.history.boundInputs.values()) assert.equal(scene.nodes.find(node => node.id === input.to)?.given, input.value);
        assert.equal(scene.occurrences.filter(node => node.visible).length, scene.history.occurrences.length);
        for (const occurrence of scene.history.occurrences) assert.equal(scene.occurrences.find(node => node.id === occurrence.id)?.flattened, occurrence.flattened);
        assert.ok(scene.nodes.every(node => !node.flattened), 'dictionary headwords never flatten');
      }
    }
  }
});

test('fit and follow keep animated nodes, occurrences and edge directions in view at narrow and wide sizes', () => {
  for (const viewport of [{ width: 280, height: 360 }, { width: 640, height: 430 }, { width: 1200, height: 600 }]) {
    for (const trace of traces) {
      const dictionary = dictionaries.find(item => item.id === trace.dictionaryId)!;
      for (const view of ['focused', 'full'] as const) {
        for (let index = 0; index < trace.steps.length; index++) {
          const scene = createGraphScene(dictionary, trace.steps[index].relatedEntryIds[0], trace, index, view);
          assertVisible(scene.bounds, fitCamera(scene.bounds, viewport), viewport);
          const camera = keepTraceVisible({ x: -4000, y: 3000, scale: 2.5 }, scene.focusBounds, viewport);
          assertVisible(scene.focusBounds, camera, viewport);
          const highlighted = [...scene.nodes.filter(node => node.start || node.active), ...scene.occurrences.filter(node => node.visible)];
          for (const node of highlighted) assertVisible({ x: node.x - node.width / 2, y: node.y - node.height / 2, width: node.width, height: node.height }, camera, viewport);
          for (const edge of scene.edges.filter(edge => edge.traversed || edge.bound)) {
            const point = referencePath(edge.source, edge.target, !!edge.target.entry?.references.includes(edge.source.id)).middle;
            assertVisible({ ...point, width: 0, height: 0 }, camera, viewport);
          }
        }
      }
    }
  }
});

test('nodes do not overlap and stepping never rearranges either network', () => {
  for (const trace of traces) {
    const dictionary = dictionaries.find(item => item.id === trace.dictionaryId)!;
    for (const view of ['focused', 'full'] as const) {
      let positions;
      for (let index = 0; index < trace.steps.length; index++) {
        const scene = createGraphScene(dictionary, trace.steps[index].relatedEntryIds[0], trace, index, view);
        const nodes = [...scene.nodes, ...scene.occurrences];
        const current = nodes.map(node => [node.id, node.x, node.y]);
        if (positions) assert.deepEqual(current, positions);
        positions = current;
        for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) {
          assert.ok(Math.abs(nodes[a].x - nodes[b].x) >= (nodes[a].width + nodes[b].width) / 2 || Math.abs(nodes[a].y - nodes[b].y) >= (nodes[a].height + nodes[b].height) / 2, trace.id + ': overlapping nodes');
        }
      }
    }
  }
});

test('full dictionary browsing works before choosing any trace', () => {
  for (const dictionary of dictionaries) {
    const scene = createGraphScene(dictionary, dictionary.entries[0].id, undefined, 0, 'full');
    assert.equal(scene.nodes.length, dictionary.entries.length);
    assert.equal(scene.edges.length, dictionary.entries.reduce((sum, entry) => sum + entry.references.length, 0));
    assert.equal(scene.occurrences.length, 0);
    assert.ok(scene.nodes.every(node => !node.start && !node.active && !node.given));
  }
});

test('selecting an offscreen headword can reveal it alongside the trace history', () => {
  const dictionary = dictionaries.find(item => item.id === given.dictionaryId)!;
  const selected = dictionary.entries.at(-1)!;
  for (const trace of [undefined, given]) {
    const scene = createGraphScene(dictionary, selected.id, trace, 4, 'full');
    const node = scene.nodes.find(item => item.id === selected.id)!;
    const viewport = { width: 640, height: 430 };
    const camera = keepTraceVisible({ x: 5000, y: -5000, scale: 2 }, scene.focusBounds, viewport);
    assertVisible({ x: node.x - node.width / 2, y: node.y - node.height / 2, width: node.width, height: node.height }, camera, viewport);
    assertVisible(scene.focusBounds, camera, viewport);
  }
});
