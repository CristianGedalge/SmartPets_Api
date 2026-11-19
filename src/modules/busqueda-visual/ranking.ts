export function similarityScore(
  queries: number[][],
  photos: number[][],
): number {
  return (
    queries.reduce(
      (sum, query) =>
        sum +
        Math.max(
          ...photos.map((photo) =>
            Math.max(
              -1,
              Math.min(
                1,
                query.reduce(
                  (dot, value, index) => dot + value * photo[index],
                  0,
                ),
              ),
            ),
          ),
        ),
      0,
    ) / queries.length
  );
}

export function hasSufficientSimilarity(
  score: number,
  minimum: number,
): boolean {
  return Number.isFinite(score) && score >= minimum;
}
