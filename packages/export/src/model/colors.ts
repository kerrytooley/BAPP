/**
 * A fixed, high-contrast palette assigned to observations in deterministic
 * order. Distinct hues so stacked flight paths and the legend stay readable over
 * map/photo imagery. Wraps if there are more observations than colors.
 */
export const FIGURE_PALETTE: readonly string[] = [
  '#e6194B',
  '#3cb44b',
  '#4363d8',
  '#f58231',
  '#911eb4',
  '#42d4f4',
  '#f032e6',
  '#bfef45',
  '#fabed4',
  '#469990',
  '#9A6324',
  '#800000',
];

export function colorForIndex(index: number): string {
  return FIGURE_PALETTE[index % FIGURE_PALETTE.length];
}
