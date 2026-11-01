import { site } from '../../config/site.ts';

/** The actual header identity, printed on the sheet without redrawing the mascot. */
export function drawPeelDoodle(
  ink: CanvasRenderingContext2D,
  width: number,
  height: number,
  dark: boolean,
  character: HTMLImageElement,
) {
  const scale = Math.min(1.5, (width - 88) / 290);
  ink.save();
  ink.translate(width / 2, height / 2);
  ink.scale(scale, scale);
  ink.font = '600 28px "Space Grotesk", sans-serif';
  const nameWidth = ink.measureText(site.name).width;
  const total = 64 + 14 + nameWidth + 8;
  ink.translate(-total / 2, -40);
  ink.drawImage(character, 0, 0, 64, 80);
  ink.fillStyle = dark ? '#f1efe8' : '#252523';
  ink.fillText(site.name, 78, 50);
  ink.fillStyle = '#9386c3';
  ink.fillText('.', 78 + nameWidth, 50);
  ink.restore();
}
