export type StackId =
  'typescript' | 'python' | 'astro' | 'gcp' | 'react' | 'fastapi' | 'github';

export type GeometryKind =
  'tile' | 'paired' | 'star' | 'cloud' | 'atom' | 'bolt' | 'gem';
export type StackItem = Readonly<{
  id: StackId;
  label: string;
  colour: `#${string}`;
  geometry: GeometryKind;
  desktopAnchor: Readonly<{ x: number; y: number }>;
  mobileAnchor: Readonly<{ column: number; row: number }>;
  fallbackAsset: `/art/portfolio/stack/${string}.svg`;
}>;

export const stackItems = [
  {
    id: 'typescript',
    label: 'TypeScript',
    colour: '#aac9dc',
    geometry: 'tile',
    desktopAnchor: { x: 0.09, y: 0.16 },
    mobileAnchor: { column: 1, row: 1 },
    fallbackAsset: '/art/portfolio/stack/typescript.svg',
  },
  {
    id: 'python',
    label: 'Python',
    colour: '#eed785',
    geometry: 'paired',
    desktopAnchor: { x: 0.09, y: 0.4 },
    mobileAnchor: { column: 2, row: 1 },
    fallbackAsset: '/art/portfolio/stack/python.svg',
  },
  {
    id: 'astro',
    label: 'Astro',
    colour: '#e7aa93',
    geometry: 'star',
    desktopAnchor: { x: 0.09, y: 0.64 },
    mobileAnchor: { column: 3, row: 1 },
    fallbackAsset: '/art/portfolio/stack/astro.svg',
  },
  {
    id: 'gcp',
    label: 'GCP',
    colour: '#c8d4b0',
    geometry: 'cloud',
    desktopAnchor: { x: 0.09, y: 0.88 },
    mobileAnchor: { column: 4, row: 1 },
    fallbackAsset: '/art/portfolio/stack/gcp.svg',
  },
  {
    id: 'react',
    label: 'React',
    colour: '#a196d2',
    geometry: 'atom',
    desktopAnchor: { x: 0.91, y: 0.21 },
    mobileAnchor: { column: 1, row: 2 },
    fallbackAsset: '/art/portfolio/stack/react.svg',
  },
  {
    id: 'fastapi',
    label: 'FastAPI',
    colour: '#9abfb1',
    geometry: 'bolt',
    desktopAnchor: { x: 0.91, y: 0.5 },
    mobileAnchor: { column: 2, row: 2 },
    fallbackAsset: '/art/portfolio/stack/fastapi.svg',
  },
  {
    id: 'github',
    label: 'GitHub',
    colour: '#b6b3c5',
    geometry: 'gem',
    desktopAnchor: { x: 0.91, y: 0.79 },
    mobileAnchor: { column: 3, row: 2 },
    fallbackAsset: '/art/portfolio/stack/github.svg',
  },
] as const satisfies readonly StackItem[];

export type Point = Readonly<{ x: number; y: number }>;
export type TargetLayout = Readonly<{
  id: StackId;
  centre: Point;
  size: number;
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
