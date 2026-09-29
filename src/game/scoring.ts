// progress: 0 = question just appeared at the top, 1 = it reached the hero.
export function pointsFor(progress: number): number {
  if (progress < 1 / 3) return 3;
  if (progress < 2 / 3) return 2;
  return 1;
}
