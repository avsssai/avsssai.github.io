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
const artwork = readFileSync(new URL('comic.svg', root), 'utf8').replace(
  /fill="url\(#(?:gold|ivory)\)"/g,
  () => `fill="${palette[letter++ % palette.length]}"`,
);
if (letter !== 11)
  throw new Error(`Expected eleven comic letter faces, found ${letter}`);
writeFileSync(new URL('comic-colour.svg', root), artwork);
