import type { WordList } from "../types";

export abstract class IStorageProvider {
  abstract addNewList(list: WordList): Promise<void>;
  abstract getAllListChecksums(): Promise<Array<string>>;
  abstract getAllLists(): Promise<Array<WordList>>;
  abstract getListById(id: string): Promise<WordList | null>;
  abstract readFile(path: string): Promise<string | null>;
  abstract writeFile(path: string, content: string): Promise<void>;
}
