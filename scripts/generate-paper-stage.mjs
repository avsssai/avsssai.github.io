import fs from 'node:fs';
import {
  paperOutline,
  paperStage,
} from '../src/components/portfolio/paper-stage.ts';

// Original local vector artwork. Same outline/placement as the Three.js sheets;
// no downloaded assets, textures or authoring dependencies.
for (const phone of [false, true]) {
  const width = phone ? 390 : 1440,
    height = phone ? 729 : 838;
  const main = paperStage(width, height);
  for (const dark of [false, true]) {
    const colour = dark
      ? {
          main: '#393443',
          edge: '#65566c',
          blue: '#35535d',
          peach: '#76534e',
          fold: '#79657e',
        }
      : {
          main: '#fff4dc',
          edge: '#dbc7a4',
          blue: '#bddbe1',
          peach: '#f0c4b4',
          fold: '#edd5ab',
        };
    const svg = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="4" dy="9" stdDeviation="5" flood-color="#221725" flood-opacity=".16"/></filter></defs>`,
    ];
    const path = (w, h, fold) =>
      paperOutline(w, h, fold)
        .map((command) => command.join(' '))
        .join(' ');
    const offset = phone ? 9 : 22;
    svg.push(
      `<path d="${path(main.width + 8, main.height + 5, main.fold)}" transform="translate(${main.x - offset} ${main.y + 8}) rotate(-2.005)" fill="${colour.blue}" stroke="${colour.edge}" filter="url(#shadow)"/>`,
    );
    svg.push(
      `<path d="${path(main.width + 6, main.height + 2, main.fold)}" transform="translate(${main.x + offset} ${main.y + 9}) rotate(2.005)" fill="${colour.peach}" stroke="${colour.edge}" filter="url(#shadow)"/>`,
    );
    const w = main.width / 2,
      h = main.height / 2,
      cut = main.fold;
    svg.push(
      `<g transform="translate(${main.x} ${main.y}) rotate(-.344)"><path d="${path(main.width, main.height, cut)}" fill="${colour.main}" stroke="${colour.edge}" filter="url(#shadow)"/><path d="M${w - 3} ${h - cut} L${w - cut} ${h - 1} L${w - cut * 0.86} ${h - cut * 0.91}Z" fill="${colour.fold}" stroke="${colour.edge}" stroke-width=".6"/></g></svg>`,
    );
    const file = `public/art/portfolio/paper-stage-${phone ? 'phone-' : ''}${dark ? 'dark' : 'light'}.svg`;
    fs.writeFileSync(file, svg.join(''));
    console.log(file);
  }
}
