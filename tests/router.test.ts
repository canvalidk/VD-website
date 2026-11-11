import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRoute, routeHash } from '../src/router.ts';

test('hash routes name the page and carry parameters', () => {
  assert.equal(parseRoute('', false).page, 'home');
  assert.equal(parseRoute('#/', false).page, 'home');
  assert.equal(parseRoute('#/dictionary', false).page, 'dictionary');
  const route = parseRoute('#/traces?t=newton-ii-recorded&s=3', false);
  assert.deepEqual([route.page, route.params.get('t'), route.params.get('s')], ['traces', 'newton-ii-recorded', '3']);
  assert.equal(parseRoute('#/nowhere', false).page, 'home');
  assert.equal(parseRoute('#explanation', false).page, 'home');
});

test('the workshop exists only in development builds', () => {
  assert.equal(parseRoute('#/workshop', true).page, 'workshop');
  assert.equal(parseRoute('#/workshop', false).page, 'home');
});

test('route hashes round-trip and drop empty parameters', () => {
  assert.equal(routeHash('home'), '#/');
  assert.equal(routeHash('ideas'), '#/ideas');
  assert.equal(routeHash('dictionary', { d: 'newton-current', e: undefined }), '#/dictionary?d=newton-current');
  const hash = routeHash('traces', { t: 'force-correction', s: '4' });
  const back = parseRoute(hash, false);
  assert.deepEqual([back.page, back.params.get('t'), back.params.get('s')], ['traces', 'force-correction', '4']);
});
