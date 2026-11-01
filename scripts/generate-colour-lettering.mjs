import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../public/art/portfolio/lettering/', import.meta.url);
const palette = [
  '#ffcc48',
  '#ff8176',
  '#79bfdc',
  '#a699df',
  '#8cceb0',
  '#f5a2c1',
  '#ffd26b',
  '#85badf',
  '#e88d76',
  '#8fc8ad',
  '#a898dc',
];
let letter = 0;
let artwork = readFileSync(new URL('comic.svg', root), 'utf8').replace(
  /fill="url\(#(?:gold|ivory)\)"/g,
  () => `fill="${palette[letter++ % palette.length]}"`,
);
if (letter !== 11)
  throw new Error(`Expected eleven comic letter faces, found ${letter}`);
// Independent outer groups preserve the original ink/face transforms. The
// little star over the second i belongs to that letter, not the page.
const sparkle = artwork.match(/<path d="M593[^\"]*"[^>]*\/>/)?.[0] || '';
artwork = artwork.replace(sparkle, '');
let body = 0;
artwork = artwork.replace(/<g transform="[^\"]+">[\s\S]*?<\/g>/g, (group) => {
  const index = body++;
  return `<g data-letter-body="${index}" data-letter="${'Imagination'[index]}">${group}${index === 8 ? sparkle : ''}</g>`;
});
if (body !== 11) throw new Error(`Expected eleven glyph groups, found ${body}`);
artwork = artwork.replace(
  /<circle cx="771\.756"[^>]*\/>/,
  (circle) => `<g data-letter-body="11" data-letter=".">${circle}</g>`,
);
writeFileSync(new URL('comic-colour.svg', root), artwork);
