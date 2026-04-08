import { computeChecksum } from "./hash";
import { StoredWordList, WordList } from "./types";
import { sortWordListInPlace } from "./utils";

const germanBasics: WordList = [
  { LHS: "to drink", RHS: "trinken" },
  { LHS: "to read", RHS: "lesen" },
  { LHS: "to write", RHS: "schreiben" },
  { LHS: "to go", RHS: "gehen" },
  { LHS: "to come", RHS: "kommen" },
  { LHS: "to eat", RHS: "essen" },
  { LHS: "to sleep", RHS: "schlafen" },
  { LHS: "to learn", RHS: "lernen" },
  { LHS: "to say", RHS: "sagen" },
  { LHS: "to hear", RHS: "hören" },
  { LHS: "to see", RHS: "sehen" },
  { LHS: "to do", RHS: "machen" },
];

export async function getBuiltInWordLists(): Promise<Array<StoredWordList>> {
  const sortedList = [...germanBasics];
  sortWordListInPlace(sortedList);

  return [
    {
      list: sortedList,
      metadata: {
        name: "German Basics",
        checksum: await computeChecksum(JSON.stringify(sortedList)),
      },
    },
  ];
}
