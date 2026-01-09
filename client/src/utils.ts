import { QuizItem, WordList } from "./types";

export function sortWordListInPlace(arr: WordList) {
  return arr.sort((a, b) =>
    a.LHS + "," + a.RHS > b.LHS + "," + b.RHS ? 1 : -1
  );
}

export function getQuizItemKey(item: QuizItem) {
  return `${item.LHS}-${item.RHS}`;
}
