export function paperLayout(width: number, height: number) {
  const inset = width < 600 ? 12 : 20;
  const scale = Math.min(1, 1536 / Math.max(width, height));
  return {
    inset,
    scale,
    textureWidth: Math.max(1, Math.round(width * scale)),
    textureHeight: Math.max(1, Math.round(height * scale)),
    monogram: { x: inset + 22, y: height - inset - 62 },
  };
}

// Original vector initials: no font/image fetch and no canvas font-load race.
const MONOGRAM =
  'M25 5 C22 0 8 0 5 8 C0 18 23 15 21 25 C19 36 4 37 1 31 M28 34 L46 2 L54 34 M34 23 L51 23';

export function createPaperCanvases(width: number, height: number) {
  const layout = paperLayout(width, height);
  const colour = document.createElement('canvas');
  const relief = document.createElement('canvas');
  colour.width = relief.width = layout.textureWidth;
  colour.height = relief.height = layout.textureHeight;
  const ink = colour.getContext('2d');
  const heightMap = relief.getContext('2d');
  if (!ink || !heightMap) throw new Error('Paper texture canvas unavailable');
  const pixels = ink.createImageData(colour.width, colour.height);
  const heights = heightMap.createImageData(relief.width, relief.height);
  let seed = 7319;
  for (let index = 0; index < pixels.data.length; index += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    // Deterministic, low-contrast fibres baked once, never moving noise.
    const noise = seed >>> 24;
    const tone = 248 + (noise & 7);
    const elevation = 127 + (noise & 3);
    for (let channel = 0; channel < 3; channel++) {
      pixels.data[index + channel] = tone;
      heights.data[index + channel] = elevation;
    }
    pixels.data[index + 3] = heights.data[index + 3] = 255;
  }
  ink.putImageData(pixels, 0, 0);
  heightMap.putImageData(heights, 0, 0);
  // Logical sheet coordinates, independent of the bounded bitmap resolution.
  ink.scale(layout.scale, layout.scale);
  heightMap.scale(layout.scale, layout.scale);
  ink.strokeStyle = 'rgba(145, 117, 72, 0.58)';
  ink.lineWidth = 1.6;
  ink.lineCap = 'round';
  ink.setLineDash([0.01, 6.5]);
  ink.beginPath();
  ink.roundRect(
    layout.inset,
    layout.inset,
    width - layout.inset * 2,
    height - layout.inset * 2,
    12,
  );
  ink.stroke();
  ink.setLineDash([]);
  const initials = new Path2D(MONOGRAM);
  ink.save();
  ink.translate(layout.monogram.x, layout.monogram.y);
  ink.lineWidth = 1.6;
  ink.lineJoin = 'round';
  // No printed dark initials: opposing tiny light/shade edges read as a
  // blind impression. The corresponding height map provides real relief.
  ink.translate(0.8, 0.9);
  ink.strokeStyle = 'rgba(111, 86, 45, 0.19)';
  ink.stroke(initials);
  ink.translate(-1.5, -1.6);
  ink.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ink.stroke(initials);
  ink.restore();
  heightMap.translate(layout.monogram.x, layout.monogram.y);
  heightMap.strokeStyle = '#b0b0b0';
  heightMap.lineWidth = 1.7;
  heightMap.lineJoin = 'round';
  heightMap.lineCap = 'round';
  heightMap.stroke(initials);
  return { colour, relief };
}
