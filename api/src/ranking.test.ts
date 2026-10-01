import assert from "node:assert/strict";
import { test } from "node:test";
import { rankStandings } from "./ranking.ts";

test("ties share a rank and the next place skips", () => {
  const ranked = rankStandings([
    { userId: "c", name: "Sol", score: 10 },
    { userId: "a", name: "Kai", score: 30 },
    { userId: "b", name: "Remi", score: 30 },
  ]);
  assert.deepEqual(
    ranked.map((row) => ({ name: row.name, rank: row.rank, score: row.score })),
    [
      { name: "Kai", rank: 1, score: 30 },
      { name: "Remi", rank: 1, score: 30 },
      { name: "Sol", rank: 3, score: 10 },
    ],
  );
});

test("empty board stays empty", () => {
  assert.deepEqual(rankStandings([]), []);
});
