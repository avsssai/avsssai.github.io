export type StackId =
  'typescript' | 'python' | 'astro' | 'gcp' | 'react' | 'fastapi' | 'github';

export type GeometryKind =
  'tile' | 'paired' | 'star' | 'cloud' | 'atom' | 'bolt' | 'gem';
export type StackItem = Readonly<{
  id: StackId;
  label: string;
  colour: `#${string}`;
  geometry: GeometryKind;
  desktopAnchor: Readonly<{
    x: number;
    y: number;
    scale: number;
    tilt: number;
  }>;
  mobileAnchor: Readonly<{ x: number; y: number; scale: number; tilt: number }>;
  fallbackAsset: `/art/portfolio/stack/${string}.svg`;
}>;

export const stackItems = [
  {
    id: 'typescript',
    label: 'TypeScript',
    colour: '#aac9dc',
    geometry: 'tile',
    desktopAnchor: { x: 0.81, y: 0.76, scale: 1.25, tilt: 12 },
    mobileAnchor: { x: 0.19, y: 0.59, scale: 1.1, tilt: 10 },
    fallbackAsset: '/art/portfolio/stack/typescript.svg',
  },
  {
    id: 'python',
    label: 'Python',
    colour: '#eed785',
    geometry: 'paired',
    desktopAnchor: { x: 0.17, y: 0.2, scale: 1.2, tilt: -18 },
    mobileAnchor: { x: 0.17, y: 0.15, scale: 1.2, tilt: -18 },
    fallbackAsset: '/art/portfolio/stack/python.svg',
  },
  {
    id: 'astro',
    label: 'Astro',
    colour: '#e7aa93',
    geometry: 'star',
    desktopAnchor: { x: 0.25, y: 0.77, scale: 1.15, tilt: -15 },
    mobileAnchor: { x: 0.51, y: 0.5, scale: 1.12, tilt: -14 },
    fallbackAsset: '/art/portfolio/stack/astro.svg',
  },
  {
    id: 'gcp',
    label: 'GCP',
    colour: '#c8d4b0',
    geometry: 'cloud',
    desktopAnchor: { x: 0.065, y: 0.52, scale: 0.7, tilt: 8 },
    mobileAnchor: { x: 0.14, y: 0.9, scale: 0.72, tilt: 6 },
    fallbackAsset: '/art/portfolio/stack/gcp.svg',
  },
  {
    id: 'react',
    label: 'React',
    colour: '#a196d2',
    geometry: 'atom',
    desktopAnchor: { x: 0.85, y: 0.16, scale: 1.65, tilt: -16 },
    mobileAnchor: { x: 0.79, y: 0.18, scale: 1.5, tilt: -16 },
    fallbackAsset: '/art/portfolio/stack/react.svg',
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    colour: '#9abfb1',
    geometry: 'bolt',
    desktopAnchor: { x: 0.945, y: 0.48, scale: 0.72, tilt: 14 },
    mobileAnchor: { x: 0.85, y: 0.64, scale: 0.8, tilt: 16 },
    fallbackAsset: '/art/portfolio/stack/fastapi.svg',
  },
  {
    id: 'github',
    label: 'GitHub',
    colour: '#b6b3c5',
    geometry: 'gem',
    desktopAnchor: { x: 0.49, y: 0.9, scale: 0.65, tilt: -12 },
    mobileAnchor: { x: 0.64, y: 0.88, scale: 0.75, tilt: -14 },
    fallbackAsset: '/art/portfolio/stack/github.svg',
  },
] as const satisfies readonly StackItem[];

export type Point = Readonly<{ x: number; y: number }>;
export type TargetLayout = Readonly<{
  id: StackId;
  centre: Point;
  size: number;
  tilt: number;
}>;
export type SceneLayout = Readonly<{
  revision: number;
  width: number;
  height: number;
  targets: readonly TargetLayout[];
}>;

export function sameLayout(
  a: SceneLayout | undefined,
  b: SceneLayout | undefined,
): boolean {
  if (!a || !b) return a === b;
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.targets.length === b.targets.length &&
    a.targets.every((target, index) => {
      const other = b.targets[index];
      return (
        target.id === other.id &&
        target.size === other.size &&
        target.tilt === other.tilt &&
        Math.abs(target.centre.x - other.centre.x) < 0.01 &&
        Math.abs(target.centre.y - other.centre.y) < 0.01
      );
    })
  );
}

export function heroPoint(
  ndc: Point,
  canvas: { x: number; y: number; width: number; height: number },
  hero: Point,
): Point {
  return {
    x: canvas.x - hero.x + ((ndc.x + 1) * canvas.width) / 2,
    y: canvas.y - hero.y + ((1 - ndc.y) * canvas.height) / 2,
  };
}
