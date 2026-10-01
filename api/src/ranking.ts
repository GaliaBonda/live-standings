export type EntryScore = {
  userId: string;
  name: string;
  score: number;
};

export type RankedEntry = EntryScore & { rank: number };

/** Competition ranking: ties share a rank, the next rank skips (1, 1, 3). */
export function rankStandings(entries: EntryScore[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });
  let lastScore: number | null = null;
  let lastRank = 0;
  return sorted.map((entry, index) => {
    const rank = entry.score === lastScore ? lastRank : index + 1;
    lastScore = entry.score;
    lastRank = rank;
    return { ...entry, rank };
  });
}
