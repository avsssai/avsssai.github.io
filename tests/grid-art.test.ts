import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const artwork = readFileSync(
  new URL(
    '../public/art/portfolio/lettering/comic-colour.svg',
    import.meta.url,
  ),
  'utf8',
);
test('colour lettering has eleven distinct flat faces, with the original comic ink', () => {
  const faces = [
    ...artwork.matchAll(
      /<path[^>]+fill="(#[a-f0-9]+)"[^>]+paint-order="stroke"/g,
    ),
  ].map((match) => match[1]);
  assert.equal(faces.length, 11);
  assert.equal(new Set(faces).size, 11);
  assert.match(artwork, /transform="translate\(8 10\)" fill="#292923"/);
});
test('custom finger is a small local SVG cursor with no external resources', () => {
  const cursor = readFileSync(
    new URL('../public/art/portfolio/pointing-finger.svg', import.meta.url),
    'utf8',
  );
  assert.match(cursor, /width="32" height="40"/);
  assert.doesNotMatch(
    cursor,
    /<(?:script|image|foreignObject)\b|(?:href|onload)=/,
  );
});
