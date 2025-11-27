import type { Word } from "./types";

/**
 * Creates a stable string representation of a word list for hashing.
 * It sorts the words by LHS then RHS and joins them with a pipe character.
 */
export function createStableWordId(words: Word[]): string {
  // Sort the words array based on LHS then RHS alphabetically
  const sortedWords = [...words].sort((a, b) => {
    if (a.LHS < b.LHS) return -1;
    if (a.LHS > b.LHS) return 1;
    if (a.RHS < b.RHS) return -1;
    if (a.RHS > b.RHS) return 1;
    return 0;
  });

  // Concatenate all LHS and RHS values
  return sortedWords.map((word) => `${word.LHS}|${word.RHS}`).join("|");
}
