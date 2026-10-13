// Color palette for found words
const FOUND_COLORS = [
  '#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336',
  '#00BCD4', '#E91E63', '#8BC34A', '#FF5722', '#3F51B5',
  '#009688', '#FFC107',
];

export function getFoundColor(index: number): string {
  return FOUND_COLORS[index % FOUND_COLORS.length];
}
