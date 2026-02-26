export const MIN_PUBLIC_SAMPLE_SIZE = 5;

export function hasSufficientSampleSize(count: number | null | undefined): boolean {
  return (count ?? 0) >= MIN_PUBLIC_SAMPLE_SIZE;
}

