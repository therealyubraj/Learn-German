import { QuizItem, WordList } from "./types";
import { computeChecksum } from "./hash";

/**
 * Creates a unique and stable identifier for a word object.
 * This is used for tracking statistics and for generating checksums.
 * @param word The word object.
 * @returns A string in the format "LHS|RHS".
 */
export function getWordIdentifier(word: QuizItem): string {
  return `${word.LHS}|${word.RHS}`;
}

/**
 * Calculates a SHA-256 checksum for a given word list.
 * It sorts the words by their identifier and joins them before hashing.
 * This ensures that two lists with the same words have the same checksum,
 * regardless of the original word order.
 *
 * @param wordList The WordList object to process.
 * @returns A promise that resolves to the SHA-256 checksum string.
 */
export async function getWordListChecksum(
  wordList: WordList | { words: WordList }
): Promise<string> {
  const words = Array.isArray(wordList) ? wordList : wordList.words;
  const wordIdentifiers = words
    .map(getWordIdentifier)
    .sort((a, b) => a.localeCompare(b));
  const concatenatedWords = wordIdentifiers.join("|");

  return computeChecksum(concatenatedWords);
}
