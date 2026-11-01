export type LetterEffect =
  'stretch' | 'ink-offset' | 'outline' | 'colour-burst';
export const letterEffects: ReadonlyArray<{
  index: number;
  effect: LetterEffect;
}> = [
  { index: 0, effect: 'stretch' },
  { index: 2, effect: 'ink-offset' },
  { index: 4, effect: 'outline' },
  { index: 6, effect: 'stretch' },
  { index: 8, effect: 'colour-burst' },
  { index: 10, effect: 'ink-offset' },
];
export function letterFrames(effect: LetterEffect): Keyframe[] {
  const rest = { transform: 'translate(0, 0) scale(1)', opacity: 0 };
  const pose: Record<LetterEffect, Keyframe> = {
    stretch: {
      transform: 'translate(0, -5%) scale(1.06, 1.16)',
      opacity: 0.85,
    },
    'ink-offset': {
      transform: 'translate(0.055em, -0.035em) scale(1)',
      opacity: 0.7,
    },
    outline: { transform: 'translate(0, -0.02em) scale(1.06)', opacity: 1 },
    'colour-burst': {
      transform: 'translate(0, -0.045em) scale(1.12)',
      opacity: 0.9,
    },
  };
  return [
    rest,
    { ...pose[effect], offset: 0.35 },
    { ...pose[effect], offset: 0.6 },
    rest,
  ];
}
